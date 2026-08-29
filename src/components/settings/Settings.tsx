import { useState, useEffect, useRef, useCallback } from "react";
import type { UserSettings, Theme } from "../../types";
import { useAuth } from "../../features/auth/auth-context";
import { useVoice } from "../../features/voice/voice-context";
import { Button, Input, Switch, Slider, Select, Separator, Textarea, AudioLevelMeter } from "../ui/primitives";

const DEFAULT_SETTINGS: UserSettings = {
  theme: "dark",
  density: "comfortable",
  reducedMotion: false,
  inputMode: "voice-activity",
  inputVolume: 80,
  outputVolume: 100,
  echoCancellation: true,
  noiseSuppression: true,
  automaticGain: true,
  joinSounds: true,
  leaveSounds: true,
  muteFocusLoss: false,
  friendRequestsFrom: "everyone",
  directCallsFrom: "friends",
  presenceVisibility: "friends",
};

function SettingRow({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-6 py-3">
      <div className="flex-1">
        <p className="text-[13px] font-medium text-[var(--text-primary)]">{label}</p>
        {description && <p className="text-[12px] text-[var(--text-tertiary)] mt-0.5">{description}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function SettingSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h3 className="text-[12px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-1">{title}</h3>
      <div className="divide-y divide-[var(--border-subtle)]">{children}</div>
    </div>
  );
}

function AccountSettings() {
  const { profile, updateProfile, signOut } = useAuth();
  const [displayName, setDisplayName] = useState(profile?.displayName ?? "");
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaving(true);
    await updateProfile({ displayName, bio });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div>
      <h2 className="text-[18px] font-semibold text-[var(--text-primary)] mb-6">Account</h2>
      <SettingSection title="Profile">
        <div className="py-4 flex flex-col gap-4">
          <Input label="Display name" value={displayName} onChange={e => setDisplayName(e.target.value)} />
          <Textarea label="Bio" value={bio} onChange={e => setBio(e.target.value)} rows={3} placeholder="Tell people a bit about yourself" />
          <div className="flex items-center justify-between">
            <Button variant="primary" size="sm" onClick={handleSave} loading={saving}>
              {saved ? "Saved" : "Save changes"}
            </Button>
          </div>
        </div>
      </SettingSection>
      <SettingSection title="Account info">
        <SettingRow label="Username" description={`@${profile?.username}`}>
          <Button variant="ghost" size="xs">Copy</Button>
        </SettingRow>
      </SettingSection>
      <SettingSection title="Session">
        <div className="py-3">
          <Button variant="destructive" size="sm" onClick={signOut}>Sign out</Button>
        </div>
      </SettingSection>
    </div>
  );
}

