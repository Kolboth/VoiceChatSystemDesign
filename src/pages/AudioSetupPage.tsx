import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "../features/auth/auth-context";
import { Button, AudioLevelMeter } from "../components/ui/primitives";
import { APP_NAME } from "../types";

type Step = "permission" | "microphone" | "output" | "input-mode" | "done";

function MicIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
      <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
      <line x1="12" y1="19" x2="12" y2="23"/>
      <line x1="8" y1="23" x2="16" y2="23"/>
    </svg>
  );
}

function SpeakerIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
    </svg>
  );
}

export function AudioSetupPage() {
  const { updateProfile } = useAuth();
  const [step, setStep] = useState<Step>("permission");
  const [permissionState, setPermissionState] = useState<"idle" | "requesting" | "granted" | "denied">("idle");
  const [inputMode, setInputMode] = useState<"voice-activity" | "push-to-talk">("voice-activity");

  // Real devices
  const [micDevices, setMicDevices] = useState<MediaDeviceInfo[]>([]);
  const [outputDevices, setOutputDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedMicId, setSelectedMicId] = useState<string>("");
  const [selectedOutputId, setSelectedOutputId] = useState<string>("");

  // Real audio level (0–100)
  const [audioLevel, setAudioLevel] = useState(0);

  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number>(0);

  const stopLevelMeter = useCallback(() => {
    cancelAnimationFrame(animFrameRef.current);
    analyserRef.current = null;
    if (audioCtxRef.current) {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
    setAudioLevel(0);
  }, []);

  const startLevelMeter = useCallback((stream: MediaStream) => {
    stopLevelMeter();
    try {
      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.75;
      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);
      audioCtxRef.current = ctx;
      analyserRef.current = analyser;

      const buf = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(buf);
        const avg = buf.reduce((s, v) => s + v, 0) / buf.length;
        // Scale up so normal speaking hits 40–80%
        setAudioLevel(Math.min(100, Math.round((avg / 80) * 100)));
        animFrameRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch {
      // AudioContext blocked by autoplay policy — non-fatal
    }
  }, [stopLevelMeter]);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => () => {
    stopLevelMeter();
    stopStream();
  }, [stopLevelMeter, stopStream]);

  async function enumerateDevices() {
    try {
      const all = await navigator.mediaDevices.enumerateDevices();
      const inputs = all.filter(d => d.kind === "audioinput");
      const outputs = all.filter(d => d.kind === "audiooutput");
      setMicDevices(inputs);
      setOutputDevices(outputs);
      if (inputs.length > 0 && !selectedMicId) setSelectedMicId(inputs[0].deviceId);
      if (outputs.length > 0 && !selectedOutputId) setSelectedOutputId(outputs[0].deviceId);
    } catch {}
  }

  async function requestPermission() {
    setPermissionState("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setPermissionState("granted");
      await enumerateDevices();
      startLevelMeter(stream);
      setTimeout(() => setStep("microphone"), 700);
    } catch {
      setPermissionState("denied");
    }
  }

  async function switchMicrophone(deviceId: string) {
    setSelectedMicId(deviceId);
    stopLevelMeter();
    stopStream();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: deviceId ? { deviceId: { exact: deviceId } } : true,
      });
      streamRef.current = stream;
      startLevelMeter(stream);
    } catch {}
  }

  async function testOutput() {
    // Play a short 440 Hz tone through the selected output device
    try {
      const supportsCtxSinkId =
        typeof AudioContext !== "undefined" &&
        "setSinkId" in AudioContext.prototype;
      const supportElSinkId =
        typeof HTMLAudioElement !== "undefined" &&
        "setSinkId" in HTMLAudioElement.prototype;

      let sinkId = selectedOutputId;
      if (!sinkId || sinkId === "") sinkId = "default";

      // Use AudioContext.setSinkId where available, so the tone goes to the right device
      const ctx = new AudioContext();
      if (supportsCtxSinkId && sinkId !== "default") {
        await (ctx as AudioContext & { setSinkId(id: string): Promise<void> }).setSinkId(sinkId);
      }

      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.frequency.value = 440;
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      oscillator.start();
      oscillator.stop(ctx.currentTime + 0.6);
      oscillator.onended = () => ctx.close();

      // Fallback: play a silent HTMLAudioElement to prime setSinkId for the output
      if (!supportsCtxSinkId && supportElSinkId && sinkId !== "default") {
        const el = new Audio();
        await (el as HTMLAudioElement & { setSinkId(id: string): Promise<void> }).setSinkId(sinkId).catch(() => {});
      }
    } catch {}
  }

  async function complete() {
    stopLevelMeter();
    stopStream();
    await updateProfile({ audioSetupComplete: true });
  }

  const steps: Step[] = ["permission", "microphone", "output", "input-mode", "done"];
  const stepIndex = steps.indexOf(step);

  const selectedMicLabel = micDevices.find(d => d.deviceId === selectedMicId)?.label || "Default Microphone";
  const selectedOutputLabel = outputDevices.find(d => d.deviceId === selectedOutputId)?.label || "Default Speaker";

  return (
    <div className="flex h-full items-center justify-center bg-[var(--background)] p-6">
      <div className="w-full max-w-md">
        {/* Progress bar */}
        <div className="flex items-center gap-1.5 mb-10">
          {steps.map((s, i) => (
            <div
              key={s}
              className={`h-[3px] flex-1 rounded-full transition-all duration-300 ${i <= stepIndex ? "bg-[var(--accent)]" : "bg-[var(--surface-3)]"}`}
            />
          ))}
        </div>

        {/* Step: Permission */}
        {step === "permission" && (
          <div className="flex flex-col gap-6">
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-[var(--radius-md)] bg-[var(--accent)]/10 flex items-center justify-center text-[var(--accent)] shrink-0 mt-0.5">
                <MicIcon size={20} />
              </div>
              <div>
                <h2 className="text-[22px] font-semibold text-[var(--text-primary)] mb-1.5">Microphone access</h2>
                <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">
                  {APP_NAME} needs microphone access to let you speak in voice rooms and calls. Your microphone is only active when you're connected to a room.
                </p>
              </div>
            </div>

            {permissionState === "denied" && (
              <div className="px-4 py-3 rounded-[var(--radius-md)] bg-[var(--danger)]/10 border border-[var(--danger)]/20 text-[13px] text-[var(--danger)]">
                <p className="font-medium mb-1">Microphone access is blocked</p>
                <p className="text-[var(--danger)]/80">Allow microphone access in your browser settings, then reload and try again.</p>
              </div>
            )}

            <Button
              variant="primary"
              size="md"
              onClick={requestPermission}
              loading={permissionState === "requesting"}
              disabled={permissionState === "granted"}
            >
              {permissionState === "granted" ? "Access granted" : "Allow microphone access"}
            </Button>

            {permissionState !== "granted" && (
              <button
                onClick={() => { setStep("microphone"); enumerateDevices(); }}
                className="text-[13px] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
              >
                Skip for now
              </button>
            )}
          </div>
        )}

        {/* Step: Microphone */}
        {step === "microphone" && (
          <div className="flex flex-col gap-6">
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-[var(--radius-md)] bg-[var(--accent)]/10 flex items-center justify-center text-[var(--accent)] shrink-0 mt-0.5">
                <MicIcon size={20} />
              </div>
              <div>
                <h2 className="text-[22px] font-semibold text-[var(--text-primary)] mb-1.5">Choose microphone</h2>
                <p className="text-[13px] text-[var(--text-secondary)]">Select the microphone you want to use.</p>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              {micDevices.length > 0 ? micDevices.map(device => (
                <label
                  key={device.deviceId}
                  className={`flex items-center gap-3 p-3 rounded-[var(--radius-md)] border cursor-pointer transition-colors ${
                    selectedMicId === device.deviceId
                      ? "border-[var(--accent)] bg-[var(--accent)]/5"
                      : "border-[var(--border-subtle)] hover:border-[var(--border-strong)]"
                  }`}
                >
                  <input
                    type="radio"
                    name="mic"
                    value={device.deviceId}
                    checked={selectedMicId === device.deviceId}
                    onChange={() => switchMicrophone(device.deviceId)}
                    className="accent-[var(--accent)]"
                  />
                  <span className="text-[13px] text-[var(--text-primary)] truncate">
                    {device.label || `Microphone ${device.deviceId.slice(0, 8)}`}
                  </span>
                </label>
              )) : (
                <div className="px-3 py-2 text-[13px] text-[var(--text-tertiary)]">
                  No microphones detected. Grant permission first.
                </div>
              )}
            </div>

            {/* Live level meter */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-medium text-[var(--text-secondary)]">Input level</span>
                <span className="text-[11px] text-[var(--text-tertiary)]">Speak to test</span>
              </div>
              <AudioLevelMeter level={audioLevel} className="w-full" />
            </div>

            <Button variant="primary" size="md" onClick={() => setStep("output")}>Next</Button>
          </div>
        )}

        {/* Step: Output */}
        {step === "output" && (
          <div className="flex flex-col gap-6">
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-[var(--radius-md)] bg-[var(--accent)]/10 flex items-center justify-center text-[var(--accent)] shrink-0 mt-0.5">
                <SpeakerIcon size={20} />
              </div>
              <div>
                <h2 className="text-[22px] font-semibold text-[var(--text-primary)] mb-1.5">Choose output</h2>
                <p className="text-[13px] text-[var(--text-secondary)]">Select where you want to hear others.</p>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              {outputDevices.length > 0 ? outputDevices.map(device => (
                <label
                  key={device.deviceId}
                  className={`flex items-center gap-3 p-3 rounded-[var(--radius-md)] border cursor-pointer transition-colors ${
                    selectedOutputId === device.deviceId
                      ? "border-[var(--accent)] bg-[var(--accent)]/5"
                      : "border-[var(--border-subtle)] hover:border-[var(--border-strong)]"
                  }`}
                >
                  <input
                    type="radio"
                    name="output"
                    value={device.deviceId}
                    checked={selectedOutputId === device.deviceId}
                    onChange={() => setSelectedOutputId(device.deviceId)}
                    className="accent-[var(--accent)]"
                  />
                  <span className="text-[13px] text-[var(--text-primary)] truncate">
                    {device.label || `Speaker ${device.deviceId.slice(0, 8)}`}
                  </span>
                </label>
              )) : (
                <div className="px-3 py-2 text-[13px] text-[var(--text-tertiary)]">
                  No output devices detected.
                </div>
              )}
            </div>

            <Button variant="outline" size="sm" className="self-start" onClick={testOutput}>
              Play test tone
            </Button>

            <Button variant="primary" size="md" onClick={() => setStep("input-mode")}>Next</Button>
          </div>
        )}

        {/* Step: Input mode */}
        {step === "input-mode" && (
          <div className="flex flex-col gap-6">
            <div>
              <h2 className="text-[22px] font-semibold text-[var(--text-primary)] mb-1.5">Input mode</h2>
              <p className="text-[13px] text-[var(--text-secondary)]">How should your microphone activate?</p>
            </div>

            <div className="flex flex-col gap-2">
              {[
                { id: "voice-activity", label: "Voice activity", description: "Microphone activates automatically when you speak" },
                { id: "push-to-talk", label: "Push to talk", description: "Hold a key to activate your microphone" },
              ].map(option => (
                <label
                  key={option.id}
                  className={`flex items-start gap-3 p-4 rounded-[var(--radius-md)] border cursor-pointer transition-colors ${
                    inputMode === option.id
                      ? "border-[var(--accent)] bg-[var(--accent)]/5"
                      : "border-[var(--border-subtle)] hover:border-[var(--border-strong)]"
                  }`}
                >
                  <input
                    type="radio"
                    name="inputMode"
                    checked={inputMode === option.id}
                    onChange={() => setInputMode(option.id as "voice-activity" | "push-to-talk")}
                    className="mt-0.5 accent-[var(--accent)]"
                  />
                  <div>
                    <p className="text-[13px] font-medium text-[var(--text-primary)]">{option.label}</p>
                    <p className="text-[12px] text-[var(--text-tertiary)] mt-0.5">{option.description}</p>
                  </div>
                </label>
              ))}
            </div>

            <Button variant="primary" size="md" onClick={() => setStep("done")}>Next</Button>
          </div>
        )}

        {/* Step: Done */}
        {step === "done" && (
          <div className="flex flex-col items-center gap-6 text-center">
            <div className="w-14 h-14 rounded-full bg-[var(--success)]/15 flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5" strokeLinecap="round">
                <path d="M20 6 9 17l-5-5"/>
              </svg>
            </div>
            <div>
              <h2 className="text-[22px] font-semibold text-[var(--text-primary)] mb-2">You're ready</h2>
              <p className="text-[13px] text-[var(--text-secondary)]">Audio setup complete. Join a room to start talking.</p>
            </div>
            <div className="w-full text-left bg-[var(--surface-1)] rounded-[var(--radius-md)] border border-[var(--border-subtle)] px-4 py-3 text-[13px] text-[var(--text-secondary)]">
              <div className="flex justify-between mb-1.5">
                <span>Microphone</span>
                <span className="text-[var(--text-primary)] truncate ml-4 max-w-[60%] text-right">{selectedMicLabel}</span>
              </div>
              <div className="flex justify-between mb-1.5">
                <span>Output</span>
                <span className="text-[var(--text-primary)] truncate ml-4 max-w-[60%] text-right">{selectedOutputLabel}</span>
              </div>
              <div className="flex justify-between">
                <span>Input mode</span>
                <span className="text-[var(--text-primary)] capitalize">{inputMode.replace("-", " ")}</span>
              </div>
            </div>
            <Button variant="primary" size="md" className="w-full justify-center" onClick={complete}>
              Enter {APP_NAME}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
