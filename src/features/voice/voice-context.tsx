import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { VoiceRoomController, VoiceParticipant, VoiceConnectionState } from "../../types";
import { LOCAL_USER_ID } from "../../data/mock";
import { useAuth } from "../auth/auth-context";

const VoiceContext = createContext<VoiceRoomController | null>(null);

const supportsOutputSink =
  typeof HTMLAudioElement !== "undefined" &&
  "setSinkId" in HTMLAudioElement.prototype;

const FALLBACK_MIC: MediaDeviceInfo = {
  deviceId: "default", groupId: "default", kind: "audioinput",
  label: "Default Microphone", toJSON: () => ({}),
};
const FALLBACK_OUT: MediaDeviceInfo = {
  deviceId: "default", groupId: "default", kind: "audiooutput",
  label: "Default Speaker", toJSON: () => ({}),
};

async function enumerateAudioDevices() {
  try {
    const all = await navigator.mediaDevices.enumerateDevices();
    return {
      inputs: all.filter(d => d.kind === "audioinput"),
      outputs: all.filter(d => d.kind === "audiooutput"),
    };
  } catch {
    return { inputs: [FALLBACK_MIC], outputs: [FALLBACK_OUT] };
  }
}

async function applySinkId(el: HTMLAudioElement, deviceId: string) {
  if (!supportsOutputSink) return;
  try {
    await (el as HTMLAudioElement & { setSinkId(id: string): Promise<void> }).setSinkId(deviceId);
  } catch {
    // setSinkId can throw NotAllowedError or NotFoundError; fall back to system default silently
  }
}

