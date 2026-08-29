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
import {
  ConnectionQuality as LiveKitConnectionQuality,
  Room,
  RoomEvent,
  Track,
  type Participant,
  type RemoteTrack,
} from "livekit-client";
import type {
  ConnectionQuality,
  VoiceConnectionState,
  VoiceParticipant,
  VoiceRoomController,
  VoiceSessionKind,
} from "../../types";
import { useAuth } from "../auth/auth-context";
import { apiFetch } from "../../lib/supabase";

const VoiceContext = createContext<VoiceRoomController | null>(null);

const supportsOutputSink =
  typeof HTMLMediaElement !== "undefined" &&
  "setSinkId" in HTMLMediaElement.prototype;

const FALLBACK_MIC: MediaDeviceInfo = {
  deviceId: "default",
  groupId: "default",
  kind: "audioinput",
  label: "Default Microphone",
  toJSON: () => ({}),
};

const FALLBACK_OUT: MediaDeviceInfo = {
  deviceId: "default",
  groupId: "default",
  kind: "audiooutput",
  label: "System Default",
  toJSON: () => ({}),
};

type VoiceTokenResponse = {
  token: string;
  serverUrl: string;
  roomName: string;
};

type ParticipantMetadata = {
  username?: string;
  avatarUrl?: string | null;
};

function parseMetadata(value?: string): ParticipantMetadata {
  if (!value) return {};
  try {
    return JSON.parse(value) as ParticipantMetadata;
  } catch {
    return {};
  }
}

function mapConnectionQuality(value: LiveKitConnectionQuality): ConnectionQuality {
  if (value === LiveKitConnectionQuality.Excellent) return "excellent";
  if (value === LiveKitConnectionQuality.Good) return "good";
  if (value === LiveKitConnectionQuality.Poor) return "poor";
  return "unknown";
}

function readableMediaError(error: unknown) {
  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError") {
      return "Microphone access is blocked. Allow microphone access in your browser settings and try again.";
    }
    if (error.name === "NotFoundError") return "No microphone was found.";
    if (error.name === "NotReadableError") {
      return "The microphone is unavailable or already in use by another application.";
    }
  }
  if (error instanceof Error && error.message) return error.message;
  return "Voice audio could not be started.";
}

async function enumerateAudioDevices() {
  if (!navigator.mediaDevices?.enumerateDevices) {
    return { inputs: [FALLBACK_MIC], outputs: [FALLBACK_OUT] };
  }

  try {
    const all = await navigator.mediaDevices.enumerateDevices();
    const inputs = all.filter((d) => d.kind === "audioinput");
    const outputs = all.filter((d) => d.kind === "audiooutput");
    return {
      inputs: inputs.length ? inputs : [FALLBACK_MIC],
      outputs: outputs.length ? outputs : [FALLBACK_OUT],
    };
  } catch {
    return { inputs: [FALLBACK_MIC], outputs: [FALLBACK_OUT] };
  }
}

