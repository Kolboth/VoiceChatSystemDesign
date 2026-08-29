import { Headphones, Hand, MicOff, MoonStar, ShieldCheck } from "lucide-react";
import type { VoiceParticipant } from "../../types";
import { useCommunities } from "../../features/communities/community-context";
import { Avatar, ConnectionQualityIcon, Tooltip } from "../ui/primitives";

interface ParticipantTileProps {
  participant: VoiceParticipant;
  onContextMenu?: (participant: VoiceParticipant, e: React.MouseEvent) => void;
  compact?: boolean;
}

function SpeakingBars() {
  return (
    <span className="voice-bars text-[var(--live)]" aria-hidden="true">
      <span /><span /><span />
    </span>
  );
}

export function ParticipantTile({ participant, onContextMenu, compact = false }: ParticipantTileProps) {
  const { getProfileById } = useCommunities();
  const cachedUser = getProfileById(participant.userId);
  const user = cachedUser ?? {
    id: participant.userId,
    displayName: participant.displayName ?? "Participant",
    avatarUrl: participant.avatarUrl,
  };

  const {
    isSpeaking,
    isMuted,
    isDeafened,
    isServerMuted,
    hasRaisedHand,
    isLocal,
    isModerator,
    connectionQuality,
    isAFK,
  } = participant;

  const effectiveMuted = isMuted || isServerMuted;
  const speakingActive = isSpeaking && !effectiveMuted;
  const displayName = user.displayName;

  if (compact) {
    return (
      <div
        className={`qp-participant-enter group flex min-h-10 items-center gap-2.5 rounded-[var(--radius-md)] border px-2.5 py-1.5 qp-interactive ${
          speakingActive
            ? "border-[var(--live)]/35 bg-[var(--live)]/[0.045]"
            : "border-transparent hover:border-[var(--border-subtle)] hover:bg-[var(--surface-2)]"
        }`}
        onContextMenu={e => { e.preventDefault(); onContextMenu?.(participant, e); }}
        aria-label={`${isLocal ? `${displayName}, you` : displayName}${speakingActive ? ", speaking" : ""}${effectiveMuted ? ", muted" : ""}`}
      >
        <div className="relative shrink-0">
          <Avatar displayName={displayName} userId={user.id} avatarUrl={user.avatarUrl} size="sm" />
          {speakingActive && <span className="absolute -inset-[3px] rounded-full border border-[var(--live)]/65" aria-hidden="true" />}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <span className={`truncate text-[13px] ${speakingActive ? "font-medium text-[var(--text-primary)]" : "text-[var(--text-secondary)]"}`}>
              {displayName}
            </span>
            {isLocal && <span className="text-[10px] font-medium uppercase tracking-[.08em] text-[var(--text-tertiary)]">You</span>}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 text-[var(--text-tertiary)]">
          {speakingActive && <SpeakingBars />}
          {hasRaisedHand && <Hand size={13} className="text-[var(--warning)]" aria-label="Hand raised" />}
          {isServerMuted ? (
            <Tooltip label="Server muted" side="top"><MicOff size={13} className="text-[var(--danger)]" /></Tooltip>
          ) : isMuted ? (
            <Tooltip label="Muted" side="top"><MicOff size={13} /></Tooltip>
          ) : null}
          {isDeafened && <Tooltip label="Deafened" side="top"><Headphones size={13} /></Tooltip>}
          <ConnectionQualityIcon quality={connectionQuality} />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`qp-participant-enter group relative min-w-0 rounded-[var(--radius-lg)] border p-3.5 qp-interactive ${
        speakingActive
          ? "border-[var(--live)]/42 bg-[var(--live)]/[0.045] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--live)_12%,transparent)]"
          : "border-[var(--border-subtle)] bg-[var(--surface-1)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-2)]"
      }`}
      onContextMenu={e => { e.preventDefault(); onContextMenu?.(participant, e); }}
      aria-label={`${displayName}${isLocal ? ", you" : ""}${speakingActive ? ", speaking" : ""}${effectiveMuted ? ", muted" : ""}${isDeafened ? ", deafened" : ""}`}
    >
      <div className="flex items-start gap-3">
        <div className="relative shrink-0">
          <Avatar displayName={displayName} userId={user.id} avatarUrl={user.avatarUrl} size="lg" />
          {speakingActive && (
            <span className="absolute -inset-[4px] rounded-full border-[1.5px] border-[var(--live)]/75" aria-hidden="true" />
          )}
          {isAFK && (
            <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--surface-3)] text-[var(--text-tertiary)] ring-2 ring-[var(--surface-1)]" title="AFK">
              <MoonStar size={9} />
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1 pt-0.5">
          <div className="flex min-w-0 items-center gap-2">
            <span className={`truncate text-[13px] font-medium ${speakingActive ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"}`}>
              {displayName}
            </span>
            {isLocal && (
              <span className="rounded-[3px] bg-[var(--surface-3)] px-1 py-0.5 text-[9px] font-semibold uppercase tracking-[.08em] text-[var(--text-tertiary)]">
                You
              </span>
            )}
          </div>
          <div className="mt-1 flex items-center gap-2 text-[11px] text-[var(--text-tertiary)]">
            {speakingActive ? (
              <span className="flex items-center gap-1.5 font-medium text-[var(--live)]"><SpeakingBars /> Speaking</span>
            ) : effectiveMuted ? (
              <span>{isServerMuted ? "Moderator muted" : "Muted"}</span>
            ) : (
              <span>Listening</span>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 text-[var(--text-tertiary)]">
          {hasRaisedHand && <Tooltip label="Hand raised" side="top"><Hand size={13} className="text-[var(--warning)]" /></Tooltip>}
          {isModerator && <Tooltip label="Moderator" side="top"><ShieldCheck size={13} className="text-[var(--accent)]" /></Tooltip>}
          {isServerMuted ? (
            <Tooltip label="Server muted" side="top"><MicOff size={13} className="text-[var(--danger)]" /></Tooltip>
          ) : isMuted ? (
            <Tooltip label="Muted" side="top"><MicOff size={13} /></Tooltip>
          ) : null}
          {isDeafened && <Tooltip label="Deafened" side="top"><Headphones size={13} /></Tooltip>}
          <ConnectionQualityIcon quality={connectionQuality} />
        </div>
      </div>
    </div>
  );
}

export function ParticipantCompactRow({ participant, onContextMenu }: {
  participant: VoiceParticipant;
  onContextMenu?: (p: VoiceParticipant, e: React.MouseEvent) => void;
}) {
  return <ParticipantTile participant={participant} onContextMenu={onContextMenu} compact />;
}
