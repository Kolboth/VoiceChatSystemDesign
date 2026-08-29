import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Community, CommunityMember, Room, RoomPrivacy, UserProfile } from "../../types";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../auth/auth-context";

type CreateRoomInput = {
  communityId: string;
  name: string;
  topic?: string;
  privacy?: RoomPrivacy;
  participantLimit?: number;
  category?: string;
  friendIds?: string[];
};

type CommunityState = {
  communities: Community[];
  rooms: Room[];
  members: CommunityMember[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  getCommunityById: (id?: string) => Community | undefined;
  getRoomsByCommunity: (communityId?: string) => Room[];
  getRoomById: (id?: string) => Room | undefined;
  getRoomMembers: (roomId?: string) => UserProfile[];
  getProfileById: (userId?: string) => UserProfile | undefined;
  createCommunity: (name: string, description?: string) => Promise<string>;
  createVoiceRoom: (input: CreateRoomInput) => Promise<string>;
  inviteFriendsToRoom: (roomId: string, friendIds: string[]) => Promise<number>;
};

const CommunityContext = createContext<CommunityState | null>(null);

type RawCommunity = {
  id: string;
  name: string;
  description?: string | null;
  owner_id: string;
  icon_url?: string | null;
  icon_color?: string | null;
  created_at?: string | null;
};

type RawRoom = {
  id: string;
  community_id: string;
  created_by: string;
  name: string;
  topic?: string | null;
  kind: Room["kind"];
  privacy: Room["privacy"];
  participant_limit?: number | null;
  category?: string | null;
  sort_order?: number | null;
  created_at?: string | null;
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

type RawCommunityMember = {
  community_id: string;
  user_id: string;
  role: CommunityMember["role"];
  joined_at: string;
  profile?: RawProfile | null;
};

type RawRoomMember = {
  room_id: string;
  user_id: string;
  profile?: RawProfile | null;
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join("") || "R";
}

function toCommunity(row: RawCommunity): Community {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    ownerId: row.owner_id,
    iconUrl: row.icon_url ?? undefined,
    iconColor: row.icon_color ?? "#6366f1",
    iconInitials: initials(row.name),
    createdAt: row.created_at ?? undefined,
  };
}

function toRoom(row: RawRoom): Room {
  return {
    id: row.id,
    communityId: row.community_id,
    createdBy: row.created_by,
    name: row.name,
    topic: row.topic ?? undefined,
    kind: row.kind,
    privacy: row.privacy,
    participantLimit: row.participant_limit ?? undefined,
    category: row.category ?? undefined,
    sortOrder: row.sort_order ?? 0,
    createdAt: row.created_at ?? undefined,
  };
}

function toProfile(row: RawProfile): UserProfile {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    bio: row.bio ?? undefined,
    avatarUrl: row.avatar_url ?? undefined,
    presence: (row.presence as UserProfile["presence"]) ?? "offline",
    audioSetupComplete: Boolean(row.audio_setup_complete),
    createdAt: row.created_at ?? "",
  };
}

