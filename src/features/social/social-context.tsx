import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import type { FriendEntry, UserProfile } from "../../types";
import { useAuth } from "../auth/auth-context";
import { supabase } from "../../lib/supabase";

interface SocialState {
  friends: FriendEntry[];
  loading: boolean;
  searchUsers: (query: string) => Promise<UserProfile[]>;
  sendFriendRequest: (userId: string) => Promise<void>;
  acceptFriendRequest: (requestId: string) => Promise<void>;
  declineFriendRequest: (requestId: string) => Promise<void>;
  cancelFriendRequest: (requestId: string) => Promise<void>;
  removeFriend: (userId: string) => Promise<void>;
  blockUser: (userId: string) => Promise<void>;
  unblockUser: (userId: string) => Promise<void>;
  getOrCreateConversation: (friendId: string) => Promise<string>;
  refresh: () => Promise<void>;
}

const SocialContext = createContext<SocialState | null>(null);

type RawRequest = {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: string;
  sender?: RawProfile | null;
  receiver?: RawProfile | null;
};

type RawProfile = {
  id: string;
  username: string;
  display_name: string;
  bio?: string | null;
  avatar_url?: string | null;
  presence?: string | null;
  audio_setup_complete?: boolean | null;
  created_at?: string | null;
};

function toProfile(r: RawProfile): UserProfile {
  return {
    id: r.id,
    username: r.username,
    displayName: r.display_name,
    bio: r.bio ?? undefined,
    avatarUrl: r.avatar_url ?? undefined,
    presence: (r.presence as UserProfile["presence"]) ?? "offline",
    audioSetupComplete: Boolean(r.audio_setup_complete),
    createdAt: r.created_at ?? "",
  };
}

export function SocialProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [friends, setFriends] = useState<FriendEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) { setFriends([]); return; }
    setLoading(true);
    try {
      // Fetch all friend requests where the current user is sender or receiver
      const { data, error } = await supabase
        .from("friend_requests")
        .select(`
          id, sender_id, receiver_id, status,
          sender:profiles!friend_requests_sender_id_fkey(id, username, display_name, bio, avatar_url, presence, audio_setup_complete, created_at),
          receiver:profiles!friend_requests_receiver_id_fkey(id, username, display_name, bio, avatar_url, presence, audio_setup_complete, created_at)
        `)
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .in("status", ["pending", "accepted", "blocked"]);

      if (error) { console.error("social refresh:", error); return; }

      const entries: FriendEntry[] = ((data ?? []) as unknown as RawRequest[]).map((row) => {
        const isSender = row.sender_id === user.id;
        const otherRaw = isSender ? row.receiver : row.sender;
        const profile = toProfile(otherRaw!);

        let relation: FriendEntry["relation"];
        if (row.status === "accepted") relation = "friends";
        else if (row.status === "pending" && isSender) relation = "outgoing-request";
        else if (row.status === "pending" && !isSender) relation = "incoming-request";
        else relation = "blocked";

        return { profile, relation, requestId: row.id };
      });

      setFriends(entries);
    } catch (e) {
      console.error("social refresh exception:", e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`social:${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "friend_requests" }, refresh)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, refresh]);

  const searchUsers = useCallback(async (query: string): Promise<UserProfile[]> => {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const { data, error } = await supabase
      .from("profiles")
      .select("id, username, display_name, bio, avatar_url, presence, audio_setup_complete, created_at")
      .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
      .neq("id", user?.id ?? "")
      .limit(20);

    if (error) throw error;
    return (data ?? []).map(toProfile);
  }, [user]);

  const sendFriendRequest = useCallback(async (receiverId: string) => {
    const { error } = await supabase
      .from("friend_requests")
      .insert({ sender_id: user!.id, receiver_id: receiverId, status: "pending" });
    if (error) throw error;
    await refresh();
  }, [user, refresh]);

  const acceptFriendRequest = useCallback(async (requestId: string) => {
    const { error } = await supabase
      .from("friend_requests")
      .update({ status: "accepted" })
      .eq("id", requestId);
    if (error) throw error;
    await refresh();
  }, [refresh]);

  const declineFriendRequest = useCallback(async (requestId: string) => {
    const { error } = await supabase
      .from("friend_requests")
      .update({ status: "declined" })
      .eq("id", requestId);
    if (error) throw error;
    await refresh();
  }, [refresh]);

  const cancelFriendRequest = useCallback(async (requestId: string) => {
    const { error } = await supabase
      .from("friend_requests")
      .delete()
      .eq("id", requestId);
    if (error) throw error;
    await refresh();
  }, [refresh]);

  const removeFriend = useCallback(async (otherUserId: string) => {
    // Delete all request rows between the two users
    const { error } = await supabase
      .from("friend_requests")
      .delete()
      .or(
        `and(sender_id.eq.${user!.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user!.id})`
      );
    if (error) throw error;
    await refresh();
  }, [user, refresh]);

  const blockUser = useCallback(async (otherUserId: string) => {
    // Remove any existing request first, then insert a block
    await supabase
      .from("friend_requests")
      .delete()
      .or(
        `and(sender_id.eq.${user!.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user!.id})`
      );
    const { error } = await supabase
      .from("friend_requests")
      .insert({ sender_id: user!.id, receiver_id: otherUserId, status: "blocked" });
    if (error) throw error;
    await refresh();
  }, [user, refresh]);

  const unblockUser = useCallback(async (otherUserId: string) => {
    const { error } = await supabase
      .from("friend_requests")
      .delete()
      .eq("sender_id", user!.id)
      .eq("receiver_id", otherUserId)
      .eq("status", "blocked");
    if (error) throw error;
    await refresh();
  }, [user, refresh]);

  const getOrCreateConversation = useCallback(async (friendId: string): Promise<string> => {
    if (!user) throw new Error("Authentication required");
    const { data, error } = await supabase.rpc("create_direct_conversation", {
      p_other_user_id: friendId,
    });
    if (error) throw error;
    return data as string;
  }, [user]);

  return (
    <SocialContext.Provider value={{
      friends,
      loading,
      searchUsers,
      sendFriendRequest,
      acceptFriendRequest,
      declineFriendRequest,
      cancelFriendRequest,
      removeFriend,
      blockUser,
      unblockUser,
      getOrCreateConversation,
      refresh,
    }}>
      {children}
    </SocialContext.Provider>
  );
}

export function useSocial(): SocialState {
  const ctx = useContext(SocialContext);
  if (!ctx) throw new Error("useSocial must be used within SocialProvider");
  return ctx;
}
