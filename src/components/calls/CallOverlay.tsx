import { useEffect, useState } from "react";
import { useCall } from "../../features/calls/call-context";
import { Avatar, Spinner } from "../ui/primitives";

function CallDuration({ startedAt }: { startedAt: string }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const start = new Date(startedAt).getTime();
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(id);
  }, [startedAt]);
  const m = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const s = String(elapsed % 60).padStart(2, "0");
  return <span className="tabular-nums text-[13px] text-[var(--text-secondary)]">{m}:{s}</span>;
}

export function CallOverlay() {
  const { activeCall, acceptCall, declineCall, endCall } = useCall();
  if (!activeCall) return null;

  const { session, state, friendId, friendDisplayName } = activeCall;
  const isIncoming = state === "incoming-ringing";
  const isOutgoing = state === "outgoing-ringing";
  const isConnecting = state === "connecting";
  const isConnected = state === "connected";
  const isEnded = state === "ended" || state === "declined" || state === "missed" || state === "failed";

  return (
    <div
      className="fixed bottom-20 right-4 z-50 w-72 bg-[var(--surface-3)] border border-[var(--border-subtle)] rounded-[var(--radius-xl)] shadow-2xl animate-fade-in overflow-hidden"
      role="dialog"
      aria-label="Voice call"
    >
      <div className={`h-0.5 w-full transition-colors ${isConnected ? "bg-[var(--live)]" : isIncoming ? "bg-[var(--accent)]" : "bg-[var(--surface-3)]"}`} />

      <div className="p-4 flex flex-col items-center gap-4">
        <div className={`relative ${isIncoming ? "animate-call-ring rounded-full" : ""}`}>
          <Avatar displayName={friendDisplayName} userId={friendId} size="lg" />
        </div>

        <div className="text-center">
          <p className="text-[15px] font-semibold text-[var(--text-primary)]">{friendDisplayName}</p>
          <p className="text-[13px] text-[var(--text-secondary)] mt-0.5">
            {isIncoming ? "Incoming voice call" :
             isOutgoing ? "Ringing…" :
             isConnecting ? "Connecting…" :
             isConnected ? <CallDuration startedAt={session.connectedAt ?? session.startedAt} /> :
             state === "ended" ? "Call ended" :
             state === "declined" ? "Call declined" :
             state === "missed" ? "Missed call" :
             state === "failed" ? "Call failed" : state}
          </p>
        </div>

        <div className="flex items-center justify-center gap-4">
          {isIncoming && (
            <>
              <button
                onClick={() => declineCall(session.id)}
                aria-label="Decline call"
                className="flex items-center justify-center w-12 h-12 rounded-full bg-[var(--danger)] text-white hover:opacity-90 transition-opacity"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M23.36 14.37a1 1 0 0 0-.11-1.35l-2.45-2.45a1 1 0 0 0-1.35-.11l-1.59 1.32a11 11 0 0 1-4.39-4.39l1.32-1.59a1 1 0 0 0-.11-1.35L12.24.99A1 1 0 0 0 10.89.88L8.43 3.34A2 2 0 0 0 8 4.71c.86 6.62 6.62 12.38 13.24 13.24a2 2 0 0 0 1.37-.43l2.46-2.46a1 1 0 0 0 .29-.69z"/>
                  <line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
              </button>
              <button
                onClick={() => acceptCall(session.id)}
                aria-label="Accept call"
                className="flex items-center justify-center w-12 h-12 rounded-full bg-[var(--success)] text-white hover:opacity-90 transition-opacity"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2.18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.18 6.18l.9-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
                </svg>
              </button>
            </>
          )}

          {isOutgoing && (
            <button
              onClick={endCall}
              aria-label="Cancel call"
              className="flex items-center justify-center w-12 h-12 rounded-full bg-[var(--danger)] text-white hover:opacity-90 transition-opacity"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M23.36 14.37a1 1 0 0 0-.11-1.35l-2.45-2.45a1 1 0 0 0-1.35-.11l-1.59 1.32a11 11 0 0 1-4.39-4.39l1.32-1.59a1 1 0 0 0-.11-1.35L12.24.99A1 1 0 0 0 10.89.88L8.43 3.34A2 2 0 0 0 8 4.71c.86 6.62 6.62 12.38 13.24 13.24a2 2 0 0 0 1.37-.43l2.46-2.46a1 1 0 0 0 .29-.69z"/>
              </svg>
            </button>
          )}

          {isConnecting && <Spinner size={24} />}

          {isConnected && (
            <button
              onClick={endCall}
              aria-label="End call"
              className="flex items-center justify-center px-5 h-10 rounded-full bg-[var(--danger)] text-white hover:opacity-90 transition-opacity text-sm font-medium gap-2"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M23.36 14.37a1 1 0 0 0-.11-1.35l-2.45-2.45a1 1 0 0 0-1.35-.11l-1.59 1.32a11 11 0 0 1-4.39-4.39l1.32-1.59a1 1 0 0 0-.11-1.35L12.24.99A1 1 0 0 0 10.89.88L8.43 3.34A2 2 0 0 0 8 4.71c.86 6.62 6.62 12.38 13.24 13.24a2 2 0 0 0 1.37-.43l2.46-2.46a1 1 0 0 0 .29-.69z"/>
              </svg>
              End call
            </button>
          )}
        </div>

        {isEnded && <p className="text-[12px] text-[var(--text-tertiary)]">Closing…</p>}
      </div>
    </div>
  );
}
