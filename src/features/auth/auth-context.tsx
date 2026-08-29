import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { AuthController, AuthUser, UserProfile } from "../../types";
import { supabase } from "../../lib/supabase";

const AuthContext = createContext<AuthController | null>(null);

function toProfile(raw: Record<string, unknown>): UserProfile {
  return {
    id: raw.id as string,
    username: raw.username as string,
    displayName: raw.display_name as string,
    bio: (raw.bio as string | null) ?? undefined,
    avatarUrl: (raw.avatar_url as string | null) ?? undefined,
    presence: (raw.presence as UserProfile["presence"]) ?? "online",
    audioSetupComplete: Boolean(raw.audio_setup_complete),
    createdAt: raw.created_at as string,
  };
}

async function fetchProfile(userId: string): Promise<UserProfile | null> {
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  return data ? toProfile(data as Record<string, unknown>) : null;
}

// Creates a profile from Supabase auth user metadata (set during signUp)
async function ensureProfile(userId: string): Promise<UserProfile | null> {
  const existing = await fetchProfile(userId);
  if (existing) return existing;

  // Pull username + displayName from auth user metadata
  const { data: { user } } = await supabase.auth.getUser();
  const meta = user?.user_metadata ?? {};
  const username = (meta.username as string | undefined)?.toLowerCase().trim();
  const displayName = meta.display_name as string | undefined;
  if (!username || !displayName) return null;

  const { data, error } = await supabase.from("profiles").insert({
    id: userId,
    username,
    display_name: displayName,
    presence: "online",
    audio_setup_complete: false,
  }).select().maybeSingle();

  if (error) {
    // 23505 = unique_violation: a concurrent call already inserted the row
    if ((error as { code?: string }).code === "23505") {
      return fetchProfile(userId);
    }
    console.error("ensureProfile insert failed:", error);
    return null;
  }
  return data ? toProfile(data as Record<string, unknown>) : null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [status, setStatus] = useState<AuthController["status"]>("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // onAuthStateChange is the single source of truth for auth state.
    // It fires immediately with INITIAL_SESSION on mount (covering page refreshes),
    // and again on every sign-in / sign-out / token refresh.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setUser({ id: session.user.id, email: session.user.email! });
        const p = await ensureProfile(session.user.id);
        if (p) {
          setProfile(p);
          setStatus("authenticated");
        } else {
          // Session valid but profile missing/unrecoverable — sign out cleanly
          // so the user can try again rather than getting stuck in a loading loop.
          setError("Account setup incomplete. Please sign up again.");
          await supabase.auth.signOut();
          setUser(null);
          setProfile(null);
          setStatus("unauthenticated");
        }
      } else {
        setUser(null);
        setProfile(null);
        setStatus("unauthenticated");
      }
    });

    // Fallback: if onAuthStateChange never fires (no stored session and no network),
    // ensure we don't stay in "loading" forever.
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) setStatus(s => s === "loading" ? "unauthenticated" : s);
    });

    return () => subscription.unsubscribe();
  }, []);

  const ctrl: AuthController = {
    user,
    profile,
    status,
    error,

    async signUp({ email, password, displayName, username }) {
      setError(null);
      const usernameLower = username.toLowerCase().trim();

      // Guard: username must be unique
      const { data: taken, error: searchErr } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", usernameLower)
        .maybeSingle();
      if (searchErr && (searchErr as { code?: string }).code !== "42P01") {
        // Ignore "table does not exist" errors here — let signUp proceed
        setError(searchErr.message);
        throw searchErr;
      }
      if (taken) {
        setError("Username is already taken.");
        throw new Error("taken");
      }

      // Store profile data in user_metadata so we can create the profile row
      // as soon as the user has an authenticated session (whether that's immediately
      // or after they confirm their email).
      const { data, error: authErr } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { username: usernameLower, display_name: displayName },
        },
      });

      if (authErr) {
        const msg = authErr.message ?? "";
        if (msg.toLowerCase().includes("rate limit") || msg.toLowerCase().includes("email rate")) {
          setError("Too many signup attempts. In Supabase → Authentication → Providers → Email, disable \"Confirm email\" to skip this limit.");
        } else if (msg.toLowerCase().includes("already registered")) {
          setError("An account with this email already exists. Try signing in.");
        } else {
          setError(msg || "Sign up failed. Please try again.");
        }
        throw authErr;
      }
      if (!data.user) {
        setError("Sign up failed. Please try again.");
        throw new Error("no_user");
      }

      if (!data.session) {
        // Email confirmation is required — tell the caller so the UI can show a message
        throw Object.assign(new Error("email_confirmation_required"), {
          code: "email_confirmation_required",
        });
      }
      // Session live: onAuthStateChange fires and handles profile creation + state updates
    },

    async signIn({ email, password }) {
      setError(null);
      const { error: err } = await supabase.auth.signInWithPassword({ email, password });
      if (err) {
        const msg = err.message ?? "";
        if (msg.toLowerCase().includes("not confirmed") || msg.toLowerCase().includes("email confirm")) {
          setError("Your email isn't confirmed yet. Check your inbox, or sign up again with a new email address.");
        } else if (msg.toLowerCase().includes("invalid") || msg.toLowerCase().includes("credentials")) {
          setError("Invalid email or password.");
        } else {
          setError(msg || "Sign in failed. Please try again.");
        }
        throw err;
      }
      // onAuthStateChange handles the rest
    },

    async signOut() {
      await supabase.auth.signOut();
    },

    async requestPasswordReset(email) {
      setError(null);
      const { error: err } = await supabase.auth.resetPasswordForEmail(email);
      if (err) {
        setError(err.message);
        throw err;
      }
    },

    async updatePassword(password) {
      setError(null);
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) {
        setError(err.message);
        throw err;
      }
    },

    async updateProfile(patch) {
      if (!user || !profile) throw new Error("unauthenticated");
      const dbPatch: Record<string, unknown> = {};
      if (patch.displayName !== undefined) dbPatch.display_name = patch.displayName;
      if (patch.bio !== undefined) dbPatch.bio = patch.bio;
      if (patch.presence !== undefined) dbPatch.presence = patch.presence;
      if (patch.audioSetupComplete !== undefined) dbPatch.audio_setup_complete = patch.audioSetupComplete;

      const { data, error: err } = await supabase
        .from("profiles")
        .update(dbPatch)
        .eq("id", user.id)
        .select()
        .single();
      if (err) throw err;
      setProfile(toProfile(data as Record<string, unknown>));
    },
  };

  return <AuthContext.Provider value={ctrl}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthController {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