function VoiceAudioSettings() {
  const voice = useVoice();
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [audioLevel, setAudioLevel] = useState(0);
  const [permState, setPermState] = useState<"unknown" | "requesting" | "granted" | "denied">("unknown");

  // Local stream for the level meter when not in a voice room
  const localStreamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const animRef = useRef(0);

  const set = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) =>
    setSettings(s => ({ ...s, [key]: value }));

  const stopLevelMeter = useCallback(() => {
    cancelAnimationFrame(animRef.current);
    audioCtxRef.current?.close();
    audioCtxRef.current = null;
    setAudioLevel(0);
  }, []);

  const startLevelMeter = useCallback((stream: MediaStream) => {
    stopLevelMeter();
    try {
      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.75;
      ctx.createMediaStreamSource(stream).connect(analyser);
      audioCtxRef.current = ctx;
      const buf = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteFrequencyData(buf);
        const avg = buf.reduce((s, v) => s + v, 0) / buf.length;
        setAudioLevel(Math.min(100, Math.round((avg / 80) * 100)));
        animRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch {}
  }, [stopLevelMeter]);

  const stopLocalStream = useCallback(() => {
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;
  }, []);

  // Prefer the voice room's stream; fall back to the local settings stream
  useEffect(() => {
    const stream = voice.activeInputStream ?? localStreamRef.current;
    if (stream) {
      startLevelMeter(stream);
      return stopLevelMeter;
    }
    stopLevelMeter();
  }, [voice.activeInputStream, startLevelMeter, stopLevelMeter]);

  // Cleanup on unmount — stop meter and release any local stream we opened
  useEffect(() => () => {
    stopLevelMeter();
    stopLocalStream();
  }, [stopLevelMeter, stopLocalStream]);

  // Check existing permission state without prompting
  useEffect(() => {
    if (!navigator.permissions) return;
    navigator.permissions.query({ name: "microphone" as PermissionName })
      .then(result => {
        if (result.state === "granted") setPermState("granted");
        else if (result.state === "denied") setPermState("denied");
        result.onchange = () => {
          if (result.state === "granted") setPermState("granted");
          else if (result.state === "denied") setPermState("denied");
        };
      })
      .catch(() => {});
  }, []);

  async function requestMicPermission() {
    if (!navigator.mediaDevices) {
      setPermState("denied");
      return;
    }
    setPermState("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Keep this stream alive for level metering in settings
      stopLocalStream();
      localStreamRef.current = stream;
      setPermState("granted");
      // Re-enumerate now that labels are available
      await voice.refreshDevices();
      startLevelMeter(stream);
    } catch {
      setPermState("denied");
    }
  }

  async function handleMicChange(deviceId: string) {
    // Persist preference in voice-context
    await voice.selectMicrophone(deviceId);
    // If not in a room, swap the local settings stream too
    if (!voice.activeInputStream) {
      stopLevelMeter();
      stopLocalStream();
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: deviceId !== "default" ? { deviceId: { exact: deviceId } } : true,
        });
        localStreamRef.current = stream;
        startLevelMeter(stream);
      } catch {}
    }
  }

  async function testOutput() {
    const selectedId = voice.selectedOutputId ?? "default";
    try {
      const supportsCtxSink =
        typeof AudioContext !== "undefined" && "setSinkId" in AudioContext.prototype;
      const ctx = new AudioContext();
      if (supportsCtxSink && selectedId !== "default") {
        await (ctx as AudioContext & { setSinkId(id: string): Promise<void> }).setSinkId(selectedId);
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 440;
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      osc.start();
      osc.stop(ctx.currentTime + 0.6);
      osc.onended = () => ctx.close();
    } catch {}
  }

  // Devices have real labels once permission is granted and enumeration returns >1 entry or a named label
  const devicesAreReal = voice.microphoneDevices.some(d => d.label && d.label !== "Default Microphone");
  const needsPermission = !devicesAreReal && permState !== "denied";

  const micOptions = voice.microphoneDevices.map(d => ({ value: d.deviceId, label: d.label || "Microphone" }));
  const outputOptions = voice.outputDevices.map(d => ({ value: d.deviceId, label: d.label || "Speaker" }));

  return (
    <div>
      <h2 className="text-[18px] font-semibold text-[var(--text-primary)] mb-6">Voice & Audio</h2>

      {/* Permission banner */}
      {needsPermission && (
        <div className="mb-6 flex items-start gap-3 px-4 py-3 rounded-[var(--radius-md)] bg-[var(--accent)]/8 border border-[var(--accent)]/20">
          <svg className="text-[var(--accent)] shrink-0 mt-0.5" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
            <line x1="12" y1="19" x2="12" y2="23"/>
            <line x1="8" y1="23" x2="16" y2="23"/>
          </svg>
          <div className="flex-1">
            <p className="text-[13px] font-medium text-[var(--text-primary)] mb-1">Microphone access needed</p>
            <p className="text-[12px] text-[var(--text-secondary)] mb-3">Allow microphone access to see and select your actual input devices.</p>
            <Button variant="primary" size="sm" onClick={requestMicPermission} loading={permState === "requesting"}>
              Enable microphone
            </Button>
          </div>
        </div>
      )}

      {/* Denied banner */}
      {permState === "denied" && (
        <div className="mb-6 px-4 py-3 rounded-[var(--radius-md)] bg-[var(--danger)]/10 border border-[var(--danger)]/20">
          <p className="text-[13px] font-medium text-[var(--danger)] mb-1">Microphone access is blocked</p>
          <p className="text-[12px] text-[var(--danger)]/80">Allow microphone access in your browser settings, then reload.</p>
        </div>
      )}

      <SettingSection title="Input">
        <SettingRow label="Input device">
          <Select
            value={voice.selectedMicrophoneId ?? "default"}
            onChange={handleMicChange}
            options={micOptions}
            className="w-56"
          />
        </SettingRow>
        <SettingRow label="Input level">
          <AudioLevelMeter level={audioLevel} />
        </SettingRow>
        <div className="py-3">
          <Slider label="Input volume" value={settings.inputVolume} onChange={v => set("inputVolume", v)} />
        </div>
        <SettingRow label="Input mode">
          <div className="flex gap-2">
            {(["voice-activity", "push-to-talk"] as const).map(mode => (
              <button
                key={mode}
                onClick={() => set("inputMode", mode)}
                className={`px-3 py-1 text-[13px] rounded-[var(--radius-sm)] border transition-colors ${settings.inputMode === mode ? "border-[var(--accent)] text-[var(--accent)] bg-[var(--accent)]/10" : "border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]"}`}
              >
                {mode === "voice-activity" ? "Voice activity" : "Push to talk"}
              </button>
            ))}
          </div>
        </SettingRow>
      </SettingSection>

      <SettingSection title="Processing">
        <SettingRow label="Echo cancellation">
          <Switch checked={settings.echoCancellation} onChange={v => set("echoCancellation", v)} />
        </SettingRow>
        <SettingRow label="Noise suppression" description="Filters background noise from your microphone">
          <Switch checked={settings.noiseSuppression} onChange={v => set("noiseSuppression", v)} />
        </SettingRow>
        <SettingRow label="Automatic gain control">
          <Switch checked={settings.automaticGain} onChange={v => set("automaticGain", v)} />
        </SettingRow>
      </SettingSection>

      <SettingSection title="Output">
        <SettingRow label="Output device">
          {voice.outputSelectionSupported ? (
            <Select
              value={voice.selectedOutputId ?? "default"}
              onChange={voice.selectOutput}
              options={outputOptions}
              className="w-56"
            />
          ) : (
            <span className="text-[13px] text-[var(--text-tertiary)]">System default</span>
          )}
        </SettingRow>
        {!voice.outputSelectionSupported && (
          <p className="text-[12px] text-[var(--text-tertiary)] py-1">
            Output device selection is managed by your browser or system on this device.
          </p>
        )}
        <div className="py-3">
          <Slider label="Output volume" value={settings.outputVolume} onChange={v => set("outputVolume", v)} />
        </div>
        <div className="py-3">
          <Button variant="outline" size="sm" onClick={testOutput}>Test output</Button>
        </div>
      </SettingSection>

      <SettingSection title="Behavior">
        <SettingRow label="Join sounds">
          <Switch checked={settings.joinSounds} onChange={v => set("joinSounds", v)} />
        </SettingRow>
        <SettingRow label="Leave sounds">
          <Switch checked={settings.leaveSounds} onChange={v => set("leaveSounds", v)} />
        </SettingRow>
        <SettingRow label="Mute when app loses focus">
          <Switch checked={settings.muteFocusLoss} onChange={v => set("muteFocusLoss", v)} />
        </SettingRow>
      </SettingSection>

      {voice.state !== "idle" && (
        <SettingSection title="Diagnostics">
          <SettingRow label="Connection quality">
            <span className={`text-[13px] ${voice.localParticipant?.connectionQuality === "excellent" ? "text-[var(--success)]" : voice.localParticipant?.connectionQuality === "poor" ? "text-[var(--danger)]" : "text-[var(--text-secondary)]"}`}>
              {voice.localParticipant?.connectionQuality ?? "—"}
            </span>
          </SettingRow>
          {voice.latencyMs !== undefined && (
            <SettingRow label="Latency">
              <span className="text-[13px] tabular-nums text-[var(--text-primary)]">{voice.latencyMs} ms</span>
            </SettingRow>
          )}
        </SettingSection>
      )}
    </div>
  );
}

