import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js@2";
import { AccessToken } from "npm:livekit-server-sdk@2.18.0";

const app = new Hono();

app.use("*", logger(console.log));
app.use(
  "/*",
  cors({
    origin: Deno.env.get("APP_ORIGIN") ?? "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

app.get("/make-server-3cb311ed/health", (c) => c.json({ status: "ok" }));

type TokenRequest =
  | { kind: "community"; roomId: string }
  | { kind: "direct"; callId: string };

function requiredEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

async function authenticatedUser(authorization: string | undefined) {
  if (!authorization?.startsWith("Bearer ")) return null;

  const supabaseUrl = requiredEnv("SUPABASE_URL");
  const anonKey = requiredEnv("SUPABASE_ANON_KEY");
  const client = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await client.auth.getUser();
  if (error) return null;
  return data.user;
}

app.post("/make-server-3cb311ed/voice/token", async (c) => {
  try {
    const authorization = c.req.header("Authorization");
    const user = await authenticatedUser(authorization);
    if (!user) return c.json({ error: "Authentication required" }, 401);

    const body = await c.req.json<TokenRequest>();
    if (!body || (body.kind !== "community" && body.kind !== "direct")) {
      return c.json({ error: "Invalid voice token request" }, 400);
    }

    const supabaseUrl = requiredEnv("SUPABASE_URL");
    const serviceRoleKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
    const service = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: profile, error: profileError } = await service
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) return c.json({ error: "Profile not found" }, 403);

    let roomName: string;

    if (body.kind === "community") {
      if (!body.roomId) return c.json({ error: "roomId is required" }, 400);

      const { data: room, error: roomError } = await service
        .from("rooms")
        .select("id, community_id, created_by, privacy, kind")
        .eq("id", body.roomId)
        .single();

      if (roomError || !room || room.kind !== "voice") {
        return c.json({ error: "Voice room not found" }, 404);
      }

      const [{ data: communityMember }, { data: roomMember }] = await Promise.all([
        service
          .from("community_members")
          .select("user_id")
          .eq("community_id", room.community_id)
          .eq("user_id", user.id)
          .maybeSingle(),
        service
          .from("room_members")
          .select("user_id")
          .eq("room_id", room.id)
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);

      const canJoinCommunity = Boolean(communityMember);
      const canJoinInviteOnly = Boolean(roomMember) || room.created_by === user.id;
      if (!canJoinCommunity || (room.privacy === "invite" && !canJoinInviteOnly)) {
        return c.json({ error: "You do not have access to this voice room" }, 403);
      }

      roomName = `community-${room.id}`;
    } else {
      if (!body.callId) return c.json({ error: "callId is required" }, 400);

      const { data: call, error: callError } = await service
        .from("call_sessions")
        .select("id, caller_id, callee_id, room_name, status")
        .eq("id", body.callId)
        .single();

      if (callError || !call) return c.json({ error: "Call not found" }, 404);
      if (call.caller_id !== user.id && call.callee_id !== user.id) {
        return c.json({ error: "You are not a participant in this call" }, 403);
      }
      if (!['accepted', 'connected'].includes(call.status)) {
        return c.json({ error: "Call has not been accepted" }, 409);
      }

      roomName = call.room_name;
    }

    const livekitUrl = requiredEnv("LIVEKIT_URL");
    const apiKey = requiredEnv("LIVEKIT_API_KEY");
    const apiSecret = requiredEnv("LIVEKIT_API_SECRET");

    const token = new AccessToken(apiKey, apiSecret, {
      identity: user.id,
      name: profile.display_name,
      metadata: JSON.stringify({
        username: profile.username,
        avatarUrl: profile.avatar_url,
      }),
      ttl: "15m",
    });
    token.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    return c.json({
      token: await token.toJwt(),
      serverUrl: livekitUrl,
      roomName,
    });
  } catch (error) {
    console.error("voice token error", error);
    const message = error instanceof Error ? error.message : "Unable to create voice token";
    return c.json({ error: message }, 500);
  }
});

Deno.serve(app.fetch);
