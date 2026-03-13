/**
 * PronunciationVisualizer — PLACEHOLDER
 * The old 700-line canvas system has been removed.
 * This stub maintains the import interface so other screens don't crash.
 * It will be replaced by DualWaveform in the next step.
 */
import type { WordData } from "@/lib/prosody";

interface Props {
  isRecording: boolean;
  isPlayingModel: boolean;
  activeWordIndex: number;
  prosodyData: WordData[];
  targetProgress: number;
  sentenceKey: number;
  onAutoStop?: () => void;
  onPitchContour?: (contour: number[]) => void;
  measuredDurationMs?: number | null;
}

export default function PronunciationVisualizer(_props: Props) {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <span className="text-[10px] text-white/20 italic">Waveform loading…</span>
    </div>
  );
}
