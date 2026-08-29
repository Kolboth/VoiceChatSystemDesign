import { MOCK_COMMUNITIES, MOCK_ROOMS, ROOM_OCCUPANCY, getUserById, LOCAL_USER_ID } from "../data/mock";
import { useSocial } from "../features/social/social-context";
import { Avatar, Button, PresenceDot } from "../components/ui/primitives";
import { useVoice } from "../features/voice/voice-context";
import type { AppView } from "../types";

interface HomePageProps {
  onNavigate: (view: AppView) => void;
}

export function HomePage({ onNavigate }: HomePageProps) {
  const { friends } = useSocial();
  const voice = useVoice();

  const activeRooms = Object.entries(ROOM_OCCUPANCY)
    .filter(([, occupants]) => occupants.length > 0)
    .map(([roomId, occupants]) => {
      const room = MOCK_ROOMS.find(r => r.id === roomId);
      const community = room ? MOCK_COMMUNITIES.find(c => c.id === room.communityId) : undefined;
      return { room, community, occupants };
    })
    .filter(x => x.room && x.community);

  const onlineFriends = friends.filter(f => f.relation === "friends" && f.profile.presence === "online");
  const pendingRequests = friends.filter(f => f.relation === "incoming-request");

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6 max-w-3xl">
      <h1 className="text-[18px] font-semibold text-[var(--text-primary)] mb-6">Home</h1>

      {/* Pending requests */}
      {pendingRequests.length > 0 && (
        <div className="mb-6 p-3 rounded-[var(--radius-md)] bg-[var(--accent)]/8 border border-[var(--accent)]/20 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[13px]">
            <span className="font-medium text-[var(--text-primary)]">{pendingRequests.length} pending friend request{pendingRequests.length > 1 ? "s" : ""}</span>
          </div>
          <Button variant="ghost" size="xs" onClick={() => onNavigate({ section: "friends" })}>View</Button>
        </div>
      )}

      {/* Active now */}
      {activeRooms.length > 0 && (
        <section className="mb-8">
          <h2 className="text-[12px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-3">Active now</h2>
          <div className="flex flex-col gap-2">
            {activeRooms.map(({ room, community, occupants }) => {
              if (!room || !community) return null;
              const isConnected = voice.roomId === room.id;
              return (
                <div
                  key={room.id}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-md)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-1)] transition-colors group"
                >
                  <div className="w-8 h-8 rounded-[var(--radius-sm)] flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ background: community.iconColor }}>
                    {community.iconInitials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[13px] font-medium text-[var(--text-primary)] truncate">{room.name}</span>
                      <span className="text-[var(--text-tertiary)]">·</span>
                      <span className="text-[12px] text-[var(--text-tertiary)] truncate">{community.name}</span>
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      {occupants.slice(0, 4).map(uid => {
                        const u = getUserById(uid);
                        return u ? (
                          <Avatar key={uid} displayName={u.displayName} userId={u.id} size="xs" />
                        ) : null;
                      })}
                      {occupants.length > 4 && <span className="text-[11px] text-[var(--text-tertiary)]">+{occupants.length - 4}</span>}
                    </div>
                  </div>
                  <Button
                    variant={isConnected ? "ghost" : "outline"}
                    size="sm"
                    onClick={() => onNavigate({ section: "community", communityId: community.id, roomId: room.id })}
                    className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    {isConnected ? "Open" : "Join room"}
                  </Button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Online friends */}
      {onlineFriends.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[12px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">Online friends</h2>
            <button onClick={() => onNavigate({ section: "friends" })} className="text-[12px] text-[var(--accent)] hover:underline">View all</button>
          </div>
          <div className="flex flex-col gap-0.5">
            {onlineFriends.slice(0, 5).map(f => (
              <div key={f.profile.id} className="flex items-center gap-3 px-3 py-2 rounded-[var(--radius-md)] hover:bg-[var(--surface-1)] transition-colors group">
                <div className="relative">
                  <Avatar displayName={f.profile.displayName} userId={f.profile.id} size="sm" />
                  <div className="absolute -bottom-0.5 -right-0.5"><PresenceDot presence={f.profile.presence} size={9} /></div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] text-[var(--text-primary)] truncate">{f.profile.displayName}</p>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="sm" onClick={() => f.conversationId && onNavigate({ section: "direct", conversationId: f.conversationId })}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Communities */}
      <section>
        <h2 className="text-[12px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-3">Your communities</h2>
        <div className="flex flex-col gap-2">
          {MOCK_COMMUNITIES.map(community => {
            const rooms = MOCK_ROOMS.filter(r => r.communityId === community.id && r.kind === "voice");
            return (
              <div
                key={community.id}
                onClick={() => onNavigate({ section: "community", communityId: community.id })}
                role="button"
                tabIndex={0}
                onKeyDown={e => e.key === "Enter" && onNavigate({ section: "community", communityId: community.id })}
                className="flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-md)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-1)] cursor-pointer transition-colors"
              >
                <div className="w-8 h-8 rounded-[var(--radius-sm)] flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ background: community.iconColor }}>
                  {community.iconInitials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-[var(--text-primary)]">{community.name}</p>
                  <p className="text-[12px] text-[var(--text-tertiary)]">{rooms.length} voice room{rooms.length !== 1 ? "s" : ""}</p>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
