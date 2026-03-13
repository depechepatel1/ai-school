/**
 * Generic Pronunciation Practice (Tongue Twisters) Screen
 * Shared by IELTS and IGCSE — parameterized by courseType.
 * Refactored: shared header/progress extracted.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import PracticeSummaryOverlay from "@/components/student/PracticeSummaryOverlay";
import { useAuth } from "@/lib/auth";
import { useCourseWeek } from "@/hooks/useCourseWeek";
import { useStudentProgress } from "@/hooks/useStudentProgress";
import { useTimerSettings } from "@/hooks/useTimerSettings";
import { usePracticeTimer } from "@/hooks/usePracticeTimer";
import { useAudioCapture } from "@/hooks/useAudioCapture";
import { fetchPronunciationItems, type PronunciationItem } from "@/services/pronunciation-shadowing";
import { speak, type TTSHandle } from "@/lib/tts-provider";
import { parseProsody, matchCharIndex, type WordData } from "@/lib/prosody";
import ProsodyVisualizer from "@/components/speaking/ProsodyVisualizer";
import DualWaveform from "@/components/speaking/DualWaveform";
import CountdownTimer from "@/components/speaking/CountdownTimer";
import PageShell from "@/components/PageShell";
import { useVideoLoopStack } from "@/hooks/useVideoLoopStack";
import { ChevronLeft, ChevronRight, RotateCcw, Headphones, Play, Loader2 } from "lucide-react";
import MicRecordButton from "@/components/speaking/MicRecordButton";
import { PracticeSkeleton } from "@/components/ui/practice-skeleton";
import { PracticeHeader } from "./practice-shared";
import FloatingInfoPanel from "@/components/speaking/FloatingInfoPanel";
import AccentSelector from "@/components/speaking/AccentSelector";
import { useAccent } from "@/hooks/useAccent";
import { preloadStressDict } from "@/lib/stress-dictionary";

type CourseType = "ielts" | "igcse";

interface PronunciationPracticeProps {
  courseType: CourseType;
}

const COURSE_CONFIG: Record<CourseType, {
  badgeClass: string;
  badgeLabel: string;
  courseLabel: string;
}> = {
  ielts: {
    badgeClass: "bg-amber-500/20 border-amber-500/30 text-amber-300",
    badgeLabel: "IELTS · Homework · Pronunciation",
    courseLabel: "IELTS",
  },
  igcse: {
    badgeClass: "bg-emerald-500/20 border-emerald-500/30 text-emerald-300",
    badgeLabel: "IGCSE · Homework · Pronunciation",
    courseLabel: "IGCSE",
  },
};

export default function PronunciationPractice({ courseType }: PronunciationPracticeProps) {
  const { videoList } = useVideoLoopStack();
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const courseWeek = useCourseWeek(userId);
  const progress = useStudentProgress({ userId, courseType, moduleType: "tongue-twisters" });
  const timerSettings = useTimerSettings(courseType, "shadowing-pronunciation");
  const config = COURSE_CONFIG[courseType];

  const { accent, setAccent } = useAccent(userId);
  const [twisters, setTwisters] = useState<PronunciationItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [prosodyData, setProsodyData] = useState<WordData[]>([]);
  const [activeWordIndex, setActiveWordIndex] = useState(-1);
  const [isPlayingModel, setIsPlayingModel] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const summaryShownRef = useRef(false);

  const ttsHandleRef = useRef<TTSHandle | null>(null);
  const { lastRecordingUrl, isPlayingReplay, micDenied, activeStream, startMediaRecorder, stopMediaRecorder, handleReplay, clearRecording } = useAudioCapture();

  const isAudioActive = isRecording || isPlayingModel;

  const practiceTimer = usePracticeTimer({
    userId, courseType, activityType: "pronunciation",
    weekNumber: courseWeek.selectedWeek, practiceMode: "homework", isAudioActive,
  });

  useEffect(() => { preloadStressDict(); }, []);
  useEffect(() => { fetchPronunciationItems().then(setTwisters).catch(() => {}); }, []);

  useEffect(() => {
    if (!progress.loading && twisters.length > 0) {
      const savedIndex = progress.position.index ?? 0;
      setCurrentIndex(savedIndex % twisters.length);
    }
  }, [progress.loading, twisters.length]);

  const currentTwister = twisters[currentIndex];
  useEffect(() => {
    if (!currentTwister) return;
    setProsodyData(parseProsody(currentTwister.text));
    setActiveWordIndex(-1);
  }, [currentTwister?.text]);

  const navigateTo = useCallback(async (newIndex: number) => {
    const wrappedIndex = ((newIndex % twisters.length) + twisters.length) % twisters.length;
    setCurrentIndex(wrappedIndex); clearRecording();
    await progress.savePosition({ index: wrappedIndex });
  }, [twisters.length, clearRecording, progress]);

  const handlePrev = () => navigateTo(currentIndex - 1);
  const handleNext = () => navigateTo(currentIndex + 1);
  const handleRepeat = () => { clearRecording(); setActiveWordIndex(-1); };

  const handlePlayModel = async () => {
    if (!currentTwister) return;
    if (isPlayingModel) { ttsHandleRef.current?.stop(); setIsPlayingModel(false); setActiveWordIndex(-1); return; }
    setIsPlayingModel(true); setActiveWordIndex(0);
    ttsHandleRef.current = speak(currentTwister.text, accent, {
      rate: 0.8, pitch: 1.1,
      onBoundary: (charIndex) => { const idx = matchCharIndex(prosodyData, charIndex); setActiveWordIndex(idx); },
      onEnd: () => { setIsPlayingModel(false); setActiveWordIndex(-1); },
    });
  };

  const handleRecord = async () => {
    if (isRecording) { setIsRecording(false); stopMediaRecorder(); }
    else { setIsRecording(true); clearRecording(); await startMediaRecorder(); }
  };

  useEffect(() => {
    if (practiceTimer.isComplete && !summaryShownRef.current) { summaryShownRef.current = true; setShowSummary(true); }
  }, [practiceTimer.isComplete]);

  if (twisters.length === 0 || progress.loading || timerSettings.loading) {
    return <PracticeSkeleton />;
  }

  const moduleLabel = currentTwister?.target_sound ?? `Module ${currentTwister?.module ?? "?"}`;

  return (
    <PageShell fullWidth loopVideos={videoList} hideFooter>
      <div className="relative w-full h-full text-white font-outfit select-none animate-fade-in-up">
        <PracticeHeader badgeClass={config.badgeClass} badgeLabel={config.badgeLabel} />

        {/* Timer */}
        <div className="absolute top-16 left-4 z-50">
          {timerSettings.countdownMinutes && (
            <CountdownTimer countdownFrom={timerSettings.countdownMinutes} activeSeconds={practiceTimer.activeSeconds} isRunning={practiceTimer.isRunning} onPause={practiceTimer.pause} onResume={practiceTimer.resume} label="Pronunciation" />
          )}
        </div>

        {/* Floating Info Panel */}
        <div className="absolute top-40 left-4 z-50">
          <FloatingInfoPanel course={config.courseLabel} weekNumber={courseWeek.selectedWeek} questionType="Pronunciation" questionNumber={moduleLabel} />
        </div>

        {/* Accent selector – top right */}
        <div className="absolute right-4 top-16 z-50">
          <AccentSelector accent={accent} onChange={setAccent} />
        </div>

        {/* Vertical button stack – far right */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 z-50 flex flex-col items-center gap-2">
          <button onClick={handlePrev} className="w-10 h-10 rounded-xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all active:scale-95" title="Previous">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={handlePlayModel} className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all active:scale-95 ${isPlayingModel ? "bg-cyan-500/20 border border-cyan-500/30 text-cyan-300" : "bg-white/[0.06] border border-white/[0.08] text-white/50 hover:text-white hover:bg-white/10"}`} title="Hear Model">
            {isPlayingModel ? <Loader2 className="w-5 h-5 animate-spin" /> : <Headphones className="w-5 h-5" />}
          </button>
          <MicRecordButton isRecording={isRecording} micDenied={micDenied} onToggle={handleRecord} stream={activeStream} size="lg" shape="rounded" />
          <button onClick={lastRecordingUrl ? handleReplay : undefined} disabled={!lastRecordingUrl} className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all active:scale-95 ${!lastRecordingUrl ? "text-white/20 opacity-30 cursor-not-allowed" : isPlayingReplay ? "bg-emerald-500/20 border border-emerald-500/30 text-emerald-300" : "bg-white/[0.06] border border-white/[0.08] text-emerald-400/80 hover:text-emerald-300 hover:bg-emerald-500/10"}`} title="Replay">
            <Play className="w-5 h-5 ml-0.5" />
          </button>
          <button onClick={handleRepeat} className="w-10 h-10 rounded-xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all active:scale-95" title="Repeat">
            <RotateCcw className="w-4 h-4" />
          </button>
          <button onClick={handleNext} className="w-10 h-10 rounded-xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all active:scale-95" title="Next">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Bottom bar: karaoke text + waveform */}
        <div className="absolute bottom-0 left-0 right-16 pb-4 pt-8 px-8 flex flex-col items-center z-40 bg-gradient-to-t from-black/85 via-black/50 to-transparent">
          <div key={currentIndex} className="mb-2 w-full text-center relative z-10 animate-fade-in">
            <ProsodyVisualizer data={prosodyData} activeWordIndex={activeWordIndex} />
          </div>

          <div className="w-full max-w-3xl flex items-center gap-2">
            <div className="flex-1 min-w-0">
              {/* Progress indicator */}
              <div className="w-full h-[2px] bg-white/[0.06] rounded-full mb-1 overflow-hidden">
                <div className="h-full bg-cyan-400/40 rounded-full transition-all duration-500 ease-out" style={{ width: `${((currentIndex + 1) / twisters.length) * 100}%` }} />
              </div>
              {/* Waveform comparison */}
              <DualWaveform modelAudioUrl={null} studentAudioUrl={lastRecordingUrl} isPlayingModel={isPlayingModel} isRecording={isRecording} />
            </div>
            {/* Item counter pill */}
            <div className="bg-black/50 backdrop-blur-2xl border border-white/[0.08] rounded-2xl px-3 py-2 text-center flex-shrink-0">
              <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/40 block">Item</span>
              <span className="text-lg font-bold text-white/90">{currentIndex + 1}</span>
              <span className="text-white/30 text-sm font-medium"> / {twisters.length}</span>
            </div>
          </div>
        </div>
        <PracticeSummaryOverlay visible={showSummary} activeSeconds={practiceTimer.activeSeconds} targetSeconds={practiceTimer.targetSeconds} activityLabel="Pronunciation" onDismiss={() => setShowSummary(false)} />
      </div>
    </PageShell>
  );
}