export function VoiceProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const [state, setState] = useState<VoiceConnectionState>("idle");
  const [sessionKind, setSessionKind] = useState<VoiceSessionKind | undefined>();
  const [roomId, setRoomId] = useState<string | undefined>();
  const [communityId, setCommunityId] = useState<string | undefined>();
  const [directCallId, setDirectCallId] = useState<string | undefined>();
  const [participants, setParticipants] = useState<VoiceParticipant[]>([]);
  const [selectedMicrophoneId, setSelectedMicrophoneId] = useState(
    () => localStorage.getItem("resonance_preferred_mic") ?? "default",
  );
  const [selectedOutputId, setSelectedOutputId] = useState(
    () => localStorage.getItem("resonance_preferred_output") ?? "default",
  );
  const [latencyMs, setLatencyMs] = useState<number | undefined>();
  const [microphoneDevices, setMicrophoneDevices] = useState<MediaDeviceInfo[]>([FALLBACK_MIC]);
  const [outputDevices, setOutputDevices] = useState<MediaDeviceInfo[]>([FALLBACK_OUT]);
  const [activeInputStream, setActiveInputStream] = useState<MediaStream | null>(null);
  const [audioPlaybackBlocked, setAudioPlaybackBlocked] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const roomRef = useRef<Room | null>(null);
  const currentRoomIdentityRef = useRef<string | undefined>(undefined);
  const audioContainerRef = useRef<HTMLDivElement | null>(null);
  const deafenedRef = useRef(false);
  const intentionalDisconnectRef = useRef(false);
  const externalAudioEls = useRef<Set<HTMLAudioElement>>(new Set());

  const refreshDevices = useCallback(async () => {
    const { inputs, outputs } = await enumerateAudioDevices();
    setMicrophoneDevices(inputs);
    setOutputDevices(outputs);
  }, []);

  useEffect(() => {
    void refreshDevices();
    if (!navigator.mediaDevices) return;
    navigator.mediaDevices.addEventListener("devicechange", refreshDevices);
    return () => navigator.mediaDevices.removeEventListener("devicechange", refreshDevices);
  }, [refreshDevices]);

  useEffect(() => {
    if (selectedMicrophoneId === "default") return;
    if (microphoneDevices.some((device) => device.deviceId === selectedMicrophoneId)) return;
    setSelectedMicrophoneId("default");
    localStorage.setItem("resonance_preferred_mic", "default");
    const room = roomRef.current;
    if (room) {
      void room.switchActiveDevice("audioinput", "default").catch(() => false);
      setError("Your previous microphone is no longer available. Using the system default microphone.");
    }
  }, [microphoneDevices, selectedMicrophoneId]);

  useEffect(() => {
    if (selectedOutputId === "default") return;
    if (outputDevices.some((device) => device.deviceId === selectedOutputId)) return;
    setSelectedOutputId("default");
    localStorage.setItem("resonance_preferred_output", "default");
    const room = roomRef.current;
    if (room && supportsOutputSink) {
      void room.switchActiveDevice("audiooutput", "default").catch(() => false);
      setError("Your previous audio output is no longer available. Using the system default output.");
    }
  }, [outputDevices, selectedOutputId]);

  const updateActiveInputStream = useCallback((room: Room | null) => {
    if (!room) {
      setActiveInputStream(null);
      return;
    }
    const publication = room.localParticipant.getTrackPublication(Track.Source.Microphone);
    const mediaTrack = publication?.track?.mediaStreamTrack;
    setActiveInputStream(mediaTrack ? new MediaStream([mediaTrack]) : null);
  }, []);

  const syncParticipants = useCallback((room: Room | null) => {
    if (!room) {
      setParticipants([]);
      return;
    }

    const logicalRoomId = currentRoomIdentityRef.current ?? room.name;
    const all: Participant[] = [
      room.localParticipant,
      ...Array.from(room.remoteParticipants.values()),
    ];

    setParticipants(
      all.map((participant) => {
        const metadata = parseMetadata(participant.metadata);
        const micPublication = participant.getTrackPublication(Track.Source.Microphone);
        const isLocal = participant === room.localParticipant;

        return {
          userId: participant.identity,
          roomId: logicalRoomId,
          displayName: participant.name || (isLocal ? profile?.displayName : undefined),
          username: metadata.username,
          avatarUrl: metadata.avatarUrl ?? undefined,
          audioLevel: Math.round((participant.audioLevel ?? 0) * 100),
          isLocal,
          isSpeaking: participant.isSpeaking,
          isMuted: !micPublication || micPublication.isMuted,
          isDeafened: isLocal ? deafenedRef.current : false,
          isServerMuted: false,
          hasRaisedHand: false,
          isModerator: false,
          isOwner: false,
          connectionQuality: mapConnectionQuality(participant.connectionQuality),
          volume: 100,
          isAFK: false,
          screenShareActive: Boolean(participant.getTrackPublication(Track.Source.ScreenShare)),
        } satisfies VoiceParticipant;
      }),
    );
  }, [profile?.displayName]);

  const detachRemoteAudio = useCallback((track: RemoteTrack) => {
    for (const element of track.detach()) element.remove();
  }, []);

  const attachRemoteAudio = useCallback((track: RemoteTrack) => {
    if (track.kind !== Track.Kind.Audio) return;
    const element = track.attach();
    if (element instanceof HTMLAudioElement) {
      element.autoplay = true;
      element.muted = deafenedRef.current;
      element.dataset.resonanceRemoteAudio = "true";
    }
    audioContainerRef.current?.appendChild(element);
  }, []);

  const teardownRoom = useCallback(async () => {
    const room = roomRef.current;
    roomRef.current = null;
    currentRoomIdentityRef.current = undefined;
    if (room) {
      room.removeAllListeners();
      await room.disconnect(true).catch(() => undefined);
    }
    if (audioContainerRef.current) audioContainerRef.current.replaceChildren();
    setParticipants([]);
    setActiveInputStream(null);
    setAudioPlaybackBlocked(false);
    setLatencyMs(undefined);
  }, []);

  const connect = useCallback(async (
    kind: VoiceSessionKind,
    identity: string,
    tokenBody: { kind: "community"; roomId: string } | { kind: "direct"; callId: string },
    cid?: string,
  ) => {
    if (!profile) throw new Error("Authentication required");
    if (!window.isSecureContext && window.location.hostname !== "localhost") {
      throw new Error("Voice chat requires HTTPS in production.");
    }

    intentionalDisconnectRef.current = true;
    await teardownRoom();
    intentionalDisconnectRef.current = false;

    setError(undefined);
    setState("connecting");
    setSessionKind(kind);
    setRoomId(kind === "community" ? identity : undefined);
    setCommunityId(kind === "community" ? cid : undefined);
    setDirectCallId(kind === "direct" ? identity : undefined);
    currentRoomIdentityRef.current = identity;

    try {
      const credentials = await apiFetch<VoiceTokenResponse>("/voice/token", {
        method: "POST",
        body: JSON.stringify(tokenBody),
      });

      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
        audioCaptureDefaults: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      roomRef.current = room;

      const resync = () => syncParticipants(room);
      room
        .on(RoomEvent.ParticipantConnected, resync)
        .on(RoomEvent.ParticipantDisconnected, resync)
        .on(RoomEvent.ActiveSpeakersChanged, resync)
        .on(RoomEvent.TrackMuted, resync)
        .on(RoomEvent.TrackUnmuted, resync)
        .on(RoomEvent.ConnectionQualityChanged, resync)
        .on(RoomEvent.LocalTrackPublished, () => {
          updateActiveInputStream(room);
          resync();
        })
        .on(RoomEvent.LocalTrackUnpublished, () => {
          updateActiveInputStream(room);
          resync();
        })
        .on(RoomEvent.TrackSubscribed, (track) => {
          attachRemoteAudio(track);
          resync();
        })
        .on(RoomEvent.TrackUnsubscribed, (track) => {
          detachRemoteAudio(track);
          resync();
        })
        .on(RoomEvent.MediaDevicesChanged, () => void refreshDevices())
        .on(RoomEvent.MediaDevicesError, (mediaError) => {
          setError(readableMediaError(mediaError));
          void refreshDevices();
        })
        .on(RoomEvent.AudioPlaybackStatusChanged, () => {
          setAudioPlaybackBlocked(!room.canPlaybackAudio);
        })
        .on(RoomEvent.Reconnecting, () => setState("reconnecting"))
        .on(RoomEvent.Reconnected, () => setState("connected"))
        .on(RoomEvent.Disconnected, () => {
          if (!intentionalDisconnectRef.current) setState("disconnected");
          setParticipants([]);
          setActiveInputStream(null);
        });

      await room.connect(credentials.serverUrl, credentials.token, { autoSubscribe: true });

      if (selectedMicrophoneId !== "default") {
        await room.switchActiveDevice("audioinput", selectedMicrophoneId).catch(() => false);
      }
      if (supportsOutputSink && selectedOutputId !== "default") {
        await room.switchActiveDevice("audiooutput", selectedOutputId).catch(() => false);
      }

      try {
        await room.localParticipant.setMicrophoneEnabled(true);
      } catch (mediaError) {
        // Listen-only mode is valid. Keep the room connected and surface the mic issue.
        setError(readableMediaError(mediaError));
      }

      updateActiveInputStream(room);
      await refreshDevices();
      syncParticipants(room);
      setAudioPlaybackBlocked(!room.canPlaybackAudio);
      setLatencyMs(undefined);
      setState("connected");

      // joinRoom/acceptCall originate from a click. This opportunistically satisfies
      // browser autoplay policy; the UI still exposes enableAudio if it is blocked.
      await room.startAudio().catch(() => setAudioPlaybackBlocked(true));
    } catch (connectError) {
      await teardownRoom();
      setState("failed");
      setError(readableMediaError(connectError));
      throw connectError;
    }
  }, [
    profile,
    teardownRoom,
    selectedMicrophoneId,
    selectedOutputId,
    refreshDevices,
    syncParticipants,
    updateActiveInputStream,
    attachRemoteAudio,
    detachRemoteAudio,
  ]);

  const joinRoom = useCallback(async (rid: string, cid?: string) => {
    await connect("community", rid, { kind: "community", roomId: rid }, cid);
  }, [connect]);

  const joinDirectCall = useCallback(async (callId: string) => {
    await connect("direct", callId, { kind: "direct", callId });
  }, [connect]);

  const leaveRoom = useCallback(async () => {
    if (state === "idle") return;
    setState("disconnecting");
    intentionalDisconnectRef.current = true;
    await teardownRoom();
    intentionalDisconnectRef.current = false;
    setSessionKind(undefined);
    setRoomId(undefined);
    setCommunityId(undefined);
    setDirectCallId(undefined);
    setError(undefined);
    setState("idle");
  }, [state, teardownRoom]);

  const setMuted = useCallback(async (value: boolean) => {
    const room = roomRef.current;
    if (!room) return;
    try {
      if (!value && selectedMicrophoneId !== "default") {
        await room.switchActiveDevice("audioinput", selectedMicrophoneId).catch(() => false);
      }
      await room.localParticipant.setMicrophoneEnabled(!value);
      updateActiveInputStream(room);
      syncParticipants(room);
    } catch (mediaError) {
      setError(readableMediaError(mediaError));
      throw mediaError;
    }
  }, [selectedMicrophoneId, syncParticipants, updateActiveInputStream]);

  const setDeafened = useCallback(async (value: boolean) => {
    deafenedRef.current = value;
    if (audioContainerRef.current) {
      audioContainerRef.current.querySelectorAll("audio").forEach((element) => {
        element.muted = value;
      });
    }
    externalAudioEls.current.forEach((element) => { element.muted = value; });
    syncParticipants(roomRef.current);
  }, [syncParticipants]);

  const selectMicrophone = useCallback(async (deviceId: string) => {
    const room = roomRef.current;
    if (room) {
      const switched = await room.switchActiveDevice("audioinput", deviceId).catch(() => false);
      if (!switched && deviceId !== "default") {
        throw new Error("The selected microphone could not be activated.");
      }
    }
    setSelectedMicrophoneId(deviceId);
    localStorage.setItem("resonance_preferred_mic", deviceId);
    if (room) {
      updateActiveInputStream(room);
      syncParticipants(room);
    }
  }, [syncParticipants, updateActiveInputStream]);

  const selectOutput = useCallback(async (deviceId: string) => {
    if (!supportsOutputSink) return;
    const room = roomRef.current;
    if (room) {
      const switched = await room.switchActiveDevice("audiooutput", deviceId).catch(() => false);
      if (!switched && deviceId !== "default") {
        throw new Error("The selected audio output could not be activated.");
      }
    }
    setSelectedOutputId(deviceId);
    localStorage.setItem("resonance_preferred_output", deviceId);
  }, []);

  const enableAudio = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;
    await room.startAudio();
    setAudioPlaybackBlocked(!room.canPlaybackAudio);
  }, []);

  const registerRemoteAudio = useCallback((element: HTMLAudioElement) => {
    externalAudioEls.current.add(element);
    element.muted = deafenedRef.current;
  }, []);

  const unregisterRemoteAudio = useCallback((element: HTMLAudioElement) => {
    externalAudioEls.current.delete(element);
  }, []);

  const raiseHand = useCallback(async (value: boolean) => {
    // Raised-hand sync will move to participant attributes in the UI modernization
    // phase. Keep local state useful without faking remote state.
    setParticipants((current) => current.map((participant) =>
      participant.isLocal ? { ...participant, hasRaisedHand: value } : participant,
    ));
  }, []);

  useEffect(() => () => {
    intentionalDisconnectRef.current = true;
    void teardownRoom();
  }, [teardownRoom]);

  const localParticipant = participants.find((participant) => participant.isLocal);

  const controller = useMemo<VoiceRoomController>(() => ({
    state,
    sessionKind,
    roomId,
    communityId,
    directCallId,
    participants,
    localParticipant,
    microphoneDevices,
    outputDevices,
    selectedMicrophoneId,
    selectedOutputId,
    latencyMs,
    activeInputStream,
    outputSelectionSupported: supportsOutputSink,
    audioPlaybackBlocked,
    error,
    joinRoom,
    joinDirectCall,
    leaveRoom,
    enableAudio,
    setMuted,
    setDeafened,
    selectMicrophone,
    selectOutput,
    raiseHand,
    refreshDevices,
    registerRemoteAudio,
    unregisterRemoteAudio,
  }), [
    state,
    sessionKind,
    roomId,
    communityId,
    directCallId,
    participants,
    localParticipant,
    microphoneDevices,
    outputDevices,
    selectedMicrophoneId,
    selectedOutputId,
    latencyMs,
    activeInputStream,
    audioPlaybackBlocked,
    error,
    joinRoom,
    joinDirectCall,
    leaveRoom,
    enableAudio,
    setMuted,
    setDeafened,
    selectMicrophone,
    selectOutput,
    raiseHand,
    refreshDevices,
    registerRemoteAudio,
    unregisterRemoteAudio,
  ]);

  return (
    <VoiceContext.Provider value={controller}>
      {children}
      <div ref={audioContainerRef} className="hidden" aria-hidden="true" />
    </VoiceContext.Provider>
  );
}

export function useVoice(): VoiceRoomController {
  const context = useContext(VoiceContext);
  if (!context) throw new Error("useVoice must be used within VoiceProvider");
  return context;
}
