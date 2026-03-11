import { Headphones, Play, SkipForward, Loader2 } from "lucide-react";
import PronunciationVisualizer from "@/components/speaking/PronunciationVisualizer";
import ProsodyVisualizer from "@/components/speaking/ProsodyVisualizer";
import MicRecordButton from "@/components/speaking/MicRecordButton";
import WeekSelector from "@/components/speaking/WeekSelector";
import { UKFlag, USFlag } from "@/components/speaking/FlagIcons";
import type { WordData } from "@/lib/prosody";

interface ShadowingPanelProps {
  practiceType: "pronunciation" | "fluency";
  accent: "UK" | "US";
  setAccent: (a: "UK" | "US") => void;
  prosodyData: WordData[];
  activeWordIndex: number;
  sentenceKey: number;
  targetProgress: number;
  isPlayingModel: boolean;
  isRecordingShadow: boolean;
  isPlayingReplay: boolean;
  lastRecordingUrl: string | null;
  micDenied: boolean;
  activeStream: MediaStream | null;
  curriculumLoading: boolean;
  shadowLoading: boolean;
  onPlayModel: () => void;
  onRecord: () => void;
  onReplay: (() => void) | undefined;
  onNextSentence: () => void;
  onAutoStop: () => void;
  onPitchContour: (contour: number[]) => void;
  measuredDurationMs: number | undefined;
  // Fluency-specific
  courseType: string | null;
  selectedWeek: number;
  onWeekChange: (w: number) => void;
  shadowingWeek: number;
  currentSectionId: string | null;
  currentQuestionId: string | null;
  currentQuestionText: string | null;
  // Pronunciation-specific
  globalSentenceIndex: number;
  curriculumTotal: number;
}

