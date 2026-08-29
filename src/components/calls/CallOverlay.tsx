import { useEffect, useState } from "react";
import { Headphones, Mic, MicOff, Phone, PhoneOff, Settings2, VolumeX } from "lucide-react";
import { useCall } from "../../features/calls/call-context";
import { useVoice } from "../../features/voice/voice-context";
import { Avatar, Spinner, Tooltip } from "../ui/primitives";
import { AudioDevicePanel } from "../voice/AudioDevicePanel";

function CallDuration({ startedAt }: { startedAt: string }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const start = new Date(startedAt).getTime();
    const id = setInterval(() => setElapsed(Math.max(0, Math.floor((Date.now() - start) / 1000))), 1000);
    return () => clearInterval(id);
  }, [startedAt]);
  const m = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const s = String(elapsed % 60).padStart(2, "0");
  return <span className="tabular-nums">{m}:{s}</span>;
}

export function CallOverlay() {
  const {
    activeCall,
    acceptCall,
    declineCall,
    endCall,
    isMuted,
    isDeafened,
    setMuted,
    setDeafened,
    audioPlaybackBlocked,
    enableAudio,
    error,
  } = useCall();
  const voice = useVoice();
  const [devicePanelOpen, setDevicePanelOpen] = useState(false);
  const [anchor, setAnchor] = useState<{ top: number; left: number } | null>(null);

  if (!activeCall) return null;

  const { session, state, friendId, friendDisplayName } = activeCall;
  const isIncoming = state === "incoming-ringing";
  const isOutgoing = state === "outgoing-ringing";
  const isConnecting = state === "connecting" || state === "reconnecting";
  const isConnected = state === "connected";
  const isEnded = ["ended", "declined", "missed", "cancelled", "failed"].includes(state);

  function openDevices(e: React.MouseEvent<HTMLButtonElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    setAnchor({ top: Math.max(12, rect.top - 352), left: Math.max(12, rect.left - 270) });
    setDevicePanelOpen(true);
  }

  const stateLabel = isIncoming ? "Incoming voice call"
    : isOutgoing ? "Ringing…"
    : state === "reconnecting" ? "Reconnecting…"
    : isConnecting ? "Connecting…"
    : state === "ended" ? "Call ended"
    : state === "declined" ? "Call declined"
    : state === "missed" ? "No answer"
    : state === "cancelled" ? "Call cancelled"
    : state === "failed" ? "Call failed"
    : "Voice call";

  return (
    <>
      <div
        className="qp-raised fixed bottom-4 right-4 z-50 w-[318px] overflow-hidden rounded-[var(--radius-xl)] animate-call-enter"
        role="dialog"
        aria-label="Voice call"
      >
        <div className="flex items-center gap-3 border-b border-[var(--border-subtle)] px-3.5 py-3">
          <div className={`relative shrink-0 ${isIncoming ? "animate-call-ring rounded-full" : ""}`}>
            <Avatar displayName={friendDisplayName} userId={friendId} size="md" />
            {isConnected && <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-[var(--live)] ring-2 ring-[var(--surface-3)]" />}
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold text-[var(--text-primary)]">{friendDisplayName}</p>
            <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-[var(--text-tertiary)]">
              {isConnected ? (
                <><span className="h-1.5 w-1.5 rounded-full bg-[var(--live)]" /><span className="text-[var(--live)]">Connected</span><span>·</span><CallDuration startedAt={session.connectedAt ?? session.startedAt} /></>
              ) : (
                <><span className={`h-1.5 w-1.5 rounded-full ${isIncoming ? "bg-[var(--accent)]" : isConnecting || isOutgoing ? "bg-[var(--warning)]" : "bg-[var(--text-tertiary)]"}`} />{stateLabel}</>
              )}
            </div>
          </div>

          {isConnecting && <Spinner size={15} className="text-[var(--text-tertiary)]" />}
        </div>

        {(error || (audioPlaybackBlocked && isConnected)) && (
          <div className="border-b border-[var(--border-subtle)] px-3 py-2">
            {error && <p className="text-[11px] leading-4 text-[var(--danger)]">{error}</p>}
            {audioPlaybackBlocked && isConnected && (
              <button onClick={enableAudio} className="mt-1 text-[11px] font-medium text-[var(--warning)] hover:text-[var(--text-primary)]">
                Enable audio playback
              </button>
            )}
          </div>
        )}

        <div className="flex min-h-[82px] items-center justify-center px-3.5 py-3.5">
          {isIncoming && (
            <div className="flex w-full items-center gap-2">
              <button
                onClick={() => declineCall(session.id)}
                className="qp-interactive flex h-9 flex-1 items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--danger)]/20 bg-[var(--danger)]/[0.07] text-[12px] font-medium text-[var(--danger)] hover:bg-[var(--danger)]/12"
              >
                <PhoneOff size={15} /> Decline
              </button>
              <button
                onClick={() => acceptCall(session.id)}
                className="qp-interactive flex h-9 flex-1 items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--success)] text-[12px] font-semibold text-white hover:opacity-90"
              >
                <Phone size={15} /> Accept
              </button>
            </div>
          )}

          {isOutgoing && (
            <button
              onClick={endCall}
              className="qp-interactive flex h-9 items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--danger)]/20 bg-[var(--danger)]/[0.07] px-4 text-[12px] font-medium text-[var(--danger)] hover:bg-[var(--danger)]/12"
            >
              <PhoneOff size={15} /> Cancel
            </button>
          )}

          {isConnecting && !isOutgoing && <p className="text-[12px] text-[var(--text-tertiary)]">Securing voice connection…</p>}

          {isConnected && (
            <div className="flex items-center gap-1.5">
              <Tooltip label={isMuted ? "Unmute" : "Mute"} side="top">
                <button
                  onClick={() => setMuted(!isMuted)}
                  aria-label={isMuted ? "Unmute microphone" : "Mute microphone"}
                  aria-pressed={isMuted}
                  className={`qp-interactive flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] border ${isMuted ? "border-[var(--danger)]/20 bg-[var(--danger)]/10 text-[var(--danger)]" : "border-[var(--border-subtle)] bg-[var(--surface-2)] text-[var(--text-secondary)] hover:bg-[var(--surface-4)] hover:text-[var(--text-primary)]"}`}
                >
                  {isMuted ? <MicOff size={15} /> : <Mic size={15} />}
                </button>
              </Tooltip>

              <Tooltip label={isDeafened ? "Undeafen" : "Deafen"} side="top">
                <button
                  onClick={() => setDeafened(!isDeafened)}
                  aria-label={isDeafened ? "Undeafen" : "Deafen"}
                  aria-pressed={isDeafened}
                  className={`qp-interactive flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] border ${isDeafened ? "border-[var(--danger)]/20 bg-[var(--danger)]/10 text-[var(--danger)]" : "border-[var(--border-subtle)] bg-[var(--surface-2)] text-[var(--text-secondary)] hover:bg-[var(--surface-4)] hover:text-[var(--text-primary)]"}`}
                >
                  {isDeafened ? <VolumeX size={15} /> : <Headphones size={15} />}
                </button>
              </Tooltip>

              <Tooltip label="Audio devices" side="top">
                <button
                  onClick={openDevices}
                  aria-label="Audio devices"
                  className="qp-interactive flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-2)] text-[var(--text-secondary)] hover:bg-[var(--surface-4)] hover:text-[var(--text-primary)]"
                >
                  <Settings2 size={15} />
                </button>
              </Tooltip>

              <div className="mx-1 h-5 w-px bg-[var(--border-subtle)]" />

              <Tooltip label="End call" side="top">
                <button
                  onClick={endCall}
                  aria-label="End call"
                  className="qp-interactive flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] bg-[var(--danger)] text-white hover:opacity-90"
                >
                  <PhoneOff size={15} />
                </button>
              </Tooltip>
            </div>
          )}

          {isEnded && <p className="text-[12px] text-[var(--text-tertiary)]">Closing call…</p>}
        </div>
      </div>

      {devicePanelOpen && anchor && <AudioDevicePanel voice={voice} anchor={anchor} onClose={() => setDevicePanelOpen(false)} />}
    </>
  );
}
