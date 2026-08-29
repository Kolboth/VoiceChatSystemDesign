import type {
  UserProfile, Community, Room, VoiceParticipant,
  DirectConversation, DirectMessage, FriendEntry,
  AppNotification, Role
} from "../types";

export const MOCK_USERS: UserProfile[] = [];

export const MOCK_COMMUNITIES: Community[] = [
  { id: "c1", name: "Product Guild", ownerId: "u1", iconInitials: "PG", iconColor: "#6366f1", description: "Design and product community" },
  { id: "c2", name: "Night Shift", ownerId: "u2", iconInitials: "NS", iconColor: "#14b8a6", description: "Late night gaming crew" },
  { id: "c3", name: "Studio", ownerId: "u3", iconInitials: "ST", iconColor: "#f59e0b", description: "Creative space" },
];

export const MOCK_ROOMS: Room[] = [
  // Product Guild
  { id: "r1", communityId: "c1", name: "Lobby", kind: "voice", privacy: "public", category: "Voice Channels" },
  { id: "r2", communityId: "c1", name: "Design Lounge", kind: "voice", privacy: "public", topic: "UI/UX discussions", category: "Voice Channels" },
  { id: "r3", communityId: "c1", name: "Engineering", kind: "voice", privacy: "community", category: "Voice Channels" },
  { id: "r4", communityId: "c1", name: "Quiet Focus", kind: "voice", privacy: "public", topic: "Low talk room", category: "Voice Channels" },
  { id: "r5", communityId: "c1", name: "AFK", kind: "voice", privacy: "public", category: "Voice Channels" },
  { id: "r6", communityId: "c1", name: "general", kind: "text", privacy: "public", category: "Text Channels" },
  { id: "r7", communityId: "c1", name: "resources", kind: "text", privacy: "public", category: "Text Channels" },
  // Night Shift
  { id: "r8", communityId: "c2", name: "General", kind: "voice", privacy: "public", category: "Voice Channels" },
  { id: "r9", communityId: "c2", name: "Ranked", kind: "voice", privacy: "public", category: "Voice Channels" },
  { id: "r10", communityId: "c2", name: "Strategy", kind: "voice", privacy: "invite", category: "Voice Channels" },
  { id: "r11", communityId: "c2", name: "Chill", kind: "voice", privacy: "public", category: "Voice Channels" },
  // Studio
  { id: "r12", communityId: "c3", name: "Main Room", kind: "voice", privacy: "public", category: "Voice Channels" },
  { id: "r13", communityId: "c3", name: "Mixing", kind: "voice", privacy: "community", category: "Voice Channels" },
  { id: "r14", communityId: "c3", name: "notes", kind: "text", privacy: "public", category: "Text Channels" },
];

export const LOCAL_USER_ID = "u_local";

export const LOCAL_USER: UserProfile = {
  id: LOCAL_USER_ID,
  username: "you",
  displayName: "You",
  presence: "online",
  createdAt: new Date().toISOString(),
  audioSetupComplete: false,
};

export function makeVoiceParticipants(roomId: string, userIds: string[], localUserId: string): VoiceParticipant[] {
  return userIds.map((uid, i) => ({
    userId: uid,
    roomId,
    isLocal: uid === localUserId,
    isSpeaking: i === 0,
    isMuted: i === 2,
    isDeafened: false,
    isServerMuted: false,
    hasRaisedHand: false,
    isModerator: i === 0,
    isOwner: i === 0,
    connectionQuality: i < 3 ? "excellent" : "good",
    volume: 100,
    isAFK: false,
    screenShareActive: false,
  }));
}

export const ROOM_OCCUPANCY: Record<string, string[]> = {};

export const MOCK_FRIENDS: FriendEntry[] = [];

export const MOCK_CONVERSATIONS: DirectConversation[] = [];

export const MOCK_MESSAGES: Record<string, DirectMessage[]> = {};

export const MOCK_NOTIFICATIONS: AppNotification[] = [];

export const MOCK_ROLES: Role[] = [
  { id: "role1", communityId: "c1", name: "Owner", priority: 100, color: "#6366f1", permissions: { manageRoles: "allow", manageRooms: "allow", speak: "allow", connect: "allow" } },
  { id: "role2", communityId: "c1", name: "Moderator", priority: 50, color: "#14b8a6", permissions: { muteMembers: "allow", moveMembers: "allow", speak: "allow", connect: "allow" } },
  { id: "role3", communityId: "c1", name: "Member", priority: 10, permissions: { speak: "allow", connect: "allow", sendMessages: "allow" } },
  { id: "role4", communityId: "c1", name: "Guest", priority: 1, permissions: { connect: "allow" } },
];

export const MOCK_TEXT_MESSAGES: Array<{ id: string; roomId: string; userId: string; content: string; createdAt: string; type: "message" | "system" }> = [];

export function getUserById(id: string): UserProfile | undefined {
  if (id === LOCAL_USER_ID) return LOCAL_USER;
  return MOCK_USERS.find(u => u.id === id);
}

export function getCommunityById(id: string): Community | undefined {
  return MOCK_COMMUNITIES.find(c => c.id === id);
}

export function getRoomById(id: string): Room | undefined {
  return MOCK_ROOMS.find(r => r.id === id);
}

export function getRoomsByCommunity(communityId: string): Room[] {
  return MOCK_ROOMS.filter(r => r.communityId === communityId);
}