export function VoiceProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const [state, setState] = useState<VoiceConnectionState>("idle");
  const [roomId, setRoomId] = useState<string | undefined>();
  const [communityId, setCommunityId] = useState<string | undefined>();
  const [participants, setParticipants] = useState<VoiceParticipant[]>([]);
  const [selectedMicrophoneId, setSelectedMicrophoneId] = useState<string>("default");
  const [selectedOutputId, setSelectedOutputId] = useState<string>("default");
  const [latencyMs, setLatencyMs] = useState<number | undefined>();
  const [microphoneDevices, setMicrophoneDevices] = useState<MediaDeviceInfo[]>([FALLBACK_MIC]);
  const [outputDevices, setOutputDevices] = useState<MediaDeviceInfo[]>([FALLBACK_OUT]);
  const [activeInputStream, setActiveInputStream] = useState<MediaStream | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const remoteAudioEls = useRef<Set<HTMLAudioElement>>(new Set());
  const localUserId = profile?.id ?? LOCAL_USER_ID;

  const refreshDevices = useCallback(async () => {
    const { inputs, outputs } = await enumerateAudioDevices();
    if (inputs.length > 0) setMicrophoneDevices(inputs);
    if (outputs.length > 0) setOutputDevices(outputs);
  }, []);

  useEffect(() => {
    refreshDevices();
    if (!navigator.mediaDevices) return;
    navigator.mediaDevices.addEventListener("devicechange", refreshDevices);
    return () => navigator.mediaDevices.removeEventListener("devicechange", refreshDevices);
  }, [refreshDevices]);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
      setActiveInputStream(null);
    }
  }, []);

  const joinRoom = useCallback(async (rid: string, cid?: string) => {
    // Require secure context for microphone access in production
    if (!window.isSecureContext && window.location.hostname !== "localhost") {
      console.warn("[voice] Microphone requires a secure context (HTTPS).");
    }

    setState("connecting");

    // Request permission first, then enumerate (so device labels are available)
    try {
      stopStream();
      const constraints: MediaStreamConstraints = {
        audio: selectedMicrophoneId !== "default"
          ? { deviceId: { exact: selectedMicrophoneId } }
          : true,
      };

      if (!navigator.mediaDevices) throw new Error("MediaDevices API unavailable");

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      setActiveInputStream(stream);

      // Labels are now readable after permission is granted
      const { inputs, outputs } = await enumerateAudioDevices();
      if (inputs.length > 0) setMicrophoneDevices(inputs);
      if (outputs.length > 0) setOutputDevices(outputs);
    } catch {
      // No mic — listen-only mode; audio from remote participants still works
    }

    await new Promise(r => setTimeout(r, 600));

    const localPart: VoiceParticipant = {
      userId: localUserId,
      roomId: rid,
      isLocal: true,
      isSpeaking: false,
      isMuted: false,
      isDeafened: false,
      isServerMuted: false,
      hasRaisedHand: false,
      isModerator: false,
      isOwner: false,
      connectionQuality: "excellent",
      volume: 100,
      isAFK: false,
      screenShareActive: false,
    };

    setParticipants([localPart]);
    setRoomId(rid);
    setCommunityId(cid);
    setLatencyMs(undefined); // latency is not measurable without a real transport
    setState("connected");
  }, [localUserId, selectedMicrophoneId, stopStream]);

  const leaveRoom = useCallback(async () => {
    setState("disconnecting");
    stopStream();
    await new Promise(r => setTimeout(r, 200));
    setParticipants([]);
    setRoomId(undefined);
    setCommunityId(undefined);
    setLatencyMs(undefined);
    setState("idle");
  }, [stopStream]);

  const setMuted = useCallback(async (value: boolean) => {
    // Mute the actual MediaStream track so audio is not transmitted
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach(t => { t.enabled = !value; });
    }
    setParticipants(prev => prev.map(p =>
      p.isLocal ? { ...p, isMuted: value, isSpeaking: value ? false : p.isSpeaking } : p
    ));
  }, []);

  const setDeafened = useCallback(async (value: boolean) => {
    setParticipants(prev => prev.map(p =>
      p.isLocal ? { ...p, isDeafened: value } : p
    ));
  }, []);

  const selectMicrophone = useCallback(async (deviceId: string) => {
    setSelectedMicrophoneId(deviceId);
    if (streamRef.current) {
      // Hot-swap: stop existing tracks, acquire new device
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
      setActiveInputStream(null);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: deviceId !== "default" ? { deviceId: { exact: deviceId } } : true,
        });
        streamRef.current = stream;
        setActiveInputStream(stream);
        // Re-apply mute state to the new track
        setParticipants(prev => {
          const local = prev.find(p => p.isLocal);
          if (local?.isMuted) stream.getAudioTracks().forEach(t => { t.enabled = false; });
          return prev;
        });
      } catch {
        streamRef.current = null;
      }
    }
  }, []);

  const selectOutput = useCallback(async (deviceId: string) => {
    setSelectedOutputId(deviceId);
    if (!supportsOutputSink) return;
    // Apply new sink to every registered remote audio element
    const tasks = Array.from(remoteAudioEls.current).map(el => applySinkId(el, deviceId));
    await Promise.all(tasks);
  }, []);

  const registerRemoteAudio = useCallback((el: HTMLAudioElement) => {
    remoteAudioEls.current.add(el);
    // Apply current output preference immediately
    if (supportsOutputSink && selectedOutputId !== "default") {
      applySinkId(el, selectedOutputId);
    }
  }, [selectedOutputId]);

  const unregisterRemoteAudio = useCallback((el: HTMLAudioElement) => {
    remoteAudioEls.current.delete(el);
  }, []);

  const raiseHand = useCallback(async (value: boolean) => {
    setParticipants(prev => prev.map(p =>
      p.isLocal ? { ...p, hasRaisedHand: value } : p
    ));
  }, []);

  useEffect(() => () => { stopStream(); }, [stopStream]);

  const localParticipant = participants.find(p => p.isLocal);

  const ctrl: VoiceRoomController = {
    state,
    roomId,
    communityId,
    participants,
    localParticipant,
    microphoneDevices,
    outputDevices,
    selectedMicrophoneId,
    selectedOutputId,
    latencyMs,
    activeInputStream,
    outputSelectionSupported: supportsOutputSink,
    joinRoom,
    leaveRoom,
    setMuted,
    setDeafened,
    selectMicrophone,
    selectOutput,
    raiseHand,
    refreshDevices,
    registerRemoteAudio,
    unregisterRemoteAudio,
  };

  return <VoiceContext.Provider value={ctrl}>{children}</VoiceContext.Provider>;
}

export function useVoice(): VoiceRoomController {
  const ctx = useContext(VoiceContext);
  if (!ctx) throw new Error("useVoice must be used within VoiceProvider");
  return ctx;
}
