import { useState } from "react";
import type { VoiceRoomController } from "../../types";
import { useCommunities } from "../../features/communities/community-context";
import { Button, Tooltip, Spinner } from "../ui/primitives";
import { AudioDevicePanel } from "./AudioDevicePanel";

interface VoiceConnectionStripProps {
  voice: VoiceRoomController;
}

export function VoiceConnectionStrip({ voice }: VoiceConnectionStripProps) {
  const [devicePanelOpen, setDevicePanelOpen] = useState(false);
  const { getCommunityById, getRoomById } = useCommunities();
  const [anchorPos, setAnchorPos] = useState<{ top: number; left: number } | null>(null);

  const { state, roomId, communityId, localParticipant, latencyMs } = voice;
  const room = roomId ? getRoomById(roomId) : undefined;
  const community = communityId ? getCommunityById(communityId) : undefined;

  const isMuted = localParticipant?.isMuted ?? false;
  const isDeafened = localParticipant?.isDeafened ?? false;

  function openDevicePanel(e: React.MouseEvent) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setAnchorPos({ top: rect.top - 10, left: rect.left });
    setDevicePanelOpen(true);
  }

  const qualityLabel = latencyMs !== undefined
    ? latencyMs < 50 ? "Excellent" : latencyMs < 100 ? "Good" : "Poor"
    : "";

  const stateColors: Record<string, string> = {
    connected: "var(--live)",
    connecting: "var(--warning)",
    reconnecting: "var(--warning)",
    failed: "var(--danger)",
  };

  if (voice.sessionKind === "direct") return null;
  if (state === "idle" || state === "disconnected" || state === "disconnecting") return null;

  return (
    <>
      <div className="qp-mobile-safe-bottom flex shrink-0 items-center gap-2 border-t border-[var(--border-subtle)] bg-[var(--surface-0)] px-2 py-2 sm:gap-4 sm:px-3">
        {/* Status + room info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            {state === "connecting" || state === "reconnecting" ? (
              <Spinner size={10} className="text-[var(--warning)]" />
            ) : (
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ background: stateColors[state] ?? "var(--text-tertiary)" }}
                aria-hidden="true"
              />
            )}
            <span
              className="text-[10px] font-semibold uppercase tracking-[.11em]"
              style={{ color: stateColors[state] ?? "var(--text-secondary)" }}
            >
              {state === "connected" ? "Voice connected" :
               state === "connecting" ? "Connecting…" :
               state === "reconnecting" ? "Reconnecting…" :
               state === "failed" ? "Connection failed" : state}
            </span>
          </div>
          {room && (
            <div className="flex items-center gap-1 text-[11px] text-[var(--text-secondary)] truncate">
              <span className="font-medium text-[var(--text-primary)] truncate">{room.name}</span>
              {community && <><span className="text-[var(--text-tertiary)]">·</span><span className="truncate">{community.name}</span></>}
            </div>
          )}
          {latencyMs !== undefined && state === "connected" && (
            <div className="text-[11px] text-[var(--text-tertiary)] tabular-nums">{latencyMs} ms · {qualityLabel}</div>
          )}
        </div>

        {(voice.audioPlaybackBlocked || voice.error) && (
          <div className="hidden md:flex items-center gap-2 max-w-sm">
            {voice.error && (
              <span className="text-[11px] text-[var(--danger)] truncate" title={voice.error}>{voice.error}</span>
            )}
            {voice.audioPlaybackBlocked && (
              <Button variant="outline" size="sm" onClick={() => voice.enableAudio()}>Enable audio</Button>
            )}
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center gap-1 shrink-0">
          <Tooltip label={isMuted ? "Unmute (M)" : "Mute (M)"} side="top">
            <button
              aria-label={isMuted ? "Unmute microphone" : "Mute microphone"}
              aria-pressed={isMuted}
              onClick={() => voice.setMuted(!isMuted)}
              disabled={state !== "connected"}
              className={`flex items-center justify-center w-8 h-8 rounded-[var(--radius-md)] transition-colors disabled:opacity-40 ${
                isMuted
                  ? "bg-[var(--danger)]/15 text-[var(--danger)] hover:bg-[var(--danger)]/25"
                  : "text-[var(--text-secondary)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]"
              }`}
            >
              {isMuted ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/>
                  <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23M12 19v4M8 23h8"/>
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
                </svg>
              )}
            </button>
          </Tooltip>

          <Tooltip label={isDeafened ? "Undeafen" : "Deafen"} side="top">
            <button
              aria-label={isDeafened ? "Undeafen" : "Deafen audio output"}
              aria-pressed={isDeafened}
              onClick={() => voice.setDeafened(!isDeafened)}
              disabled={state !== "connected"}
              className={`flex items-center justify-center w-8 h-8 rounded-[var(--radius-md)] transition-colors disabled:opacity-40 ${
                isDeafened
                  ? "bg-[var(--danger)]/15 text-[var(--danger)] hover:bg-[var(--danger)]/25"
                  : "text-[var(--text-secondary)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]"
              }`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                {isDeafened
                  ? <><path d="M11 5h2a2 2 0 0 1 0 4h-3"/><path d="M5 14H4a9 9 0 0 0 16 0h-1"/><line x1="1" y1="1" x2="23" y2="23"/></>
                  : <><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></>
                }
              </svg>
            </button>
          </Tooltip>

          <Tooltip label="Audio devices" side="top">
            <button
              aria-label="Open audio device settings"
              onClick={openDevicePanel}
              className="qp-interactive flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] text-[var(--text-secondary)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            </button>
          </Tooltip>

          <div className="w-px h-5 bg-[var(--border-subtle)] mx-0.5" />

          <Tooltip label="Leave room" side="top">
            <button
              aria-label="Leave voice room"
              onClick={() => voice.leaveRoom()}
              className="qp-interactive flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] text-[var(--text-secondary)] hover:bg-[var(--danger)]/10 hover:text-[var(--danger)]"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Audio device panel */}
      {devicePanelOpen && anchorPos && (
        <AudioDevicePanel
          voice={voice}
          anchor={anchorPos}
          onClose={() => setDevicePanelOpen(false)}
        />
      )}
    </>
  );
}
