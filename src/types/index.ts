export const APP_NAME = "Resonance";

// ─── Auth ─────────────────────────────────────────────────────────────────────

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

export interface AuthUser {
  id: string;
  email: string;
}

export interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  presence: Presence;
  createdAt: string;
  audioSetupComplete: boolean;
}

export interface AuthController {
  user: AuthUser | null;
  profile: UserProfile | null;
  status: AuthStatus;
  signUp(input: { email: string; password: string; displayName: string; username: string }): Promise<void>;
  signIn(input: { email: string; password: string; rememberMe?: boolean }): Promise<void>;
  signOut(): Promise<void>;
  requestPasswordReset(email: string): Promise<void>;
  updatePassword(password: string): Promise<void>;
  updateProfile(patch: Partial<Pick<UserProfile, "displayName" | "bio" | "presence" | "audioSetupComplete">>): Promise<void>;
  error: string | null;
}

// ─── Presence ─────────────────────────────────────────────────────────────────

export type Presence = "online" | "away" | "dnd" | "offline";

export type VoiceActivity = "in-voice" | "speaking" | "muted" | "deafened" | "idle";

// ─── Social ───────────────────────────────────────────────────────────────────

export type FriendRelation = "none" | "outgoing-request" | "incoming-request" | "friends" | "blocked";

export interface FriendRequest {
  id: string;
  senderId: string;
  receiverId: string;
  status: "pending" | "accepted" | "declined" | "cancelled";
  createdAt: string;
}

export interface Friendship {
  id: string;
  userAId: string;
  userBId: string;
  createdAt: string;
}

export interface FriendEntry {
  profile: UserProfile;
  relation: FriendRelation;
  requestId?: string;
  conversationId?: string;
}

export interface SocialService {
  searchUsers(query: string): Promise<UserProfile[]>;
  sendFriendRequest(userId: string): Promise<void>;
  acceptFriendRequest(requestId: string): Promise<void>;
  declineFriendRequest(requestId: string): Promise<void>;
  cancelFriendRequest(requestId: string): Promise<void>;
  removeFriend(userId: string): Promise<void>;
  blockUser(userId: string): Promise<void>;
  unblockUser(userId: string): Promise<void>;
}

// ─── Messages ─────────────────────────────────────────────────────────────────

export interface DirectConversation {
  id: string;
  participantIds: string[];
  createdAt: string;
  lastMessageAt?: string;
  unreadCount: number;
}

export interface DirectMessage {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  createdAt: string;
  editedAt?: string;
  status: "sending" | "sent" | "failed";
}

export interface RoomMessage {
  id: string;
  roomId: string;
  senderId: string;
  body: string;
  createdAt: string;
  editedAt?: string;
  sender?: UserProfile;
}

export interface DirectMessageService {
  listConversations(): Promise<DirectConversation[]>;
  listMessages(conversationId: string): Promise<DirectMessage[]>;
  sendMessage(conversationId: string, body: string): Promise<DirectMessage>;
  editMessage(messageId: string, body: string): Promise<void>;
  deleteMessage(messageId: string): Promise<void>;
  getOrCreateConversation(friendId: string): Promise<DirectConversation>;
}

// ─── Calls ────────────────────────────────────────────────────────────────────

export type CallStatus = "ringing" | "accepted" | "connected" | "ended" | "declined" | "missed" | "cancelled" | "failed";
export type CallState =
  | "idle"
  | "outgoing-ringing"
  | "incoming-ringing"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "ended"
  | "declined"
  | "missed"
  | "cancelled"
  | "busy"
  | "failed";

export interface CallSession {
  id: string;
  initiatorId: string;
  participantIds: string[];
  type: "direct" | "group" | "community";
  status: CallStatus;
  startedAt: string;
  connectedAt?: string;
  endedAt?: string;
}

export interface DirectCallService {
  startCall(friendId: string): Promise<CallSession>;
  acceptCall(callId: string): Promise<void>;
  declineCall(callId: string): Promise<void>;
  endCall(callId: string): Promise<void>;
}

export interface VoiceTokenService {
  getCommunityRoomToken(roomId: string): Promise<{ token: string; serverUrl: string }>;
  getDirectCallToken(callId: string): Promise<{ token: string; serverUrl: string }>;
}

// ─── Communities ──────────────────────────────────────────────────────────────

export interface Community {
  id: string;
  name: string;
  description?: string;
  iconUrl?: string;
  iconColor?: string;
  iconInitials?: string;
  ownerId: string;
  createdAt?: string;
}

