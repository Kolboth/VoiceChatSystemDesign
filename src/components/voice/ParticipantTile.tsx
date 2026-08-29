import type { VoiceParticipant } from "../../types";
import { getUserById } from "../../data/mock";
import { Avatar, ConnectionQualityIcon, Tooltip } from "../ui/primitives";

interface ParticipantTileProps {
  participant: VoiceParticipant;
  onContextMenu?: (participant: VoiceParticipant, e: React.MouseEvent) => void;
  compact?: boolean;
}

export function ParticipantTile({ participant, onContextMenu, compact = false }: ParticipantTileProps) {
  const user = getUserById(participant.userId);
  if (!user) return null;

  const { isSpeaking, isMuted, isDeafened, isServerMuted, hasRaisedHand, isLocal, isModerator, connectionQuality, isAFK } = participant;

  const name = isLocal ? "You" : user.displayName;
  const effectiveMuted = isMuted || isServerMuted;
  const speakingActive = isSpeaking && !effectiveMuted;

  if (compact) {
    return (
      <div
        className={`group flex items-center gap-2.5 px-3 py-2 rounded-[var(--radius-md)] transition-colors hover:bg-[var(--surface-2)] ${speakingActive ? "ring-1 ring-[var(--live)]/60" : ""}`}
        onContextMenu={e => { e.preventDefault(); onContextMenu?.(participant, e); }}
      >
        <div className="relative">
          <Avatar displayName={user.displayName} userId={user.id} size="sm" />
          {speakingActive && (
            <span className="absolute -inset-0.5 rounded-full ring-2 ring-[var(--live)] animate-[speaking-pulse_1.2s_ease-in-out_infinite]" />
          )}
        </div>
        <span className={`flex-1 text-[13px] truncate ${speakingActive ? "text-[var(--text-primary)] font-medium" : "text-[var(--text-secondary)]"}`}>
          {name}
        </span>
        <div className="flex items-center gap-1.5">
          {hasRaisedHand && <span title="Hand raised" className="text-[var(--warning)]">✋</span>}
          {isServerMuted && (
            <Tooltip label="Server muted" side="top">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2" strokeLinecap="round">
                <line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23M12 19v4M8 23h8"/>
              </svg>
            </Tooltip>
          )}
          {!isServerMuted && isMuted && (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2" strokeLinecap="round">
              <line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23M12 19v4M8 23h8"/>
            </svg>
          )}
        </div>
      </div>
    );
  }

  // Full tile
  return (
    <div
      className={`group relative flex flex-col items-center gap-3 p-4 rounded-[var(--radius-lg)] border transition-all duration-150 select-none cursor-default
        ${speakingActive
          ? "bg-[var(--surface-2)] border-[var(--live)]/60 shadow-[0_0_0_2px_var(--live)]/20"
          : "bg-[var(--surface-1)] border-[var(--border-subtle)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-2)]"
        }`}
      onContextMenu={e => { e.preventDefault(); onContextMenu?.(participant, e); }}
      aria-label={`${name}${speakingActive ? ", speaking" : ""}${effectiveMuted ? ", muted" : ""}${isDeafened ? ", deafened" : ""}`}
    >
      {/* Speaking ring */}
      <div className="relative">
        <Avatar displayName={user.displayName} userId={user.id} size="lg" />
        {speakingActive && (
          <span
            className="absolute -inset-1.5 rounded-full border-2 border-[var(--live)] animate-[speaking-pulse_1.4s_ease-in-out_infinite]"
            aria-hidden="true"
          />
        )}
        {isAFK && (
          <span className="absolute -bottom-1 -right-1 text-sm" title="AFK">💤</span>
        )}
      </div>

      {/* Name */}
      <div className="flex flex-col items-center gap-0.5 min-w-0 w-full">
        <span className={`text-[13px] font-medium truncate max-w-full ${speakingActive ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"}`}>
          {name}
        </span>
        {isLocal && (
          <span className="text-[11px] text-[var(--text-tertiary)]">You</span>
        )}
      </div>

      {/* Status row */}
      <div className="flex items-center gap-2">
        {hasRaisedHand && (
          <Tooltip label="Hand raised" side="top">
            <span className="text-sm text-[var(--warning)]" aria-label="Hand raised">✋</span>
          </Tooltip>
        )}
        {isModerator && (
          <Tooltip label="Moderator" side="top">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </Tooltip>
        )}
        {isServerMuted ? (
          <Tooltip label="Server muted" side="top">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2" strokeLinecap="round" aria-label="Server muted">
              <line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23M12 19v4M8 23h8"/>
            </svg>
          </Tooltip>
        ) : isMuted ? (
          <Tooltip label="Muted" side="top">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2" strokeLinecap="round" aria-label="Muted">
              <line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23M12 19v4M8 23h8"/>
            </svg>
          </Tooltip>
        ) : null}
        {isDeafened && (
          <Tooltip label="Deafened" side="top">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2" strokeLinecap="round" aria-label="Deafened">
              <path d="M11 5h2a2 2 0 0 1 0 4h-3m0 0H7a2 2 0 0 1 0-4"/><path d="M5 14H4a9 9 0 0 0 16 0h-1"/>
            </svg>
          </Tooltip>
        )}
        <ConnectionQualityIcon quality={connectionQuality} />
      </div>
    </div>
  );
}

// Compact row for large rooms
export function ParticipantCompactRow({ participant, onContextMenu }: {
  participant: VoiceParticipant;
  onContextMenu?: (p: VoiceParticipant, e: React.MouseEvent) => void;
}) {
  return <ParticipantTile participant={participant} onContextMenu={onContextMenu} compact />;
}
