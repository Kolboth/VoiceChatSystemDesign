import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { CallSession, CallState } from "../../types";
import { useAuth } from "../auth/auth-context";
import { useVoice } from "../voice/voice-context";
import { supabase } from "../../lib/supabase";

export interface ActiveCall {
  session: CallSession;
  state: CallState;
  friendId: string;
  friendDisplayName: string;
}

interface CallContextValue {
  activeCall: ActiveCall | null;
  peerReady: boolean;
  isMuted: boolean;
  isDeafened: boolean;
  audioPlaybackBlocked: boolean;
  error: string | null;
  startCall(friendId: string, friendDisplayName: string): Promise<void>;
  acceptCall(callId: string): Promise<void>;
  declineCall(callId: string): Promise<void>;
  endCall(): Promise<void>;
  setMuted(value: boolean): Promise<void>;
  setDeafened(value: boolean): Promise<void>;
  enableAudio(): Promise<void>;
}

const CallContext = createContext<CallContextValue | null>(null);

type RawCallSession = {
  id: string;
  caller_id: string;
  callee_id: string;
  status: CallSession["status"];
  created_at: string;
  accepted_at?: string | null;
  connected_at?: string | null;
  ended_at?: string | null;
};

function toSession(row: RawCallSession): CallSession {
  return {
    id: row.id,
    initiatorId: row.caller_id,
    participantIds: [row.caller_id, row.callee_id],
    type: "direct",
    status: row.status,
    startedAt: row.created_at,
    connectedAt: row.connected_at ?? undefined,
    endedAt: row.ended_at ?? undefined,
  };
}

function callStateFromStatus(status: CallSession["status"]): CallState {
  if (status === "connected") return "connected";
  if (status === "declined") return "declined";
  if (status === "missed") return "missed";
  if (status === "cancelled") return "cancelled";
  if (status === "failed") return "failed";
  if (status === "ended") return "ended";
  return "connecting";
}

function errorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  return "The call could not be completed.";
}

