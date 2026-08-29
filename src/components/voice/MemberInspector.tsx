import { Headphones, MessageCircle, MicOff, Phone, Volume2, X } from "lucide-react";
import type { VoiceParticipant } from "../../types";
import { useCommunities } from "../../features/communities/community-context";
import { Avatar, Button } from "../ui/primitives";

export function MemberInspector({ participant, onClose }: { participant: VoiceParticipant; onClose: () => void }) {
  const { getProfileById } = useCommunities();
  const profile = getProfileById(participant.userId);
  const name = participant.isLocal ? "You" : profile?.displayName ?? "Room member";
  return <aside className="qp-member-inspector qp-panel-enter flex w-[280px] shrink-0 flex-col border-l border-[var(--border-subtle)] bg-[var(--surface-0)]" aria-label={`${name} member details`}>
    <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-4 py-3"><h2 className="text-[13px] font-semibold">Member details</h2><button onClick={onClose} aria-label="Close member details" className="qp-interactive rounded p-1 text-[var(--text-tertiary)] hover:bg-[var(--surface-2)]"><X size={16} /></button></div>
    <div className="flex flex-col items-center px-5 py-6 text-center"><Avatar displayName={name} userId={participant.userId} size="lg" /><h3 className="mt-3 text-[15px] font-semibold">{name}</h3>{profile && <p className="text-[11px] text-[var(--text-tertiary)]">@{profile.username}</p>}<div className="mt-2 flex items-center gap-1.5 text-[11px] text-[var(--text-secondary)]">{participant.isMuted ? <MicOff size={12} /> : participant.isDeafened ? <Headphones size={12} /> : <span className="h-1.5 w-1.5 rounded-full bg-[var(--live)]" />}{participant.isSpeaking ? "Speaking" : participant.isMuted ? "Muted" : "Listening"}</div></div>
    {!participant.isLocal && <div className="grid grid-cols-2 gap-2 px-4"><Button variant="outline" size="sm" leadingIcon={<MessageCircle size={14} />}>Message</Button><Button variant="outline" size="sm" leadingIcon={<Phone size={14} />}>Call</Button></div>}
    {!participant.isLocal && <div className="mt-5 border-t border-[var(--border-subtle)] px-4 py-4"><label className="mb-2 flex items-center gap-2 text-[12px] text-[var(--text-secondary)]"><Volume2 size={14} />Local volume</label><input type="range" min="0" max="100" defaultValue={participant.volume} className="w-full accent-[var(--accent)]" aria-label={`${name} local volume`} /></div>}
    {(participant.isModerator || participant.isOwner) && <p className="mx-4 mt-auto mb-4 rounded-[var(--radius-md)] bg-[var(--surface-2)] px-3 py-2 text-[11px] text-[var(--text-tertiary)]">Moderation controls are limited to authorized room roles.</p>}
  </aside>;
}
