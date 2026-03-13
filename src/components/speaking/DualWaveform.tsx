/**
 * DualWaveform — shows model audio waveform (top) and student recording (bottom)
 * Uses WaveSurfer.js for professional audio visualization.
 *
 * Pedagogical purpose: students can visually compare their speech rhythm
 * and volume patterns against the model. Chinese L1 students tend to
 * produce flat, even-volume speech where English has clear stress patterns.
 * Seeing the difference builds awareness of English stress-timing.
 */
import { useRef, useEffect, memo } from "react";
import WaveSurfer from "wavesurfer.js";

interface DualWaveformProps {
  /** URL of the model audio (from TTS) */
  modelAudioUrl: string | null;
  /** URL of the student's recording (from MediaRecorder) */
  studentAudioUrl: string | null;
  /** Whether the model is currently playing */
  isPlayingModel: boolean;
  /** Whether the student is currently recording */
  isRecording: boolean;
}

function WaveformTrack({
  audioUrl,
  label,
  color,
  progressColor,
  height,
}: {
  audioUrl: string | null;
  label: string;
  color: string;
  progressColor: string;
  isPlaying: boolean;
  height: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const ws = WaveSurfer.create({
      container: containerRef.current,
      height,
      waveColor: color,
      progressColor,
      cursorWidth: 0,
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
      normalize: true,
      interact: false,
      fillParent: true,
      backend: "WebAudio",
    });

    wavesurferRef.current = ws;

    return () => {
      ws.destroy();
      wavesurferRef.current = null;
    };
  }, [color, progressColor, height]);

  // Load audio when URL changes
  useEffect(() => {
    if (!wavesurferRef.current || !audioUrl) return;
    wavesurferRef.current.load(audioUrl);
  }, [audioUrl]);

  return (
    <div className="relative">
      <span
        className="absolute top-1 left-3 text-[9px] font-bold uppercase tracking-[0.15em] z-10 opacity-60"
        style={{ color }}
      >
        {label}
      </span>
      <div ref={containerRef} className="w-full" />
      {!audioUrl && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[10px] text-white/20 italic">
            {label === "Target"
              ? "Play model to see waveform"
              : "Record to see your waveform"}
          </span>
        </div>
      )}
    </div>
  );
}

export default memo(function DualWaveform({
  modelAudioUrl,
  studentAudioUrl,
  isPlayingModel,
  isRecording,
}: DualWaveformProps) {
  return (
    <div className="w-full rounded-2xl overflow-hidden bg-white/[0.03] backdrop-blur-[40px] border border-white/10 shadow-[0_0_30px_-5px_rgba(34,211,238,0.2)]">
      {/* Model waveform */}
      <div className="border-b border-white/[0.06]">
        <WaveformTrack
          audioUrl={modelAudioUrl}
          label="Target"
          color="rgba(34, 211, 238, 0.5)"
          progressColor="rgba(34, 211, 238, 0.8)"
          isPlaying={isPlayingModel}
          height={35}
        />
      </div>
      {/* Student waveform */}
      <div>
        <WaveformTrack
          audioUrl={studentAudioUrl}
          label="You"
          color="rgba(74, 222, 128, 0.4)"
          progressColor="rgba(74, 222, 128, 0.8)"
          isPlaying={isRecording}
          height={35}
        />
      </div>
    </div>
  );
});
