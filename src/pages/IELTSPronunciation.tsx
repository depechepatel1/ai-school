/**
 * IELTS Pronunciation Screen — Tongue Twisters
 * 
 * Rotates through tongue twisters continuously with persistent progress.
 * Uses timer_settings for 5-minute countdown (shadowing-pronunciation).
 */
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useCourseWeek } from "@/hooks/useCourseWeek";
import { useStudentProgress } from "@/hooks/useStudentProgress";
import { useTimerSettings } from "@/hooks/useTimerSettings";
import { usePracticeTimer } from "@/hooks/usePracticeTimer";
import { useAudioCapture } from "@/hooks/useAudioCapture";
import { fetchTongueTwisters, type TongueTwister } from "@/services/tongue-twisters";
import { speak, stopSpeaking, preloadVoices, preloadAccent, type TTSHandle } from "@/lib/tts-provider";
import { parseProsody, type WordData } from "@/lib/prosody";
import { usePronunciationTimings } from "@/hooks/useTTSTimings";
import ProsodyVisualizer from "@/components/speaking/ProsodyVisualizer";
import PronunciationVisualizer from "@/components/speaking/PronunciationVisualizer";
import CountdownTimer from "@/components/speaking/CountdownTimer";
import PageShell, { VIDEO_1_STACK } from "@/components/PageShell";
import { ArrowLeft, ChevronLeft, ChevronRight, RotateCcw, Headphones, Play, Loader2 } from "lucide-react";
import MicRecordButton from "@/components/speaking/MicRecordButton";
import { useRef } from "react";
import { analyzeContour } from "@/lib/speech-analysis-provider";