export function CallProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const voice = useVoice();
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
  const activeCallRef = useRef<ActiveCall | null>(null);
  const [error, setError] = useState<string | null>(null);
  const ringTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const joiningCallRef = useRef<string | null>(null);
  const markedConnectedRef = useRef<string | null>(null);

  useEffect(() => {
    activeCallRef.current = activeCall;
  }, [activeCall]);

  const clearRingTimer = useCallback(() => {
    if (ringTimerRef.current) clearTimeout(ringTimerRef.current);
    ringTimerRef.current = null;
  }, []);

  const friendName = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", userId)
      .maybeSingle();
    return data?.display_name ?? "Friend";
  }, []);

  const closeOverlayAfter = useCallback((delay = 1600) => {
    window.setTimeout(() => {
      setActiveCall((current) => {
        if (!current) return null;
        if (["connected", "connecting", "incoming-ringing", "outgoing-ringing"].includes(current.state)) return current;
        return null;
      });
    }, delay);
  }, []);

  const connectAcceptedCall = useCallback(async (callId: string) => {
    if (joiningCallRef.current === callId) return;
    if (voice.sessionKind === "direct" && voice.directCallId === callId && voice.state === "connected") return;
    joiningCallRef.current = callId;

    try {
      setActiveCall((current) => current?.session.id === callId ? { ...current, state: "connecting" } : current);
      if (voice.state !== "idle" && !(voice.sessionKind === "direct" && voice.directCallId === callId)) {
        await voice.leaveRoom();
      }
      await voice.joinDirectCall(callId);
    } catch (joinError) {
      const message = errorMessage(joinError);
      setError(message);
      try {
        await supabase.rpc("finish_direct_call", { p_call_id: callId, p_status: "failed" });
      } catch {
        // Preserve the local failure state even if signalling cleanup also fails.
      }
      setActiveCall((current) => current?.session.id === callId
        ? { ...current, state: "failed", session: { ...current.session, status: "failed", endedAt: new Date().toISOString() } }
        : current);
      closeOverlayAfter(3000);
    } finally {
      joiningCallRef.current = null;
    }
  }, [voice, closeOverlayAfter]);

  const handleCallRow = useCallback(async (row: RawCallSession) => {
    if (!profile) return;
    if (row.caller_id !== profile.id && row.callee_id !== profile.id) return;

    const current = activeCallRef.current;
    const friendId = row.caller_id === profile.id ? row.callee_id : row.caller_id;
    const displayName = current?.session.id === row.id
      ? current.friendDisplayName
      : await friendName(friendId);
    const session = toSession(row);

    if (row.status === "ringing") {
      if (row.callee_id === profile.id && (!current || current.session.id === row.id)) {
        setError(null);
        setActiveCall({
          session,
          state: "incoming-ringing",
          friendId,
          friendDisplayName: displayName,
        });
        clearRingTimer();
        ringTimerRef.current = setTimeout(async () => {
          const active = activeCallRef.current;
          if (!active || active.session.id !== row.id || active.state !== "incoming-ringing") return;
          await supabase.rpc("finish_direct_call", { p_call_id: row.id, p_status: "missed" });
        }, 30_000);
      }
      return;
    }

    if (row.status === "accepted") {
      clearRingTimer();
      setActiveCall({
        session,
        state: "connecting",
        friendId,
        friendDisplayName: displayName,
      });
      void connectAcceptedCall(row.id);
      return;
    }

    if (row.status === "connected") {
      clearRingTimer();
      setActiveCall({
        session,
        state: voice.sessionKind === "direct" && voice.directCallId === row.id && voice.state === "connected" ? "connected" : "connecting",
        friendId,
        friendDisplayName: displayName,
      });
      if (!(voice.sessionKind === "direct" && voice.directCallId === row.id && voice.state === "connected")) {
        void connectAcceptedCall(row.id);
      }
      return;
    }

    const finalState = callStateFromStatus(row.status);
    if (["ended", "declined", "missed", "cancelled", "failed"].includes(finalState)) {
      clearRingTimer();
      if (voice.sessionKind === "direct" && voice.directCallId === row.id) {
        await voice.leaveRoom().catch(() => undefined);
      }
      setActiveCall({
        session,
        state: finalState,
        friendId,
        friendDisplayName: displayName,
      });
      closeOverlayAfter(row.status === "failed" ? 3000 : 1700);
    }
  }, [profile, friendName, clearRingTimer, connectAcceptedCall, voice, closeOverlayAfter]);

  useEffect(() => {
    if (!profile) return;
    let cancelled = false;

    const hydrate = async () => {
      const { data } = await supabase
        .from("call_sessions")
        .select("id, caller_id, callee_id, status, created_at, accepted_at, connected_at, ended_at")
        .or(`caller_id.eq.${profile.id},callee_id.eq.${profile.id}`)
        .in("status", ["ringing", "accepted", "connected"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!cancelled && data) await handleCallRow(data as RawCallSession);
    };
    void hydrate();

    const channel = supabase
      .channel(`calls:${profile.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "call_sessions" },
        (payload) => {
          const row = payload.new as RawCallSession | undefined;
          if (row?.id) void handleCallRow(row);
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      clearRingTimer();
      void supabase.removeChannel(channel);
    };
  }, [profile, handleCallRow, clearRingTimer]);

  useEffect(() => {
    const current = activeCallRef.current;
    if (!current) return;
    if (voice.sessionKind !== "direct" || voice.directCallId !== current.session.id) return;

    if (voice.state === "connected" && voice.participants.length >= 2 && markedConnectedRef.current !== current.session.id) {
      markedConnectedRef.current = current.session.id;
      void supabase.rpc("mark_direct_call_connected", { p_call_id: current.session.id });
    }

    if (voice.state === "reconnecting") {
      setActiveCall((value) => value ? { ...value, state: "reconnecting" } : value);
    } else if (voice.state === "connected") {
      setActiveCall((value) => value ? {
        ...value,
        state: "connected",
        session: {
          ...value.session,
          status: "connected",
          connectedAt: value.session.connectedAt ?? new Date().toISOString(),
        },
      } : value);
    } else if (voice.state === "failed") {
      setError(voice.error ?? "Voice connection failed.");
      setActiveCall((value) => value ? {
        ...value,
        state: "failed",
        session: { ...value.session, status: "failed", endedAt: new Date().toISOString() },
      } : value);
    }
  }, [voice.state, voice.sessionKind, voice.directCallId, voice.error, voice.participants.length]);

  const startCall = useCallback(async (friendId: string, friendDisplayName: string) => {
    if (!profile) return;
    if (activeCallRef.current) throw new Error("Another call is already active.");

    setError(null);
    markedConnectedRef.current = null;
    try {
      if (voice.state !== "idle") await voice.leaveRoom();

      const { data, error: rpcError } = await supabase.rpc("start_direct_call", {
        p_friend_id: friendId,
      });
      if (rpcError) throw rpcError;
      const callId = data as string;
      const now = new Date().toISOString();
      const session: CallSession = {
        id: callId,
        initiatorId: profile.id,
        participantIds: [profile.id, friendId],
        type: "direct",
        status: "ringing",
        startedAt: now,
      };
      setActiveCall({
        session,
        state: "outgoing-ringing",
        friendId,
        friendDisplayName,
      });

      clearRingTimer();
      ringTimerRef.current = setTimeout(async () => {
        const current = activeCallRef.current;
        if (!current || current.session.id !== callId || current.state !== "outgoing-ringing") return;
        await supabase.rpc("finish_direct_call", { p_call_id: callId, p_status: "missed" });
      }, 30_000);
    } catch (callError) {
      setError(errorMessage(callError));
      throw callError;
    }
  }, [profile, voice, clearRingTimer]);

  const acceptCall = useCallback(async (callId: string) => {
    const current = activeCallRef.current;
    if (!current || current.session.id !== callId) return;
    clearRingTimer();
    setError(null);
    setActiveCall((value) => value ? { ...value, state: "connecting" } : value);

    const { error: rpcError } = await supabase.rpc("respond_to_direct_call", {
      p_call_id: callId,
      p_accept: true,
    });
    if (rpcError) {
      setError(errorMessage(rpcError));
      setActiveCall((value) => value ? { ...value, state: "failed" } : value);
      return;
    }

    // Do not wait solely on the realtime round trip on the accepting client.
    await connectAcceptedCall(callId);
  }, [clearRingTimer, connectAcceptedCall]);

  const declineCall = useCallback(async (callId: string) => {
    clearRingTimer();
    const { error: rpcError } = await supabase.rpc("respond_to_direct_call", {
      p_call_id: callId,
      p_accept: false,
    });
    if (rpcError) setError(errorMessage(rpcError));
    setActiveCall((value) => value ? {
      ...value,
      state: "declined",
      session: { ...value.session, status: "declined", endedAt: new Date().toISOString() },
    } : value);
    closeOverlayAfter();
  }, [clearRingTimer, closeOverlayAfter]);

  const endCall = useCallback(async () => {
    const current = activeCallRef.current;
    if (!current) return;
    clearRingTimer();
    const finalStatus = current.state === "outgoing-ringing" ? "cancelled" : "ended";

    try {
      const { error: finishError } = await supabase.rpc("finish_direct_call", {
        p_call_id: current.session.id,
        p_status: finalStatus,
      });
      if (finishError) setError(errorMessage(finishError));
    } catch (rpcError) {
      setError(errorMessage(rpcError));
    }

    if (voice.sessionKind === "direct" && voice.directCallId === current.session.id) {
      await voice.leaveRoom().catch(() => undefined);
    }

    setActiveCall({
      ...current,
      state: finalStatus === "cancelled" ? "cancelled" : "ended",
      session: {
        ...current.session,
        status: finalStatus,
        endedAt: new Date().toISOString(),
      },
    });
    closeOverlayAfter();
  }, [voice, clearRingTimer, closeOverlayAfter]);

  const setMuted = useCallback(async (value: boolean) => {
    await voice.setMuted(value);
  }, [voice]);

  const setDeafened = useCallback(async (value: boolean) => {
    await voice.setDeafened(value);
  }, [voice]);

  const enableAudio = useCallback(async () => {
    await voice.enableAudio();
  }, [voice]);

  const isMuted = voice.sessionKind === "direct" ? (voice.localParticipant?.isMuted ?? true) : false;
  const isDeafened = voice.sessionKind === "direct" ? (voice.localParticipant?.isDeafened ?? false) : false;

  const value = useMemo<CallContextValue>(() => ({
    activeCall,
    // Kept as `peerReady` for component compatibility; it now means the
    // authenticated LiveKit/Supabase call service can be attempted.
    peerReady: Boolean(profile),
    isMuted,
    isDeafened,
    audioPlaybackBlocked: voice.sessionKind === "direct" ? voice.audioPlaybackBlocked : false,
    error: error ?? (voice.sessionKind === "direct" ? voice.error ?? null : null),
    startCall,
    acceptCall,
    declineCall,
    endCall,
    setMuted,
    setDeafened,
    enableAudio,
  }), [
    activeCall,
    profile,
    isMuted,
    isDeafened,
    voice.sessionKind,
    voice.audioPlaybackBlocked,
    voice.error,
    error,
    startCall,
    acceptCall,
    declineCall,
    endCall,
    setMuted,
    setDeafened,
    enableAudio,
  ]);

  return <CallContext.Provider value={value}>{children}</CallContext.Provider>;
}

export function useCall(): CallContextValue {
  const context = useContext(CallContext);
  if (!context) throw new Error("useCall must be used within CallProvider");
  return context;
}
