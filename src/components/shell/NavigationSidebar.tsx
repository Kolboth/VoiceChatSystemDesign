import { useState } from "react";
import type { AppView, Room, UserProfile } from "../../types";
import { useCommunities } from "../../features/communities/community-context";
import { useSocial } from "../../features/social/social-context";
import { useVoice } from "../../features/voice/voice-context";
import { useAuth } from "../../features/auth/auth-context";
import { Avatar, Tooltip } from "../ui/primitives";
import { CreateVoiceRoomDialog, InviteFriendsDialog } from "../communities/CommunityDialogs";

interface NavigationSidebarProps {
  view: AppView;
  onNavigate: (view: AppView) => void;
  connectedRoomId?: string;
}

function groupRooms(rooms: Room[]): Record<string, Room[]> {
  return rooms.reduce((acc, r) => {
    const cat = r.category ?? "Rooms";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(r);
    return acc;
  }, {} as Record<string, Room[]>);
}

function RoomNavItem({ room, isSelected, isConnected, liveProfiles, onClick }: {
  room: Room;
  isSelected: boolean;
  isConnected: boolean;
  liveProfiles: UserProfile[];
  onClick: () => void;
}) {
  const [expanded, setExpanded] = useState(liveProfiles.length > 0);
  const isVoice = room.kind === "voice" || room.kind === "instant";

  return (
    <div>
      <div
        className={`group flex min-h-8 items-center gap-1.5 rounded-[var(--radius-sm)] px-2 py-1 cursor-pointer qp-interactive ${
          isSelected ? "bg-[var(--surface-2)] text-[var(--text-primary)]" :
          isConnected ? "bg-[var(--accent)]/10 text-[var(--accent-text)]" :
          "text-[var(--text-secondary)] hover:bg-[var(--surface-1)] hover:text-[var(--text-primary)]"
        }`}
        onClick={onClick}
        role="button"
        tabIndex={0}
        aria-current={isSelected ? "page" : undefined}
        aria-label={`${room.name}${liveProfiles.length ? `, ${liveProfiles.length} currently connected` : ""}`}
        onKeyDown={e => e.key === "Enter" && onClick()}
      >
        {isVoice && liveProfiles.length > 0 ? (
          <button
            onClick={e => { e.stopPropagation(); setExpanded(v => !v); }}
            className="shrink-0 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
            aria-label={expanded ? "Collapse connected participants" : "Expand connected participants"}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className={`transition-transform ${expanded ? "rotate-90" : ""}`}>
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        ) : <span className="w-2.5 shrink-0" />}

        <span className="shrink-0 text-[var(--text-tertiary)]">
          {room.kind === "text" ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          ) : room.kind === "instant" ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
          )}
        </span>

        <span className={`flex-1 text-[13px] truncate ${isConnected ? "font-semibold" : ""}`}>{room.name}</span>
        {isConnected && <span className="w-1.5 h-1.5 rounded-full bg-[var(--live)] shrink-0" aria-label="Connected" />}
        {room.privacy === "invite" && (
          <span className="shrink-0 text-[var(--text-tertiary)]">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          </span>
        )}
      </div>

      {isVoice && expanded && liveProfiles.length > 0 && (
        <div className="ml-6 mt-0.5 mb-1">
          {liveProfiles.map(profile => (
            <div key={profile.id} className="flex items-center gap-1.5 px-2 py-0.5 text-[12px] text-[var(--text-secondary)]">
              <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-[var(--live)]" />
              <span className="truncate">{profile.displayName}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DirectConvItem({ friendId, name, unread, isSelected, onClick }: {
  friendId: string; name: string; unread: number; isSelected: boolean; onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === "Enter" && onClick()}
      className={`flex items-center gap-2 px-2 py-1.5 rounded-[var(--radius-sm)] cursor-pointer transition-colors ${isSelected ? "bg-[var(--surface-2)]" : "hover:bg-[var(--surface-1)]"}`}
    >
      <Avatar displayName={name} userId={friendId} size="sm" />
      <span className="flex-1 text-[13px] truncate text-[var(--text-primary)]">{name}</span>
      {unread > 0 && (
        <span className="shrink-0 min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--accent)] text-[11px] font-medium text-[var(--accent-fg)] flex items-center justify-center tabular-nums">{unread}</span>
      )}
    </div>
  );
}

export function NavigationSidebar({ view, onNavigate, connectedRoomId }: NavigationSidebarProps) {
  const [createRoomOpen, setCreateRoomOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const { profile } = useAuth();
  const voice = useVoice();
  const { friends, getOrCreateConversation } = useSocial();
  const { getCommunityById, getRoomsByCommunity, getRoomById, getProfileById } = useCommunities();
  const acceptedFriends = friends.filter(f => f.relation === "friends");

  if (view.section === "home") {
    return (
      <div className="flex flex-col w-[248px] qp-sidebar shrink-0">
        <div className="border-b border-[var(--border-subtle)] px-3.5 py-3">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Home</h2>
        </div>
      </div>
    );
  }

  if (view.section === "friends" || view.section === "direct") {
    return (
      <div className="flex flex-col w-[248px] qp-sidebar shrink-0">
        <div className="border-b border-[var(--border-subtle)] px-3.5 py-3">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Direct Messages</h2>
        </div>
        <div className="flex-1 overflow-y-auto px-2 py-2.5">
          <div
            onClick={() => onNavigate({ section: "friends" })}
            role="button"
            tabIndex={0}
            onKeyDown={e => e.key === "Enter" && onNavigate({ section: "friends" })}
            className={`flex items-center gap-2 px-2 py-1.5 rounded-[var(--radius-sm)] cursor-pointer transition-colors mb-2 text-[13px] ${view.section === "friends" && !view.conversationId ? "bg-[var(--surface-2)] text-[var(--text-primary)]" : "text-[var(--text-secondary)] hover:bg-[var(--surface-1)] hover:text-[var(--text-primary)]"}`}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
              <path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            Friends
          </div>

          {acceptedFriends.length > 0 && (
            <div className="px-2 py-1 text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">Friends</div>
          )}
          {acceptedFriends.map(entry => (
            <DirectConvItem
              key={entry.profile.id}
              friendId={entry.profile.id}
              name={entry.profile.displayName}
              unread={0}
              isSelected={view.friendId === entry.profile.id}
              onClick={async () => {
                const conversationId = await getOrCreateConversation(entry.profile.id);
                onNavigate({
                  section: "direct",
                  conversationId,
                  friendId: entry.profile.id,
                  friendDisplayName: entry.profile.displayName,
                });
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (view.section === "settings") {
    const navItems = [
      { group: "User", items: [
        { id: "account", label: "Account" },
        { id: "profile", label: "Profile" },
        { id: "privacy", label: "Privacy" },
        { id: "notifications", label: "Notifications" },
        { id: "appearance", label: "Appearance" },
      ]},
      { group: "App", items: [
        { id: "voice-audio", label: "Voice & Audio" },
        { id: "keybinds", label: "Keybinds" },
        { id: "accessibility", label: "Accessibility" },
        { id: "advanced", label: "Advanced" },
      ]},
    ];
    return (
      <div className="flex flex-col w-[248px] qp-sidebar shrink-0">
        <div className="border-b border-[var(--border-subtle)] px-3.5 py-3">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Settings</h2>
        </div>
        <div className="flex-1 overflow-y-auto px-2 py-2.5">
          {navItems.map(group => (
            <div key={group.group} className="mb-4">
              <div className="px-2 py-1 text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">{group.group}</div>
              {group.items.map(item => (
                <div
                  key={item.id}
                  onClick={() => onNavigate({ section: "settings", settingsPage: item.id })}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => e.key === "Enter" && onNavigate({ section: "settings", settingsPage: item.id })}
                  className={`px-2 py-1.5 rounded-[var(--radius-sm)] text-[13px] cursor-pointer transition-colors ${view.settingsPage === item.id ? "bg-[var(--surface-2)] text-[var(--text-primary)] font-medium" : "text-[var(--text-secondary)] hover:bg-[var(--surface-1)] hover:text-[var(--text-primary)]"}`}
                >
                  {item.label}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (view.section === "community" && view.communityId) {
    const community = getCommunityById(view.communityId);
    if (!community) {
      return (
        <div className="flex flex-col w-[248px] qp-sidebar shrink-0 p-4">
          <p className="text-[13px] text-[var(--text-tertiary)]">Community unavailable.</p>
        </div>
      );
    }
    const rooms = getRoomsByCommunity(view.communityId);
    const grouped = groupRooms(rooms);
    const selectedRoom = view.roomId ? getRoomById(view.roomId) : null;
    const canManage = community.ownerId === profile?.id;

    return (
      <>
        <div className="flex flex-col w-[248px] qp-sidebar shrink-0">
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-3 py-3">
            <div className="flex items-center gap-2 min-w-0">
              <div
                className="w-7 h-7 rounded-[var(--radius-sm)] flex items-center justify-center text-xs font-bold text-white shrink-0"
                style={{ background: community.iconColor ?? "#6366f1" }}
              >
                {community.iconInitials}
              </div>
              <span className="text-sm font-semibold text-[var(--text-primary)] truncate">{community.name}</span>
            </div>
            {canManage && selectedRoom?.kind === "voice" && (
              <Tooltip label="Add friends to selected channel" side="bottom">
                <button
                  aria-label="Add friends to selected channel"
                  onClick={() => setInviteOpen(true)}
                  className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] p-1 rounded-[var(--radius-sm)] transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
                </button>
              </Tooltip>
            )}
          </div>

          <div className="flex-1 overflow-y-auto px-2 py-2.5">
            {Object.keys(grouped).length === 0 && (
              <p className="px-2 py-3 text-[12px] text-[var(--text-tertiary)]">No channels yet.</p>
            )}
            {Object.entries(grouped).map(([category, categoryRooms]) => (
              <div key={category} className="mb-3">
                <div className="flex items-center justify-between px-1 py-1 group">
                  <span className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">{category}</span>
                  {canManage && (
                    <button
                      aria-label="Create voice channel"
                      onClick={() => setCreateRoomOpen(true)}
                      className="opacity-60 group-hover:opacity-100 group-focus-within:opacity-100 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] qp-interactive p-0.5"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    </button>
                  )}
                </div>
                {categoryRooms.map(room => {
                  const liveProfiles = connectedRoomId === room.id
                    ? voice.participants.map(participant => getProfileById(participant.userId)).filter((p): p is UserProfile => Boolean(p))
                    : [];
                  return (
                    <RoomNavItem
                      key={room.id}
                      room={room}
                      isSelected={view.roomId === room.id}
                      isConnected={connectedRoomId === room.id}
                      liveProfiles={liveProfiles}
                      onClick={() => onNavigate({ section: "community", communityId: view.communityId, roomId: room.id })}
                    />
                  );
                })}
              </div>
            ))}

            {canManage && rooms.length === 0 && (
              <button onClick={() => setCreateRoomOpen(true)} className="mx-2 mt-2 text-[12px] text-[var(--accent-text)] hover:underline">Create voice channel</button>
            )}
          </div>
        </div>

        <CreateVoiceRoomDialog
          open={createRoomOpen}
          communityId={community.id}
          onClose={() => setCreateRoomOpen(false)}
          onCreated={roomId => onNavigate({ section: "community", communityId: community.id, roomId })}
        />
        <InviteFriendsDialog open={inviteOpen} room={selectedRoom ?? null} onClose={() => setInviteOpen(false)} />
      </>
    );
  }

  return null;
}