function AppearanceSettings({ theme, onThemeChange }: { theme: Theme; onThemeChange: (t: Theme) => void }) {
  const [density, setDensity] = useState<"comfortable" | "compact">("comfortable");
  const [reducedMotion, setReducedMotion] = useState(false);

  return (
    <div>
      <h2 className="text-[18px] font-semibold text-[var(--text-primary)] mb-6">Appearance</h2>
      <SettingSection title="Theme">
        <div className="py-3 flex gap-2">
          {(["dark", "light", "system"] as Theme[]).map(t => (
            <button
              key={t}
              onClick={() => onThemeChange(t)}
              className={`px-4 py-2 text-[13px] rounded-[var(--radius-md)] border capitalize transition-colors ${theme === t ? "border-[var(--accent)] text-[var(--accent)] bg-[var(--accent)]/10 font-medium" : "border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]"}`}
            >
              {t}
            </button>
          ))}
        </div>
      </SettingSection>
      <SettingSection title="Layout">
        <SettingRow label="UI density" description="Controls spacing and padding throughout the interface">
          <div className="flex gap-2">
            {(["comfortable", "compact"] as const).map(d => (
              <button key={d} onClick={() => setDensity(d)} className={`px-3 py-1 text-[13px] rounded-[var(--radius-sm)] border capitalize transition-colors ${density === d ? "border-[var(--accent)] text-[var(--accent)] bg-[var(--accent)]/10" : "border-[var(--border-subtle)] text-[var(--text-secondary)]"}`}>{d}</button>
            ))}
          </div>
        </SettingRow>
        <SettingRow label="Reduce motion" description="Minimizes animations throughout the interface">
          <Switch checked={reducedMotion} onChange={setReducedMotion} />
        </SettingRow>
      </SettingSection>
    </div>
  );
}

