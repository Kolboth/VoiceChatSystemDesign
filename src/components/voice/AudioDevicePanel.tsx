import { useEffect, useRef, useState } from "react";
import type { VoiceRoomController } from "../../types";
import { Select, Separator, AudioLevelMeter, Button } from "../ui/primitives";

interface AudioDevicePanelProps {
  voice: VoiceRoomController;
  anchor: { top: number; left: number };
  onClose: () => void;
  onOpenFullSettings?: () => void;
}

export function AudioDevicePanel({ voice, anchor, onClose, onOpenFullSettings }: AudioDevicePanelProps) {
  const ref = useRef<HTMLDivElement>(null);
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
      className="qp-raised qp-panel-enter fixed z-50 w-80 overflow-hidden rounded-[var(--radius-xl)]"
      style={{ bottom: window.innerHeight - anchor.top + 8, left: anchor.left }}
      role="dialog"
      aria-label="Audio device settings"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-3.5 py-3">
        <span className="text-[13px] font-semibold text-[var(--text-primary)]">Audio Devices</span>
        <button onClick={onClose} aria-label="Close" className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
      </div>

      <div className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto p-3.5">
        {/* Microphone section */}
        <div>
          <div className="qp-kicker mb-2">Microphone</div>
          <Select
            value={voice.selectedMicrophoneId ?? "default"}
            onChange={voice.selectMicrophone}
            options={micOptions}
          />
          <div className="mt-3 flex items-center justify-between">
            <span className="text-[12px] text-[var(--text-secondary)]">Input level</span>
            <AudioLevelMeter level={level} />
          </div>
          <p className="mt-2 text-[11px] text-[var(--text-tertiary)]">
            Echo cancellation, noise suppression and automatic gain are enabled for live voice.
          </p>
        </div>

        <Separator />

        {/* Output section */}
        <div>
          <div className="qp-kicker mb-2">Output</div>
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