export function CommunityProvider({ children }: { children: ReactNode }) {
  const { user, profile } = useAuth();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [members, setMembers] = useState<CommunityMember[]>([]);
  const [roomProfiles, setRoomProfiles] = useState<Record<string, UserProfile[]>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) {
      setCommunities([]);
      setRooms([]);
      setMembers([]);
      setRoomProfiles({});
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { data: communityRows, error: communityError } = await supabase
        .from("communities")
        .select("id, name, description, owner_id, icon_url, icon_color, created_at")
        .order("created_at", { ascending: true });
      if (communityError) throw communityError;

      const nextCommunities = ((communityRows ?? []) as RawCommunity[]).map(toCommunity);
      const communityIds = nextCommunities.map(c => c.id);
      setCommunities(nextCommunities);

      if (communityIds.length === 0) {
        setRooms([]);
        setMembers([]);
        setRoomProfiles({});
        return;
      }

      const [roomResult, memberResult] = await Promise.all([
        supabase
          .from("rooms")
          .select("id, community_id, created_by, name, topic, kind, privacy, participant_limit, category, sort_order, created_at")
          .in("community_id", communityIds)
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: true }),
        supabase
          .from("community_members")
          .select(`
            community_id, user_id, role, joined_at,
            profile:profiles!community_members_user_id_fkey(
              id, username, display_name, bio, avatar_url, presence, audio_setup_complete, created_at
            )
          `)
          .in("community_id", communityIds),
      ]);

      if (roomResult.error) throw roomResult.error;
      if (memberResult.error) throw memberResult.error;

      const nextRooms = ((roomResult.data ?? []) as RawRoom[]).map(toRoom);
      setRooms(nextRooms);
      setMembers(((memberResult.data ?? []) as unknown as RawCommunityMember[]).map(row => ({
        communityId: row.community_id,
        userId: row.user_id,
        role: row.role,
        joinedAt: row.joined_at,
        profile: row.profile ? toProfile(row.profile) : undefined,
      })));

      const roomIds = nextRooms.map(r => r.id);
      if (roomIds.length === 0) {
        setRoomProfiles({});
        return;
      }

      const { data: roomMemberRows, error: roomMemberError } = await supabase
        .from("room_members")
        .select(`
          room_id, user_id,
          profile:profiles!room_members_user_id_fkey(
            id, username, display_name, bio, avatar_url, presence, audio_setup_complete, created_at
          )
        `)
        .in("room_id", roomIds);
      if (roomMemberError) throw roomMemberError;

      const grouped: Record<string, UserProfile[]> = {};
      for (const row of (roomMemberRows ?? []) as unknown as RawRoomMember[]) {
        if (!row.profile) continue;
        (grouped[row.room_id] ??= []).push(toProfile(row.profile));
      }
      setRoomProfiles(grouped);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to load communities";
      console.error("community refresh:", err);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`community-domain:${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "communities" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "community_members" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "rooms" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "room_members" }, refresh)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, refresh]);

  const profileIndex = useMemo(() => {
    const map = new Map<string, UserProfile>();
    if (profile) map.set(profile.id, profile);
    members.forEach(member => {
      if (member.profile) map.set(member.profile.id, member.profile);
    });
    Object.values(roomProfiles).flat().forEach(p => map.set(p.id, p));
    return map;
  }, [members, roomProfiles, profile]);

  const getCommunityById = useCallback((id?: string) => communities.find(c => c.id === id), [communities]);
  const getRoomsByCommunity = useCallback((communityId?: string) => rooms.filter(r => r.communityId === communityId), [rooms]);
  const getRoomById = useCallback((id?: string) => rooms.find(r => r.id === id), [rooms]);
  const getRoomMembers = useCallback((roomId?: string) => roomId ? (roomProfiles[roomId] ?? []) : [], [roomProfiles]);
  const getProfileById = useCallback((userId?: string) => userId ? profileIndex.get(userId) : undefined, [profileIndex]);

  const createCommunity = useCallback(async (name: string, description?: string) => {
    const { data, error: rpcError } = await supabase.rpc("create_community", {
      p_name: name,
      p_description: description?.trim() || null,
    });
    if (rpcError) throw rpcError;
    await refresh();
    return data as string;
  }, [refresh]);

  const createVoiceRoom = useCallback(async (input: CreateRoomInput) => {
    const { data, error: rpcError } = await supabase.rpc("create_voice_room", {
      p_community_id: input.communityId,
      p_name: input.name,
      p_topic: input.topic?.trim() || null,
      p_privacy: input.privacy ?? "community",
      p_participant_limit: input.participantLimit ?? null,
      p_category: input.category?.trim() || "Voice rooms",
      p_friend_ids: input.friendIds ?? [],
    });
    if (rpcError) throw rpcError;
    await refresh();
    return data as string;
  }, [refresh]);

  const inviteFriendsToRoom = useCallback(async (roomId: string, friendIds: string[]) => {
    if (friendIds.length === 0) return 0;
    const { data, error: rpcError } = await supabase.rpc("invite_friends_to_room", {
      p_room_id: roomId,
      p_friend_ids: friendIds,
    });
    if (rpcError) throw rpcError;
    await refresh();
    return Number(data ?? 0);
  }, [refresh]);

  const value: CommunityState = {
    communities,
    rooms,
    members,
    loading,
    error,
    refresh,
    getCommunityById,
    getRoomsByCommunity,
    getRoomById,
    getRoomMembers,
    getProfileById,
    createCommunity,
    createVoiceRoom,
    inviteFriendsToRoom,
  };

  return <CommunityContext.Provider value={value}>{children}</CommunityContext.Provider>;
}

export function useCommunities(): CommunityState {
  const ctx = useContext(CommunityContext);
  if (!ctx) throw new Error("useCommunities must be used within CommunityProvider");
  return ctx;
}