function PrivacySettings() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const set = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) =>
    setSettings(s => ({ ...s, [key]: value }));

  return (
    <div>
      <h2 className="text-[18px] font-semibold text-[var(--text-primary)] mb-6">Privacy</h2>
      <SettingSection title="Social">
        <SettingRow label="Friend requests" description="Who can send you friend requests">
          <Select value={settings.friendRequestsFrom} onChange={v => set("friendRequestsFrom", v as any)} options={[{ value: "everyone", label: "Everyone" }, { value: "nobody", label: "Nobody" }]} className="w-40" />
        </SettingRow>
        <SettingRow label="Direct calls" description="Who can call you directly">
          <Select value={settings.directCallsFrom} onChange={v => set("directCallsFrom", v as any)} options={[{ value: "friends", label: "Friends" }, { value: "nobody", label: "Nobody" }]} className="w-40" />
        </SettingRow>
        <SettingRow label="Presence visibility" description="Who can see your online status">
          <Select value={settings.presenceVisibility} onChange={v => set("presenceVisibility", v as any)} options={[{ value: "friends", label: "Friends" }, { value: "nobody", label: "Appear offline" }]} className="w-40" />
        </SettingRow>
      </SettingSection>
      <SettingSection title="Blocked users">
        <p className="text-[13px] text-[var(--text-tertiary)] py-3">No blocked users.</p>
      </SettingSection>
    </div>
  );
}

function NotificationsSettings() {
  const [mentions, setMentions] = useState(true);
  const [dms, setDms] = useState(true);
  const [roomInvites, setRoomInvites] = useState(true);
  const [friendActivity, setFriendActivity] = useState(false);

  return (
    <div>
      <h2 className="text-[18px] font-semibold text-[var(--text-primary)] mb-6">Notifications</h2>
      <SettingSection title="In-app">
        <SettingRow label="Mentions">
          <Switch checked={mentions} onChange={setMentions} />
        </SettingRow>
        <SettingRow label="Direct messages">
          <Switch checked={dms} onChange={setDms} />
        </SettingRow>
        <SettingRow label="Room invitations">
          <Switch checked={roomInvites} onChange={setRoomInvites} />
        </SettingRow>
        <SettingRow label="Friend activity" description="When friends join a voice room">
          <Switch checked={friendActivity} onChange={setFriendActivity} />
        </SettingRow>
      </SettingSection>
    </div>
  );
}

interface SettingsProps {
  page?: string;
  theme: Theme;
  onThemeChange: (t: Theme) => void;
}

export function Settings({ page = "account", theme, onThemeChange }: SettingsProps) {
  return (
    <div className="flex-1 overflow-y-auto px-8 py-6 max-w-2xl">
      {page === "account" && <AccountSettings />}
      {page === "voice-audio" && <VoiceAudioSettings />}
      {page === "appearance" && <AppearanceSettings theme={theme} onThemeChange={onThemeChange} />}
      {page === "privacy" && <PrivacySettings />}
      {page === "notifications" && <NotificationsSettings />}
      {(page === "profile" || page === "keybinds" || page === "accessibility" || page === "advanced") && (
        <div>
          <h2 className="text-[18px] font-semibold text-[var(--text-primary)] mb-4 capitalize">{page.replace("-", " & ")}</h2>
          <p className="text-[13px] text-[var(--text-tertiary)]">This section is under construction.</p>
        </div>
      )}
    </div>
  );
}
