/**
 * Generic Fluency Practice (Shadowing) Screen
 * Shared by IELTS and IGCSE — parameterized by courseType.
 * Refactored: end popup and shared header extracted.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import PracticeSummaryOverlay from "@/components/student/PracticeSummaryOverlay";
import { useAuth } from "@/lib/auth";
import { useCourseWeek } from "@/hooks/useCourseWeek";
import { useShadowingCurriculum } from "@/hooks/useShadowingCurriculum";
import { useTimerSettings } from "@/hooks/useTimerSettings";
import { usePracticeTimer } from "@/hooks/usePracticeTimer";
import { useAudioCapture } from "@/hooks/useAudioCapture";
import { speak, type TTSHandle } from "@/lib/tts-provider";
import { parseProsody, type WordData } from "@/lib/prosody";
import { useFluencyTimings } from "@/hooks/useTTSTimings";
import ProsodyVisualizer from "@/components/speaking/ProsodyVisualizer";
import PronunciationVisualizer from "@/components/speaking/PronunciationVisualizer";
import CountdownTimer from "@/components/speaking/CountdownTimer";
import FloatingInfoPanel from "@/components/speaking/FloatingInfoPanel";
import PageShell from "@/components/PageShell";
import { useVideoLoopStack } from "@/hooks/useVideoLoopStack";
import { Headphones, Mic, Play, Loader2, SkipForward } from "lucide-react";
import { PracticeSkeleton } from "@/components/ui/practice-skeleton";
import { PracticeHeader, PracticeProgress } from "./practice-shared";
import FluencyEndPopup from "./FluencyEndPopup";
import AccentSelector, { type Accent } from "@/components/speaking/AccentSelector";

type CourseType = "ielts" | "igcse";

interface FluencyPracticeProps {
  courseType: CourseType;
}

const COURSE_CONFIG: Record<CourseType, {
  badgeClass: string;
  badgeLabel: string;
  sectionMap: Record<string, string>;
  courseLabel: string;
}> = {
  ielts: {
    badgeClass: "bg-cyan-500/20 border-cyan-500/30 text-cyan-300",
    badgeLabel: "IELTS · Homework · Shadowing Fluency",
    sectionMap: { model_answer: "Model Answer", part_2: "Part 2", part_3: "Part 3" },
    courseLabel: "IELTS",
  },
  igcse: {
    badgeClass: "bg-teal-500/20 border-teal-500/30 text-teal-300",
    badgeLabel: "IGCSE · Homework · Shadowing Fluency",
    sectionMap: { model_answer: "Model Answer", weekly_topic: "Weekly Topic", transcription: "Weekly Topic" },
    courseLabel: "IGCSE",
  },
};

export default function FluencyPractice({ courseType }: FluencyPracticeProps) {
  const { videoList } = useVideoLoopStack();
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const courseWeek = useCourseWeek(userId);
  const shadowCurriculum = useShadowingCurriculum(courseType, courseWeek.shadowingWeek);
  const timerSettings = useTimerSettings(courseType, "shadowing-fluency");
  const fluencyTimings = useFluencyTimings(courseType);
  const config = COURSE_CONFIG[courseType];

  const [accent, setAccent] = useState<Accent>("uk");
  const [prosodyData, setProsodyData] = useState<WordData[]>([]);
  const [activeWordIndex, setActiveWordIndex] = useState(-1);
  const [targetProgress, setTargetProgress] = useState(0);
  const [isPlayingModel, setIsPlayingModel] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [sentenceKey, setSentenceKey] = useState(0);
  const [showSummary, setShowSummary] = useState(false);
  const summaryShownRef = useRef(false);
  const [showEndPopup, setShowEndPopup] = useState(false);

  const ttsHandleRef = useRef<TTSHandle | null>(null);
  const { lastRecordingUrl, isPlayingReplay, startMediaRecorder, stopMediaRecorder, handleReplay, clearRecording } = useAudioCapture();

  const isAudioActive = isRecording || isPlayingModel;

  const practiceTimer = usePracticeTimer({
    userId, courseType, activityType: "shadowing",
    weekNumber: courseWeek.selectedWeek, practiceMode: "homework", isAudioActive,
  });

  const currentText = shadowCurriculum.currentChunk?.text ?? "";

  useEffect(() => {
    if (!currentText) return;
    setProsodyData(parseProsody(currentText));
    setTargetProgress(0); setActiveWordIndex(-1);
    setSentenceKey((k) => k + 1); setShowEndPopup(false);
  }, [currentText]);

  const computeTargetProgress = useCallback((wordIdx: number) => {
    if (prosodyData.length === 0) return 0;
    const allSyl = prosodyData.flatMap((d) => d.syllables);
    if (allSyl.length === 0) return 0;
    let sylCount = 0;
    for (let i = 0; i <= wordIdx && i < prosodyData.length; i++) sylCount += prosodyData[i].syllables.length;
    return Math.min(1, sylCount / allSyl.length);
  }, [prosodyData]);

  const sectionLabel = shadowCurriculum.currentSectionId ? config.sectionMap[shadowCurriculum.currentSectionId] ?? shadowCurriculum.currentSectionId : "";
  const questionId = shadowCurriculum.currentQuestionId?.toUpperCase() ?? "";

  const handlePlayModel = async () => {
    if (!currentText) return;
    if (isPlayingModel) { ttsHandleRef.current?.stop(); setIsPlayingModel(false); setActiveWordIndex(-1); return; }
    setIsPlayingModel(true); setActiveWordIndex(0); setTargetProgress(0);
    ttsHandleRef.current = speak(currentText, "uk", {
      rate: 0.8, pitch: 1.1,
      onBoundary: (charIndex) => { const idx = prosodyData.findIndex((w) => w.startChar <= charIndex && charIndex < w.endChar); if (idx !== -1) { setActiveWordIndex(idx); setTargetProgress(computeTargetProgress(idx)); } },
      onEnd: () => { setIsPlayingModel(false); setActiveWordIndex(-1); setTargetProgress(1); },
    });
  };

  const handleRecord = async () => {
    if (isRecording) { setIsRecording(false); stopMediaRecorder(); }
    else { setIsRecording(true); clearRecording(); await startMediaRecorder(); }
  };

  const stopRecordingCb = useCallback(() => { setIsRecording(false); stopMediaRecorder(); }, [stopMediaRecorder]);

  const isLastChunkOfAnswer = useCallback(() => {
    if (shadowCurriculum.chunks.length === 0) return false;
    const nextIdx = shadowCurriculum.currentIndex + 1;
    if (nextIdx >= shadowCurriculum.chunks.length) return true;
    return shadowCurriculum.currentChunk?.question_text !== shadowCurriculum.chunks[nextIdx]?.question_text;
  }, [shadowCurriculum]);

  const handleNextChunk = () => {
    clearRecording();
    if (isLastChunkOfAnswer()) setShowEndPopup(true);
    else shadowCurriculum.nextChunk();
  };

  useEffect(() => {
    if (practiceTimer.isComplete && !summaryShownRef.current) { summaryShownRef.current = true; setShowSummary(true); }
  }, [practiceTimer.isComplete]);

  if (courseWeek.loading || shadowCurriculum.loading || timerSettings.loading) {
    return <PracticeSkeleton />;
  }

  return (
    <PageShell fullWidth loopVideos={videoList} hideFooter>
      <div className="relative w-full h-full text-white font-outfit select-none animate-fade-in-up">
        <PracticeHeader badgeClass={config.badgeClass} badgeLabel={config.badgeLabel} />

        {/* Timer */}
        <div className="absolute top-16 left-4 z-50">
          {timerSettings.countdownMinutes && (
            <CountdownTimer countdownFrom={timerSettings.countdownMinutes} activeSeconds={practiceTimer.activeSeconds} isRunning={practiceTimer.isRunning} onPause={practiceTimer.pause} onResume={practiceTimer.resume} label="Shadowing" />
          )}
        </div>

        {/* Floating Info Panel */}
        <div className="absolute top-40 left-4 z-50">
          <FloatingInfoPanel course={config.courseLabel} weekNumber={courseWeek.shadowingWeek} questionType={sectionLabel} questionNumber={questionId} questionText={shadowCurriculum.currentQuestionText ?? ""} />
        </div>

        <PracticeProgress label="Chunk" current={shadowCurriculum.currentIndex + 1} total={shadowCurriculum.totalChunks} />

        {/* Vertical button stack – far right */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 z-50 flex flex-col items-center gap-2">
          <button onClick={handlePlayModel} className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all active:scale-95 ${isPlayingModel ? "bg-cyan-500/20 border border-cyan-500/30 text-cyan-300" : "bg-white/[0.06] border border-white/[0.08] text-white/50 hover:text-white hover:bg-white/10"}`} title="Hear Model">
            {isPlayingModel ? <Loader2 className="w-5 h-5 animate-spin" /> : <Headphones className="w-5 h-5" />}
          </button>
          <button onClick={handleRecord} className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 ${isRecording ? "bg-red-500 shadow-[0_0_24px_rgba(239,68,68,0.4)] scale-105" : "bg-white/[0.06] border border-white/[0.08] hover:bg-white/[0.1]"}`} title={isRecording ? "Stop" : "Record"}>
            {isRecording ? <div className="w-5 h-5 bg-white rounded-sm animate-pulse" /> : <Mic className="w-7 h-7 text-white/80" />}
          </button>
          <button onClick={lastRecordingUrl ? handleReplay : undefined} disabled={!lastRecordingUrl} className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all active:scale-95 ${!lastRecordingUrl ? "text-white/20 opacity-30 cursor-not-allowed" : isPlayingReplay ? "bg-emerald-500/20 border border-emerald-500/30 text-emerald-300" : "bg-white/[0.06] border border-white/[0.08] text-emerald-400/80 hover:text-emerald-300 hover:bg-emerald-500/10"}`} title="Replay">
            <Play className="w-5 h-5 ml-0.5" />
          </button>
          <button onClick={handleNextChunk} className="w-12 h-12 rounded-xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-white/50 hover:text-cyan-300 hover:bg-cyan-500/10 transition-all active:scale-95" title="Next Chunk">
            <SkipForward className="w-5 h-5" />
          </button>
        </div>

        {/* Bottom bar: karaoke text + visualizer */}
        <div className="absolute bottom-0 left-0 right-16 pb-4 pt-8 px-8 flex flex-col items-center z-40 bg-gradient-to-t from-black/85 via-black/50 to-transparent">
          <div key={sentenceKey} className="mb-2 w-full text-center relative z-10 animate-fade-in">
            <ProsodyVisualizer data={prosodyData} activeWordIndex={activeWordIndex} />
          </div>

          <div className="w-full max-w-3xl">
            {/* Progress indicator */}
            <div className="w-full h-[2px] bg-white/[0.06] rounded-full mb-1 overflow-hidden">
              <div className="h-full bg-cyan-400/40 rounded-full transition-all duration-500 ease-out" style={{ width: `${((shadowCurriculum.currentIndex + 1) / shadowCurriculum.totalChunks) * 100}%` }} />
            </div>
            <div onClick={handlePlayModel} className="relative h-20 rounded-2xl overflow-hidden transition-all duration-500 group cursor-pointer bg-white/[0.03] backdrop-blur-[40px] border border-white/10 shadow-[0_0_30px_-5px_rgba(34,211,238,0.3)]">
              <div className="absolute top-2 left-4 flex items-center gap-3 z-10">
                <span className="text-[9px] font-black uppercase text-cyan-300 tracking-[0.2em] opacity-70">Target</span>
                <span className="text-[9px] font-black uppercase text-green-300 tracking-[0.2em] opacity-70">Live</span>
              </div>
              <div className="absolute inset-0 px-8 py-2">
                <PronunciationVisualizer isRecording={isRecording} isPlayingModel={isPlayingModel} activeWordIndex={activeWordIndex} prosodyData={prosodyData} targetProgress={targetProgress} sentenceKey={sentenceKey} onAutoStop={stopRecordingCb} onPitchContour={() => {}} measuredDurationMs={fluencyTimings.getDuration(currentText)} />
              </div>
            </div>
          </div>
        </div>

        <FluencyEndPopup
          visible={showEndPopup}
          onRepeat={() => { setShowEndPopup(false); shadowCurriculum.resetToFirst(); }}
          onNext={() => { setShowEndPopup(false); shadowCurriculum.nextChunk(); clearRecording(); }}
          onStartFromBeginning={() => { setShowEndPopup(false); shadowCurriculum.resetToFirst(); clearRecording(); }}
        />
        <PracticeSummaryOverlay visible={showSummary} activeSeconds={practiceTimer.activeSeconds} targetSeconds={practiceTimer.targetSeconds} activityLabel="Fluency (Shadowing)" onDismiss={() => setShowSummary(false)} />
      </div>
    </PageShell>
  );
}
