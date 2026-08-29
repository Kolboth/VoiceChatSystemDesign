import { useEffect, useRef, useState } from "react";
import type { VoiceRoomController } from "../../types";
import { Select, Switch, Slider, Separator, AudioLevelMeter, Button } from "../ui/primitives";

interface AudioDevicePanelProps {
  voice: VoiceRoomController;
  anchor: { top: number; left: number };
  onClose: () => void;
  onOpenFullSettings?: () => void;
}

export function AudioDevicePanel({ voice, anchor, onClose, onOpenFullSettings }: AudioDevicePanelProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [inputVolume, setInputVolume] = useState(80);
  const [outputVolume, setOutputVolume] = useState(100);
  const [echoCancellation, setEchoCancellation] = useState(true);
  const [noiseSuppression, setNoiseSuppression] = useState(true);
  const [automaticGain, setAutomaticGain] = useState(true);
  const [level, setLevel] = useState(0);

  // Close on outside click / Escape
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const keyHandler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", keyHandler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", keyHandler);
    };
  }, [onClose]);

  // Real mic level meter — driven by the active input stream from voice-context
  useEffect(() => {
    const stream = voice.activeInputStream;
    if (!stream) {
      setLevel(0);
      return;
    }

    let audioCtx: AudioContext | null = null;
    let animId = 0;

    try {
      audioCtx = new AudioContext();
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.75;
      audioCtx.createMediaStreamSource(stream).connect(analyser);

      const buf = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteFrequencyData(buf);
        const avg = buf.reduce((s, v) => s + v, 0) / buf.length;
        setLevel(Math.min(100, Math.round((avg / 80) * 100)));
        animId = requestAnimationFrame(tick);
      };
      tick();
    } catch {
      // AudioContext blocked or stream ended — leave level at 0
    }

    return () => {
      cancelAnimationFrame(animId);
      audioCtx?.close();
      setLevel(0);
    };
  }, [voice.activeInputStream]);

  const micOptions = voice.microphoneDevices.map(d => ({ value: d.deviceId, label: d.label || "Microphone" }));
  const outputOptions = voice.outputDevices.map(d => ({ value: d.deviceId, label: d.label || "Speaker" }));

  return (
    <div
      ref={ref}
      className="fixed z-50 w-72 bg-[var(--surface-3)] border border-[var(--border-subtle)] rounded-[var(--radius-xl)] shadow-2xl animate-fade-in overflow-hidden"
      style={{ bottom: window.innerHeight - anchor.top + 8, left: anchor.left }}
      role="dialog"
      aria-label="Audio device settings"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)]">
        <span className="text-[13px] font-semibold text-[var(--text-primary)]">Audio Devices</span>
        <button onClick={onClose} aria-label="Close" className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
      </div>

      <div className="p-4 flex flex-col gap-4 max-h-[70vh] overflow-y-auto">
        {/* Microphone section */}
        <div>
          <div className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-2">Microphone</div>
          <Select
            value={voice.selectedMicrophoneId ?? "default"}
            onChange={voice.selectMicrophone}
            options={micOptions}
          />
          <div className="mt-3 flex items-center justify-between">
            <span className="text-[12px] text-[var(--text-secondary)]">Input level</span>
            <AudioLevelMeter level={level} />
          </div>
          <Slider value={inputVolume} onChange={setInputVolume} label="Input volume" className="mt-2" />
        </div>

        <Separator />

        {/* Processing */}
        <div>
          <div className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-3">Processing</div>
          <div className="flex flex-col gap-3">
            <Switch checked={echoCancellation} onChange={setEchoCancellation} label="Echo cancellation" />
            <Switch checked={noiseSuppression} onChange={setNoiseSuppression} label="Noise suppression" />
            <Switch checked={automaticGain} onChange={setAutomaticGain} label="Automatic gain control" />
          </div>
        </div>

        <Separator />

        {/* Output section */}
        <div>
          <div className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-2">Output</div>
          {voice.outputSelectionSupported ? (
            <Select
              value={voice.selectedOutputId ?? "default"}
              onChange={voice.selectOutput}
              options={outputOptions}
            />
          ) : (
            <>
              <div className="text-[12px] text-[var(--text-tertiary)] py-1">
                {outputOptions.find(o => o.value === voice.selectedOutputId)?.label ?? "System default"}
              </div>
              <p className="text-[11px] text-[var(--text-tertiary)] mt-1">
                Output device selection is managed by your browser or system on this device.
              </p>
            </>
          )}
          <Slider value={outputVolume} onChange={setOutputVolume} label="Output volume" className="mt-3" />
        </div>

        {/* Open full settings */}
        {onOpenFullSettings && (
          <>
            <Separator />
            <Button variant="ghost" size="sm" className="w-full justify-center" onClick={onOpenFullSettings}>
              Open Voice & Audio Settings
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