export default function ShadowingPanel(props: ShadowingPanelProps) {
  const {
    practiceType, accent, setAccent, prosodyData, activeWordIndex, sentenceKey,
    targetProgress, isPlayingModel, isRecordingShadow, isPlayingReplay,
    lastRecordingUrl, micDenied, activeStream, curriculumLoading, shadowLoading,
    onPlayModel, onRecord, onReplay, onNextSentence, onAutoStop, onPitchContour,
    measuredDurationMs, courseType, selectedWeek, onWeekChange, shadowingWeek,
    currentSectionId, currentQuestionId, currentQuestionText,
    globalSentenceIndex, curriculumTotal,
  } = props;

  const sectionMap: Record<string, string> = {
    model_answer: "Model Answer",
    transcoded: "Transcoded Text",
    part_2: "Part 2",
    part_3: "Part 3",
  };

  return (
    <>
      {/* WeekSelector — pinned top-right */}
      {practiceType === "fluency" && courseType && (() => {
        const sectionLabel = currentSectionId
          ? sectionMap[currentSectionId] ?? currentSectionId
          : null;
        const contextLabel = sectionLabel && currentQuestionId
          ? `Wk ${shadowingWeek} ${sectionLabel} · ${currentQuestionId.toUpperCase()}`
          : undefined;
        return (
          <div className="absolute top-80 left-5 z-50">
            <WeekSelector
              selectedWeek={selectedWeek}
              onWeekChange={onWeekChange}
              contextLabel={contextLabel}
              courseType={courseType}
            />
          </div>
        );
      })()}

      {/* Bottom visualizer area */}
      <div className="absolute bottom-0 left-0 right-0 pb-3 sm:pb-4 pt-6 sm:pt-8 px-3 sm:px-12 md:px-24 flex flex-col items-center z-40 bg-gradient-to-t from-black/85 via-black/60 to-transparent">
        <div key={sentenceKey} className="mb-1 w-full text-center relative z-10 animate-fade-in">
          <ProsodyVisualizer data={prosodyData} activeWordIndex={activeWordIndex} />
        </div>
        {practiceType === "fluency" && currentQuestionText && (
          <p className="text-sm italic text-white max-w-2xl mx-auto mb-1 text-center leading-relaxed">
            Q: {currentQuestionText}
          </p>
        )}
        <div className="w-full max-w-3xl flex flex-col gap-2 mb-2">
          {practiceType === "pronunciation" && curriculumTotal > 0 && (
            <div className="w-full h-1 bg-white/[0.06] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-700 ease-out"
                style={{ width: `${(globalSentenceIndex + 1) / curriculumTotal * 100}%` }}
              />
            </div>
          )}
          <div
            onClick={onPlayModel}
            className="relative h-20 rounded-2xl overflow-hidden transition-all duration-500 group cursor-pointer bg-white/[0.03] backdrop-blur-[40px] border border-white/10 shadow-[0_0_30px_-5px_rgba(34,211,238,0.3)]"
          >
            <div className="absolute top-2 left-4 flex items-center gap-3 z-10">
              <span className="text-[9px] font-black uppercase text-cyan-300 tracking-[0.2em] opacity-70">Target</span>
              <span className="text-[9px] font-black uppercase text-green-300 tracking-[0.2em] opacity-70">Live</span>
            </div>
            <div className="absolute inset-0 px-8 py-2">
              <PronunciationVisualizer
                isRecording={isRecordingShadow}
                isPlayingModel={isPlayingModel}
                activeWordIndex={activeWordIndex}
                prosodyData={prosodyData}
                targetProgress={targetProgress}
                sentenceKey={sentenceKey}
                onAutoStop={onAutoStop}
                onPitchContour={onPitchContour}
                measuredDurationMs={measuredDurationMs}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Accent toggle */}
      <div className="absolute top-[18%] right-2 sm:right-5 z-50 flex items-center gap-1 bg-black/40 backdrop-blur-2xl border border-white/[0.06] rounded-xl p-1 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.5)]">
        <button
          onClick={() => setAccent("UK")}
          className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-all duration-200 ${accent === "UK" ? "bg-white/10 text-white" : "text-white/40 hover:text-white/70"}`}
        >
          <UKFlag /><span className="text-[9px] font-semibold">UK</span>
        </button>
        <button
          onClick={() => setAccent("US")}
          className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-all duration-200 ${accent === "US" ? "bg-white/10 text-white" : "text-white/40 hover:text-white/70"}`}
        >
          <USFlag /><span className="text-[9px] font-semibold">US</span>
        </button>
      </div>

      {/* Right action bar */}
      <div className="absolute top-1/2 -translate-y-1/2 right-2 sm:right-5 flex flex-col items-center gap-1.5 z-50 bg-black/40 backdrop-blur-2xl border border-white/[0.06] rounded-2xl p-1.5 sm:p-2.5 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.5)] animate-slide-in-right">
        <button
          onClick={onPlayModel}
          className={`relative w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-150 group active:scale-95 ${isPlayingModel ? "bg-cyan-500/20 border border-cyan-500/30 text-cyan-300" : "text-white/40 hover:text-white hover:bg-white/[0.06]"}`}
          title="Hear Teacher Model"
          aria-label={isPlayingModel ? "Stop model playback" : "Play teacher model"}
        >
          {isPlayingModel ? <Loader2 className="w-5 h-5 animate-spin" /> : <Headphones className="w-5 h-5 group-hover:scale-110 transition-transform" />}
        </button>
        <MicRecordButton
          isRecording={isRecordingShadow}
          micDenied={micDenied}
          onToggle={onRecord}
          stream={activeStream}
          size="md"
          shape="rounded"
        />
        <button
          onClick={lastRecordingUrl ? onReplay : undefined}
          disabled={!lastRecordingUrl}
          className={`relative w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 group ${
            !lastRecordingUrl
              ? "text-white/20 opacity-30 cursor-not-allowed"
              : isPlayingReplay
              ? "bg-emerald-500/20 border border-emerald-500/30 text-emerald-300"
              : "text-emerald-400/80 hover:text-emerald-300 hover:bg-emerald-500/10"
          }`}
          title={!lastRecordingUrl ? "No recording yet" : isPlayingReplay ? "Stop Replay" : "Replay Your Recording"}
          aria-label={!lastRecordingUrl ? "No recording to replay" : isPlayingReplay ? "Stop replay" : "Replay your recording"}
        >
          <Play className="w-5 h-5 ml-0.5 group-hover:scale-110 transition-transform" />
        </button>
        {(practiceType === "pronunciation" || practiceType === "fluency") && (
          <button
            onClick={onNextSentence}
            disabled={curriculumLoading || shadowLoading}
            className="relative w-12 h-12 rounded-xl flex items-center justify-center text-white/40 hover:text-cyan-300 hover:bg-cyan-500/10 active:scale-90 transition-all duration-300 group disabled:opacity-30"
            title="Next Sentence"
            aria-label="Next sentence"
          >
            <SkipForward className="w-5 h-5 group-hover:scale-110 transition-transform" />
          </button>
        )}
      </div>
    </>
  );
}