export type CommunityRole = "owner" | "admin" | "member";

export interface CommunityMember {
  communityId: string;
  userId: string;
  role: CommunityRole;
  joinedAt: string;
  profile?: UserProfile;
}

export type RoomKind = "voice" | "text" | "instant";
export type RoomPrivacy = "public" | "community" | "invite";

export interface Room {
  id: string;
  communityId: string;
  name: string;
  topic?: string;
  kind: RoomKind;
  privacy: RoomPrivacy;
  participantLimit?: number;
  category?: string;
  createdBy?: string;
  sortOrder?: number;
  createdAt?: string;
}

export type ConnectionQuality = "excellent" | "good" | "poor" | "unknown";

export interface VoiceParticipant {
  userId: string;
  roomId: string;
  displayName?: string;
  username?: string;
  avatarUrl?: string;
  audioLevel?: number;
  isLocal: boolean;
  isSpeaking: boolean;
  isMuted: boolean;
  isDeafened: boolean;
  isServerMuted: boolean;
  hasRaisedHand: boolean;
  isModerator: boolean;
  isOwner: boolean;
  connectionQuality: ConnectionQuality;
  volume: number;
  isAFK: boolean;
  screenShareActive: boolean;
}

export type VoiceConnectionState =
  | "idle"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "disconnecting"
  | "disconnected"
  | "failed"
  | "kicked"
  | "banned";

export type VoiceSessionKind = "community" | "direct";

export interface VoiceRoomController {
  state: VoiceConnectionState;
  sessionKind?: VoiceSessionKind;
  roomId?: string;
  communityId?: string;
  directCallId?: string;
  participants: VoiceParticipant[];
  localParticipant?: VoiceParticipant;
  microphoneDevices: MediaDeviceInfo[];
  outputDevices: MediaDeviceInfo[];
  selectedMicrophoneId?: string;
  selectedOutputId?: string;
  latencyMs?: number;
  activeInputStream: MediaStream | null;
  outputSelectionSupported: boolean;
  audioPlaybackBlocked: boolean;
  error?: string;
  joinRoom(roomId: string, communityId?: string): Promise<void>;
  joinDirectCall(callId: string): Promise<void>;
  leaveRoom(): Promise<void>;
  enableAudio(): Promise<void>;
  setMuted(value: boolean): Promise<void>;
  setDeafened(value: boolean): Promise<void>;
  selectMicrophone(deviceId: string): Promise<void>;
  selectOutput(deviceId: string): Promise<void>;
  raiseHand(value: boolean): Promise<void>;
  refreshDevices(): Promise<void>;
  registerRemoteAudio(el: HTMLAudioElement): void;
  unregisterRemoteAudio(el: HTMLAudioElement): void;
}

export type MicrophoneState =
  | "unknown"
  | "permission-required"
  | "ready"
  | "active"
  | "muted"
  | "server-muted"
  | "device-lost"
  | "error";

// ─── Roles & Permissions ──────────────────────────────────────────────────────

export type PermissionValue = "allow" | "inherit" | "deny";

export interface Role {
  id: string;
  communityId: string;
  name: string;
  color?: string;
  priority: number;
  permissions: Record<string, PermissionValue>;
}

// ─── Navigation ───────────────────────────────────────────────────────────────

export type NavSection = "home" | "friends" | "direct" | "community" | "settings";

export interface AppView {
  section: NavSection;
  communityId?: string;
  roomId?: string;
  conversationId?: string;
  friendId?: string;
  friendDisplayName?: string;
  settingsPage?: string;
}

// ─── Notifications ────────────────────────────────────────────────────────────

export interface AppNotification {
  id: string;
  type: "friend-request" | "friend-accepted" | "direct-message" | "room-invitation";
  fromUserId: string;
  payload?: unknown;
  createdAt: string;
  read: boolean;
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export type Theme = "dark" | "light" | "system";
export type Density = "comfortable" | "compact";
export type InputMode = "voice-activity" | "push-to-talk";

export interface UserSettings {
  theme: Theme;
  density: Density;
  reducedMotion: boolean;
  inputMode: InputMode;
  inputVolume: number;
  outputVolume: number;
  echoCancellation: boolean;
  noiseSuppression: boolean;
  automaticGain: boolean;
  joinSounds: boolean;
  leaveSounds: boolean;
  muteFocusLoss: boolean;
  friendRequestsFrom: "everyone" | "nobody";
  directCallsFrom: "friends" | "nobody";
  presenceVisibility: "friends" | "nobody";
}