export default function IELTSPronunciation() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const courseWeek = useCourseWeek(userId);
  const progress = useStudentProgress({ userId, courseType: "ielts", moduleType: "tongue-twisters" });
  const timerSettings = useTimerSettings("ielts", "shadowing-pronunciation");
  const pronunciationTimings = usePronunciationTimings();

  const [twisters, setTwisters] = useState<TongueTwister[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [prosodyData, setProsodyData] = useState<WordData[]>([]);
  const [activeWordIndex, setActiveWordIndex] = useState(-1);
  const [targetProgress, setTargetProgress] = useState(0);
  const [isPlayingModel, setIsPlayingModel] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [sentenceKey, setSentenceKey] = useState(0);

  const ttsHandleRef = useRef<TTSHandle | null>(null);
  const { lastRecordingUrl, isPlayingReplay, micDenied, activeStream, startMediaRecorder, stopMediaRecorder, handleReplay, clearRecording } = useAudioCapture();

  const isAudioActive = isRecording || isPlayingModel;

  const practiceTimer = usePracticeTimer({
    userId,
    courseType: courseWeek.courseType,
    activityType: "pronunciation",
    weekNumber: courseWeek.selectedWeek,
    practiceMode: "homework",
    isAudioActive,
  });

  // Load tongue twisters
  useEffect(() => {
    fetchTongueTwisters()
      .then(setTwisters)
      .catch(console.error);
    preloadVoices();
    preloadAccent("uk");
  }, []);

  // Resume from saved progress
  useEffect(() => {
    if (!progress.loading && twisters.length > 0) {
      const savedIndex = progress.position.index ?? 0;
      setCurrentIndex(savedIndex % twisters.length);
    }
  }, [progress.loading, twisters.length]);

  // Update prosody when current twister changes
  const currentTwister = twisters[currentIndex];
  useEffect(() => {
    if (!currentTwister) return;
    setProsodyData(parseProsody(currentTwister.text));
    setTargetProgress(0);
    setActiveWordIndex(-1);
    setSentenceKey((k) => k + 1);
  }, [currentTwister?.text]);

  const computeTargetProgress = useCallback((wordIdx: number) => {
    if (prosodyData.length === 0) return 0;
    const allSyl = prosodyData.flatMap((d) => d.syllables);
    if (allSyl.length === 0) return 0;
    let sylCount = 0;
    for (let i = 0; i <= wordIdx && i < prosodyData.length; i++) {
      sylCount += prosodyData[i].syllables.length;
    }
    return Math.min(1, sylCount / allSyl.length);
  }, [prosodyData]);

  const navigateTo = useCallback(async (newIndex: number) => {
    const wrappedIndex = ((newIndex % twisters.length) + twisters.length) % twisters.length;
    setCurrentIndex(wrappedIndex);
    clearRecording();
    await progress.savePosition({ index: wrappedIndex });
  }, [twisters.length, clearRecording, progress]);

  const handlePrev = () => navigateTo(currentIndex - 1);
  const handleNext = () => navigateTo(currentIndex + 1);
  const handleRepeat = () => {
    clearRecording();
    setSentenceKey((k) => k + 1);
    setTargetProgress(0);
    setActiveWordIndex(-1);
  };

  const handlePlayModel = async () => {
    if (!currentTwister) return;
    if (isPlayingModel) {
      ttsHandleRef.current?.stop();
      setIsPlayingModel(false);
      setActiveWordIndex(-1);
      return;
    }
    setIsPlayingModel(true);
    setActiveWordIndex(0);
    setTargetProgress(0);

    ttsHandleRef.current = speak(currentTwister.text, "uk", {
      rate: 0.8, pitch: 1.1,
      onBoundary: (charIndex) => {
        const idx = prosodyData.findIndex((w) => w.startChar <= charIndex && charIndex < w.endChar);
        if (idx !== -1) {
          setActiveWordIndex(idx);
          setTargetProgress(computeTargetProgress(idx));
        }
      },
      onEnd: () => {
        setIsPlayingModel(false);
        setActiveWordIndex(-1);
        setTargetProgress(1);
      },
    });
  };

  const handleRecord = async () => {
    if (isRecording) {
      setIsRecording(false);
      stopMediaRecorder();
    } else {
      setIsRecording(true);
      clearRecording();
      await startMediaRecorder();
    }
  };

  const stopRecordingCb = useCallback(() => {
    setIsRecording(false);
    stopMediaRecorder();
  }, [stopMediaRecorder]);

  const handlePitchContour = useCallback((contour: number[]) => {
    // Optional: could score pronunciation here
  }, []);

  if (twisters.length === 0 || progress.loading || timerSettings.loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const difficultyLabel = currentTwister?.difficulty === 3 ? "Hard" : currentTwister?.difficulty === 2 ? "Medium" : "Easy";
  const difficultyColor = currentTwister?.difficulty === 3 ? "text-red-400" : currentTwister?.difficulty === 2 ? "text-amber-400" : "text-emerald-400";

  return (
    <PageShell fullWidth loopVideos={VIDEO_1_STACK} hideFooter>
      <div className="relative w-full h-full text-white font-outfit select-none animate-fade-in-up">
        {/* Back button + badge */}
        <div className="absolute top-4 left-4 z-[300] flex items-center gap-2">
          <button onClick={() => navigate("/speaking")} className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-black/50 backdrop-blur-2xl border border-white/10 text-white/60 hover:text-white hover:bg-black/70 hover:border-white/20 transition-all text-[11px] font-semibold tracking-wide group">
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" /> Back
          </button>
          <span className="px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-[0.12em] backdrop-blur-2xl bg-amber-500/20 border border-amber-500/30 text-amber-300">
            IELTS · Homework · Pronunciation
          </span>
        </div>

        {/* Timer — top left under badge */}
        <div className="absolute top-16 left-4 z-50">
          {timerSettings.countdownMinutes && (
            <CountdownTimer
              countdownFrom={timerSettings.countdownMinutes}
              activeSeconds={practiceTimer.activeSeconds}
              isRunning={practiceTimer.isRunning}
              onPause={practiceTimer.pause}
              onResume={practiceTimer.resume}
              label="Pronunciation"
            />
          )}
        </div>

        {/* Progress counter — top right */}
        <div className="absolute top-4 right-4 z-50">
          <div className="bg-black/50 backdrop-blur-2xl border border-white/[0.08] rounded-2xl px-4 py-2.5 text-center">
            <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-white/40 block">Tongue Twister</span>
            <span className="text-lg font-bold text-white/90">{currentIndex + 1}</span>
            <span className="text-white/30 text-sm font-medium"> / {twisters.length}</span>
            <div className="mt-1">
              <span className={`text-[9px] font-bold uppercase tracking-wider ${difficultyColor}`}>
                {difficultyLabel}
              </span>
            </div>
          </div>
        </div>

        {/* Main content — center */}
        <div className="absolute bottom-0 left-0 right-0 pb-6 pt-12 px-8 flex flex-col items-center z-40 bg-gradient-to-t from-black/85 via-black/60 to-transparent">
          {/* Karaoke text */}
          <div key={sentenceKey} className="mb-3 w-full text-center relative z-10 animate-fade-in">
            <ProsodyVisualizer data={prosodyData} activeWordIndex={activeWordIndex} />
          </div>

          {/* Visualizer */}
          <div className="w-full max-w-3xl mb-4">
            <div onClick={handlePlayModel} className="relative h-20 rounded-2xl overflow-hidden transition-all duration-500 group cursor-pointer bg-white/[0.03] backdrop-blur-[40px] border border-white/10 shadow-[0_0_30px_-5px_rgba(34,211,238,0.3)]">
              <div className="absolute top-2 left-4 flex items-center gap-3 z-10">
                <span className="text-[9px] font-black uppercase text-cyan-300 tracking-[0.2em] opacity-70">Target</span>
                <span className="text-[9px] font-black uppercase text-green-300 tracking-[0.2em] opacity-70">Live</span>
              </div>
              <div className="absolute inset-0 px-8 py-2">
                <PronunciationVisualizer
                  isRecording={isRecording}
                  isPlayingModel={isPlayingModel}
                  activeWordIndex={activeWordIndex}
                  prosodyData={prosodyData}
                  targetProgress={targetProgress}
                  sentenceKey={sentenceKey}
                  onAutoStop={stopRecordingCb}
                  onPitchContour={handlePitchContour}
                  measuredDurationMs={pronunciationTimings.getDuration(currentTwister?.text ?? "")}
                />
              </div>
            </div>
          </div>

          {/* Navigation + Action buttons */}
          <div className="flex items-center gap-3">
            <button onClick={handlePrev} className="w-12 h-12 rounded-xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all active:scale-95" title="Previous">
              <ChevronLeft className="w-5 h-5" />
            </button>

            <button onClick={handlePlayModel} className={`w-14 h-14 rounded-xl flex items-center justify-center transition-all active:scale-95 ${isPlayingModel ? "bg-cyan-500/20 border border-cyan-500/30 text-cyan-300" : "bg-white/[0.06] border border-white/[0.08] text-white/50 hover:text-white hover:bg-white/10"}`} title="Hear Model">
              {isPlayingModel ? <Loader2 className="w-6 h-6 animate-spin" /> : <Headphones className="w-6 h-6" />}
            </button>

            <MicRecordButton
              isRecording={isRecording}
              micDenied={micDenied}
              onToggle={handleRecord}
              stream={activeStream}
              size="lg"
              shape="rounded"
            />

            <button
              onClick={lastRecordingUrl ? handleReplay : undefined}
              disabled={!lastRecordingUrl}
              className={`w-14 h-14 rounded-xl flex items-center justify-center transition-all active:scale-95 ${!lastRecordingUrl ? "text-white/20 opacity-30 cursor-not-allowed" : isPlayingReplay ? "bg-emerald-500/20 border border-emerald-500/30 text-emerald-300" : "bg-white/[0.06] border border-white/[0.08] text-emerald-400/80 hover:text-emerald-300 hover:bg-emerald-500/10"}`}
              title="Replay"
            >
              <Play className="w-6 h-6 ml-0.5" />
            </button>

            <button onClick={handleRepeat} className="w-12 h-12 rounded-xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all active:scale-95" title="Repeat">
              <RotateCcw className="w-5 h-5" />
            </button>

            <button onClick={handleNext} className="w-12 h-12 rounded-xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all active:scale-95" title="Next">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
