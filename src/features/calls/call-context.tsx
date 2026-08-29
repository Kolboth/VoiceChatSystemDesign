import { createContext, useContext, useState, useCallback, useRef, useEffect, type ReactNode } from "react";
import Peer, { type MediaConnection } from "peerjs";
import type { CallSession, CallState } from "../../types";
import { useAuth } from "../auth/auth-context";
import { useVoice } from "../voice/voice-context";

// Convert auth user ID (e.g. "u_1731234567890") → PeerJS-safe ID ("res-u-1731234567890")
// PeerJS cloud allows: [A-Za-z0-9] and hyphens
function toPeerId(userId: string) {
  return `res-${userId.replace(/[^a-zA-Z0-9]/g, "-")}`;
}

export interface ActiveCall {
  session: CallSession;
  state: CallState;
  friendId: string;
  friendDisplayName: string;
}

interface CallContextValue {
  activeCall: ActiveCall | null;
  peerReady: boolean;
  startCall(friendId: string, friendDisplayName: string): Promise<void>;
  acceptCall(callId: string): Promise<void>;
  declineCall(callId: string): Promise<void>;
  endCall(): Promise<void>;
}

const CallContext = createContext<CallContextValue | null>(null);

export function CallProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const voice = useVoice();
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
  const [peerReady, setPeerReady] = useState(false);

  const peerRef = useRef<Peer | null>(null);
  const connectionRef = useRef<MediaConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const ringTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callAnsweredRef = useRef(false);

  function clearRingTimer() {
    if (ringTimerRef.current) clearTimeout(ringTimerRef.current);
    ringTimerRef.current = null;
  }

  function playRemoteStream(stream: MediaStream) {
    if (!remoteAudioRef.current) {
      const el = new Audio();
      el.autoplay = true;
      remoteAudioRef.current = el;
      voice.registerRemoteAudio(el);
    }
    remoteAudioRef.current.srcObject = stream;
  }

  function stopRemoteAudio() {
    if (remoteAudioRef.current) {
      voice.unregisterRemoteAudio(remoteAudioRef.current);
      remoteAudioRef.current.srcObject = null;
      remoteAudioRef.current = null;
    }
  }

  // Re-apply output sink whenever the user selects a different output device
  useEffect(() => {
    const el = remoteAudioRef.current;
    if (!el || !voice.outputSelectionSupported) return;
    const deviceId = voice.selectedOutputId ?? "default";
    (el as HTMLAudioElement & { setSinkId(id: string): Promise<void> })
      .setSinkId(deviceId)
      .catch(() => {});
  }, [voice.selectedOutputId, voice.outputSelectionSupported]);

  async function getLocalStream(): Promise<MediaStream> {
    if (localStreamRef.current) return localStreamRef.current;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;
      return stream;
    } catch {
      return new MediaStream();
    }
  }

  function stopLocalStream() {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
  }

  function teardown() {
    connectionRef.current?.close();
    connectionRef.current = null;
    stopLocalStream();
    stopRemoteAudio();
    clearRingTimer();
    callAnsweredRef.current = false;
  }

  function wireConnectionEvents(conn: MediaConnection, onStream: (s: MediaStream) => void) {
    conn.on("stream", (remoteStream) => {
      callAnsweredRef.current = true;
      playRemoteStream(remoteStream);
      onStream(remoteStream);
    });

    conn.on("close", () => {
      setActiveCall(prev => {
        if (!prev || prev.state === "ended" || prev.state === "declined") return null;
        return { ...prev, state: "ended", session: { ...prev.session, status: "ended", endedAt: new Date().toISOString() } };
      });
      teardown();
      setTimeout(() => setActiveCall(null), 1500);
    });

    conn.on("error", () => {
      setActiveCall(prev => prev ? { ...prev, state: "failed" } : null);
      teardown();
      setTimeout(() => setActiveCall(null), 2000);
    });
  }

  // Create PeerJS instance when the user authenticates
  useEffect(() => {
    if (!profile) return;

    let unmounted = false;
    let retries = 0;

    function attachHandlers(peer: Peer, profileId: string) {
      peer.on("open", () => {
        retries = 0;
        if (!unmounted) setPeerReady(true);
      });

      peer.on("error", err => {
        // "unavailable-id" means the previous session's peer ID hasn't expired yet.
        // Wait 2 s for the broker to detect the stale connection, then retry.
        if (err.type === "unavailable-id" && retries < 4 && !unmounted) {
          retries++;
          peer.destroy();
          setTimeout(() => {
            if (unmounted) return;
            const next = new Peer(toPeerId(profileId), { secure: true });
            peerRef.current = next;
            attachHandlers(next, profileId);
          }, 2000);
          return;
        }
        if (err.type !== "peer-unavailable" && !unmounted) setPeerReady(false);
      });

      peer.on("disconnected", () => {
        if (!unmounted) setPeerReady(false);
        if (!peer.destroyed && !unmounted) peer.reconnect();
      });

      peer.on("call", (incomingConn) => {
        if (unmounted) return;
        const meta = (incomingConn.metadata ?? {}) as Record<string, string>;
        const callerId = meta.callerId ?? incomingConn.peer;
        const callerName = meta.callerName ?? "Unknown";
        const callId = meta.callId ?? `call_inc_${Date.now()}`;

        connectionRef.current = incomingConn;

        const session: CallSession = {
          id: callId,
          initiatorId: callerId,
          participantIds: [callerId, profileId],
          type: "direct",
          status: "ringing",
          startedAt: new Date().toISOString(),
        };

        setActiveCall({ session, state: "incoming-ringing", friendId: callerId, friendDisplayName: callerName });

        ringTimerRef.current = setTimeout(() => {
          incomingConn.close();
          teardown();
          setActiveCall(prev => prev ? { ...prev, state: "missed" } : null);
          setTimeout(() => setActiveCall(null), 2000);
        }, 30_000);
      });
    }

    const peer = new Peer(toPeerId(profile.id), { secure: true });
    peerRef.current = peer;
    attachHandlers(peer, profile.id);

    return () => {
      unmounted = true;
      setPeerReady(false);
      peerRef.current?.destroy();
      peerRef.current = null;
      teardown();
    };
  }, [profile?.id]);

  const startCall = useCallback(async (friendId: string, friendDisplayName: string) => {
    if (!peerRef.current || !profile) return;

    const localStream = await getLocalStream();
    const callId = `call_${Date.now()}`;

    const conn = peerRef.current.call(toPeerId(friendId), localStream, {
      metadata: { callerId: profile.id, callerName: profile.displayName, callId },
    });

    connectionRef.current = conn;
    callAnsweredRef.current = false;

    const session: CallSession = {
      id: callId,
      initiatorId: profile.id,
      participantIds: [profile.id, friendId],
      type: "direct",
      status: "ringing",
      startedAt: new Date().toISOString(),
    };

    setActiveCall({ session, state: "outgoing-ringing", friendId, friendDisplayName });

    wireConnectionEvents(conn, () => {
      clearRingTimer();
      setActiveCall(prev => prev ? {
        ...prev,
        state: "connected",
        session: { ...prev.session, status: "connected", connectedAt: new Date().toISOString() },
      } : null);
    });

    // No answer after 30 s → missed
    ringTimerRef.current = setTimeout(() => {
      if (!callAnsweredRef.current) {
        conn.close();
        teardown();
        setActiveCall(prev => prev ? { ...prev, state: "missed" } : null);
        setTimeout(() => setActiveCall(null), 2000);
      }
    }, 30_000);
  }, [profile]);

  const acceptCall = useCallback(async (_callId: string) => {
    const conn = connectionRef.current;
    if (!conn) return;
    clearRingTimer();
    setActiveCall(prev => prev ? { ...prev, state: "connecting" } : null);

    const localStream = await getLocalStream();
    conn.answer(localStream);

    wireConnectionEvents(conn, () => {
      setActiveCall(prev => prev ? {
        ...prev,
        state: "connected",
        session: { ...prev.session, status: "connected", connectedAt: new Date().toISOString() },
      } : null);
    });
  }, []);

  const declineCall = useCallback(async (_callId: string) => {
    connectionRef.current?.close();
    teardown();
    setActiveCall(prev => prev ? { ...prev, state: "declined" } : null);
    setTimeout(() => setActiveCall(null), 1500);
  }, []);

  const endCall = useCallback(async () => {
    connectionRef.current?.close();
    teardown();
    setActiveCall(prev => prev ? {
      ...prev,
      state: "ended",
      session: { ...prev.session, status: "ended", endedAt: new Date().toISOString() },
    } : null);
    setTimeout(() => setActiveCall(null), 1500);
  }, []);

  return (
    <CallContext.Provider value={{ activeCall, peerReady, startCall, acceptCall, declineCall, endCall }}>
      {children}
    </CallContext.Provider>
  );
}

export function useCall(): CallContextValue {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error("useCall must be used within CallProvider");
  return ctx;
}
