import { ArrowRight, Headphones, MessageCircle, Plus, Radio, Users } from "lucide-react";
import { useSocial } from "../features/social/social-context";
import { useCommunities } from "../features/communities/community-context";
import { Avatar, Button, EmptyState, PresenceDot } from "../components/ui/primitives";
import { useVoice } from "../features/voice/voice-context";
import type { AppView, UserProfile } from "../types";

interface HomePageProps {
  onNavigate: (view: AppView) => void;
}

function SectionHeading({ eyebrow, action }: { eyebrow: string; action?: React.ReactNode }) {
  return (
    <div className="mb-2.5 flex items-center justify-between gap-3">
      <h2 className="qp-kicker">{eyebrow}</h2>
      {action}
    </div>
  );
}

export function HomePage({ onNavigate }: HomePageProps) {
  const { friends, getOrCreateConversation } = useSocial();
  const { communities, rooms, error: communityError, getRoomById, getCommunityById, getProfileById } = useCommunities();
  const voice = useVoice();

  const onlineFriends = friends.filter(f => f.relation === "friends" && (f.profile.presence === "online" || f.profile.presence === "away"));
  const pendingRequests = friends.filter(f => f.relation === "incoming-request");
  const connectedRoom = voice.roomId ? getRoomById(voice.roomId) : undefined;
  const connectedCommunity = connectedRoom ? getCommunityById(connectedRoom.communityId) : undefined;
  const connectedProfiles = voice.participants
    .map(participant => getProfileById(participant.userId))
    .filter((profile): profile is UserProfile => Boolean(profile));

  async function openConversation(friendId: string, friendDisplayName: string) {
    const conversationId = await getOrCreateConversation(friendId);
    onNavigate({ section: "direct", conversationId, friendId, friendDisplayName });
  }

  return (
    <div className="flex-1 overflow-y-auto qp-page-enter">
      <div className="mx-auto w-full max-w-5xl px-4 py-4 sm:px-7 sm:py-6">
        <div className="mb-6 flex items-start justify-between gap-2 sm:mb-7 sm:gap-4">
          <div>
            <p className="qp-kicker mb-1.5">Beo Beo VC</p>
            <h1 className="text-[20px] font-semibold tracking-[-0.025em] text-[var(--text-primary)] sm:text-[22px]">Who do you want to talk to?</h1>
            <p className="mt-1 text-[13px] text-[var(--text-secondary)]">Jump back into voice, call a friend, or open one of your communities.</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => onNavigate({ section: "friends" })} leadingIcon={<Users size={14} />}>
            Friends
          </Button>
        </div>

        {communityError && (
          <div className="mb-5 rounded-[var(--radius-md)] border border-[var(--danger)]/20 bg-[var(--danger)]/[0.055] px-3 py-2.5">
            <p className="text-[13px] font-medium text-[var(--danger)]">Community data is unavailable</p>
            <p className="mt-0.5 text-[12px] text-[var(--text-secondary)]">Run the latest Supabase migration, then reload this page.</p>
          </div>
        )}

        {pendingRequests.length > 0 && (
          <button
            onClick={() => onNavigate({ section: "friends" })}
            className="mb-6 flex w-full items-center gap-3 rounded-[var(--radius-md)] border border-[var(--accent)]/18 bg-[var(--accent)]/[0.055] px-3 py-2.5 text-left qp-interactive hover:bg-[var(--accent)]/[0.08]"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--accent)]/10 text-[var(--accent-text)]"><Users size={14} /></div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium text-[var(--text-primary)]">{pendingRequests.length} friend request{pendingRequests.length === 1 ? "" : "s"} waiting</p>
              <p className="text-[11px] text-[var(--text-tertiary)]">Review incoming requests</p>
            </div>
            <ArrowRight size={14} className="text-[var(--text-tertiary)]" />
          </button>
        )}

        {connectedRoom && connectedCommunity && (
          <section className="mb-7">
            <SectionHeading eyebrow="Continue" />
            <button
              onClick={() => onNavigate({ section: "community", communityId: connectedCommunity.id, roomId: connectedRoom.id })}
              className="qp-voice-stage group flex w-full items-center gap-3 rounded-[var(--radius-lg)] p-3.5 text-left qp-interactive hover:border-[var(--live)]/28"
            >
              <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--surface-2)] text-[var(--live)]">
                <Headphones size={18} />
                <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-[var(--live)] ring-2 ring-[var(--surface-0)]" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="truncate text-[14px] font-medium text-[var(--text-primary)]">{connectedRoom.name}</span>
                  <span className="truncate text-[12px] text-[var(--text-tertiary)]">{connectedCommunity.name}</span>
                </div>
                <div className="mt-1 flex items-center gap-2 text-[11px] text-[var(--text-tertiary)]">
                  <span className="text-[var(--live)]">Voice connected</span>
                  {connectedProfiles.length > 0 && <span>· {connectedProfiles.length} here</span>}
                </div>
              </div>
              <div className="hidden items-center -space-x-1 sm:flex">
                {connectedProfiles.slice(0, 4).map(profile => (
                  <Avatar key={profile.id} displayName={profile.displayName} userId={profile.id} avatarUrl={profile.avatarUrl} size="xs" className="ring-2 ring-[var(--surface-0)]" />
                ))}
              </div>
              <ArrowRight size={15} className="text-[var(--text-tertiary)] transition-transform group-hover:translate-x-0.5" />
            </button>
          </section>
        )}

        <div className="grid gap-7 lg:grid-cols-[1.05fr_.95fr]">
          <section>
            <SectionHeading
              eyebrow="Active now"
              action={<button onClick={() => onNavigate({ section: "friends" })} className="text-[11px] font-medium text-[var(--text-tertiary)] hover:text-[var(--text-primary)]">View all</button>}
            />
            {onlineFriends.length === 0 ? (
              <div className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-1)] px-4 py-8">
                <EmptyState title="It's quiet right now" description="Your online friends will show up here." />
              </div>
            ) : (
              <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-1)]">
                {onlineFriends.slice(0, 6).map((entry, index) => (
                  <div key={entry.profile.id} className={`group flex items-center gap-3 px-3 py-2.5 ${index ? "border-t border-[var(--border-subtle)]" : ""}`}>
                    <div className="relative shrink-0">
                      <Avatar displayName={entry.profile.displayName} userId={entry.profile.id} avatarUrl={entry.profile.avatarUrl} size="sm" />
                      <div className="absolute -bottom-0.5 -right-0.5"><PresenceDot presence={entry.profile.presence} size={8} /></div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium text-[var(--text-primary)]">{entry.profile.displayName}</p>
                      <p className="truncate text-[11px] text-[var(--text-tertiary)]">@{entry.profile.username} · {entry.profile.presence === "away" ? "Away" : "Online"}</p>
                    </div>
                    <div className="flex items-center gap-1 opacity-70 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                      <button
                        onClick={() => openConversation(entry.profile.id, entry.profile.displayName)}
                        className="qp-interactive flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-tertiary)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]"
                        aria-label={`Message ${entry.profile.displayName}`}
                      >
                        <MessageCircle size={14} />
                      </button>
                      <button
                        onClick={() => onNavigate({ section: "friends" })}
                        className="qp-interactive flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-tertiary)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]"
                        aria-label={`Open ${entry.profile.displayName}`}
                      >
                        <ArrowRight size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <SectionHeading eyebrow="Your communities" />
            {communities.length === 0 ? (
              <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--border-strong)] bg-[var(--surface-1)] px-4 py-8">
                <EmptyState
                  title="Create your first community"
                  description="Use the + button in the rail, then create a voice channel and invite friends."
                  icon={<Plus size={22} />}
                />
              </div>
            ) : (
              <div className="space-y-2">
                {communities.map(community => {
                  const voiceRooms = rooms.filter(r => r.communityId === community.id && r.kind === "voice");
                  return (
                    <button
                      key={community.id}
                      onClick={() => onNavigate({ section: "community", communityId: community.id })}
                      className="group flex w-full items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-1)] px-3 py-3 text-left qp-interactive hover:border-[var(--border-strong)] hover:bg-[var(--surface-2)]"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] text-[12px] font-bold text-white" style={{ background: community.iconColor }}>
                        {community.iconInitials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium text-[var(--text-primary)]">{community.name}</p>
                        <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-[var(--text-tertiary)]">
                          <Radio size={11} /> {voiceRooms.length} voice channel{voiceRooms.length === 1 ? "" : "s"}
                        </div>
                      </div>
                      <ArrowRight size={14} className="text-[var(--text-tertiary)] transition-transform group-hover:translate-x-0.5" />
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
