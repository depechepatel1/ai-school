/**
 * IGCSE Shadowing Fluency Screen
 * 
 * Uses igcse/shadowing-fluency.json from curriculum bucket.
 * Presents model answer chunks with karaoke text.
 * Timer: 10-minute countdown from timer_settings (igcse/shadowing-fluency).
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useCourseWeek } from "@/hooks/useCourseWeek";
import { useShadowingCurriculum } from "@/hooks/useShadowingCurriculum";
import { useTimerSettings } from "@/hooks/useTimerSettings";
import { usePracticeTimer } from "@/hooks/usePracticeTimer";
import { useAudioCapture } from "@/hooks/useAudioCapture";
import { speak, preloadVoices, preloadAccent, type TTSHandle } from "@/lib/tts-provider";
import { parseProsody, type WordData } from "@/lib/prosody";
import ProsodyVisualizer from "@/components/speaking/ProsodyVisualizer";
import PronunciationVisualizer from "@/components/speaking/PronunciationVisualizer";
import CountdownTimer from "@/components/speaking/CountdownTimer";
import FloatingInfoPanel from "@/components/speaking/FloatingInfoPanel";
import PageShell, { VIDEO_1_STACK } from "@/components/PageShell";
import { ArrowLeft, Headphones, Mic, Play, Loader2, RotateCcw, SkipForward, Rewind } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function IGCSEFluency() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const courseWeek = useCourseWeek(userId);
  // Force igcse course type for curriculum loading
  const shadowCurriculum = useShadowingCurriculum("igcse", courseWeek.shadowingWeek);
  const timerSettings = useTimerSettings("igcse", "shadowing-fluency");

  const [prosodyData, setProsodyData] = useState<WordData[]>([]);
  const [activeWordIndex, setActiveWordIndex] = useState(-1);
  const [targetProgress, setTargetProgress] = useState(0);
  const [isPlayingModel, setIsPlayingModel] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [sentenceKey, setSentenceKey] = useState(0);
  const [showEndPopup, setShowEndPopup] = useState(false);

  const ttsHandleRef = useRef<TTSHandle | null>(null);
  const { lastRecordingUrl, isPlayingReplay, startMediaRecorder, stopMediaRecorder, handleReplay, clearRecording } = useAudioCapture();

  const isAudioActive = isRecording || isPlayingModel;

  const practiceTimer = usePracticeTimer({
    userId,
    courseType: "igcse",
    activityType: "shadowing",
    weekNumber: courseWeek.selectedWeek,
    practiceMode: "homework",
    isAudioActive,
  });

  useEffect(() => { preloadVoices(); preloadAccent("uk"); }, []);

  const currentText = shadowCurriculum.currentChunk?.text ?? "";
  useEffect(() => {
    if (!currentText) return;
    setProsodyData(parseProsody(currentText));
    setTargetProgress(0);
    setActiveWordIndex(-1);
    setSentenceKey((k) => k + 1);
    setShowEndPopup(false);
  }, [currentText]);

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

  // IGCSE-specific section labels
  const sectionMap: Record<string, string> = {
    model_answer: "Model Answer", weekly_topic: "Weekly Topic", transcription: "Weekly Topic",
  };
  const sectionLabel = shadowCurriculum.currentSectionId ? sectionMap[shadowCurriculum.currentSectionId] ?? shadowCurriculum.currentSectionId : "";
  const questionId = shadowCurriculum.currentQuestionId?.toUpperCase() ?? "";

  const handlePlayModel = async () => {
    if (!currentText) return;
    if (isPlayingModel) {
      ttsHandleRef.current?.stop();
      setIsPlayingModel(false);
      setActiveWordIndex(-1);
      return;
    }
    setIsPlayingModel(true);
    setActiveWordIndex(0);
    setTargetProgress(0);

    ttsHandleRef.current = speak(currentText, "uk", {
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

  const isLastChunkOfAnswer = useCallback(() => {
    if (shadowCurriculum.chunks.length === 0) return false;
    const nextIdx = shadowCurriculum.currentIndex + 1;
    if (nextIdx >= shadowCurriculum.chunks.length) return true;
    const currentQ = shadowCurriculum.currentChunk?.question_text;
    const nextQ = shadowCurriculum.chunks[nextIdx]?.question_text;
    return currentQ !== nextQ;
  }, [shadowCurriculum]);

  const handleNextChunk = () => {
    clearRecording();
    if (isLastChunkOfAnswer()) {
      setShowEndPopup(true);
    } else {
      shadowCurriculum.nextChunk();
    }
  };

  const handleRepeatAnswer = () => {
    setShowEndPopup(false);
    shadowCurriculum.resetToFirst();
  };

  const handleNextAnswer = () => {
    setShowEndPopup(false);
    shadowCurriculum.nextChunk();
    clearRecording();
  };

  const handleStartFromBeginning = () => {
    setShowEndPopup(false);
    shadowCurriculum.resetToFirst();
    clearRecording();
  };

  if (courseWeek.loading || shadowCurriculum.loading || timerSettings.loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <PageShell fullWidth loopVideos={VIDEO_1_STACK} hideFooter>
      <div className="relative w-full h-full text-white font-outfit select-none animate-fade-in-up">
        {/* Back + badge */}
        <div className="absolute top-4 left-4 z-[300] flex items-center gap-2">
          <button onClick={() => navigate("/speaking")} className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-black/50 backdrop-blur-2xl border border-white/10 text-white/60 hover:text-white hover:bg-black/70 hover:border-white/20 transition-all text-[11px] font-semibold tracking-wide group">
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" /> Back
          </button>
          <span className="px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-[0.12em] backdrop-blur-2xl bg-teal-500/20 border border-teal-500/30 text-teal-300">
            IGCSE · Homework · Shadowing Fluency
          </span>
        </div>

        {/* Timer */}
        <div className="absolute top-16 left-4 z-50">
          {timerSettings.countdownMinutes && (
            <CountdownTimer
              countdownFrom={timerSettings.countdownMinutes}
              activeSeconds={practiceTimer.activeSeconds}
              isRunning={practiceTimer.isRunning}
              onPause={practiceTimer.pause}
              onResume={practiceTimer.resume}
              label="Shadowing"
            />
          )}
        </div>

        {/* Floating Info Panel */}
        <div className="absolute top-32 left-4 z-50">
          <FloatingInfoPanel
            course="IGCSE"
            weekNumber={courseWeek.shadowingWeek}
            questionType={sectionLabel}
            questionNumber={questionId}
            questionText={shadowCurriculum.currentQuestionText?.split("?")[0] + "?"}
          />
        </div>

        {/* Chunk progress */}
        <div className="absolute top-4 right-4 z-50">
          <div className="bg-black/50 backdrop-blur-2xl border border-white/[0.08] rounded-2xl px-4 py-2.5 text-center">
            <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-white/40 block">Chunk</span>
            <span className="text-lg font-bold text-white/90">{shadowCurriculum.currentIndex + 1}</span>
            <span className="text-white/30 text-sm font-medium"> / {shadowCurriculum.totalChunks}</span>
          </div>
        </div>

        {/* Main content */}
        <div className="absolute bottom-0 left-0 right-0 pb-6 pt-12 px-8 flex flex-col items-center z-40 bg-gradient-to-t from-black/85 via-black/60 to-transparent">
          {shadowCurriculum.currentQuestionText && (
            <p className="text-[13px] italic text-white/70 max-w-lg mx-auto mb-1.5 text-center line-clamp-2 leading-relaxed">
              Q: {shadowCurriculum.currentQuestionText.split("?")[0]}?
            </p>
          )}

          <div key={sentenceKey} className="mb-3 w-full text-center relative z-10 animate-fade-in">
            <ProsodyVisualizer data={prosodyData} activeWordIndex={activeWordIndex} />
          </div>

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
                  onPitchContour={() => {}}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={handlePlayModel} className={`w-14 h-14 rounded-xl flex items-center justify-center transition-all active:scale-95 ${isPlayingModel ? "bg-cyan-500/20 border border-cyan-500/30 text-cyan-300" : "bg-white/[0.06] border border-white/[0.08] text-white/50 hover:text-white hover:bg-white/10"}`} title="Hear Model">
              {isPlayingModel ? <Loader2 className="w-6 h-6 animate-spin" /> : <Headphones className="w-6 h-6" />}
            </button>
            <button onClick={handleRecord} className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300 ${isRecording ? "bg-red-500 shadow-[0_0_24px_rgba(239,68,68,0.4)] scale-105" : "bg-white/[0.06] border border-white/[0.08] hover:bg-white/[0.1]"}`} title={isRecording ? "Stop" : "Record"}>
              {isRecording ? <div className="w-6 h-6 bg-white rounded-sm animate-pulse" /> : <Mic className="w-8 h-8 text-white/80" />}
            </button>
            <button
              onClick={lastRecordingUrl ? handleReplay : undefined}
              disabled={!lastRecordingUrl}
              className={`w-14 h-14 rounded-xl flex items-center justify-center transition-all active:scale-95 ${!lastRecordingUrl ? "text-white/20 opacity-30 cursor-not-allowed" : isPlayingReplay ? "bg-emerald-500/20 border border-emerald-500/30 text-emerald-300" : "bg-white/[0.06] border border-white/[0.08] text-emerald-400/80 hover:text-emerald-300 hover:bg-emerald-500/10"}`}
              title="Replay"
            >
              <Play className="w-6 h-6 ml-0.5" />
            </button>
            <button onClick={handleNextChunk} className="w-12 h-12 rounded-xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-white/50 hover:text-cyan-300 hover:bg-cyan-500/10 transition-all active:scale-95" title="Next Chunk">
              <SkipForward className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* End-of-answer popup */}
        <AnimatePresence>
          {showEndPopup && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="absolute inset-0 z-[500] flex items-center justify-center bg-black/60 backdrop-blur-sm"
            >
              <div className="bg-black/80 backdrop-blur-2xl border border-white/[0.12] rounded-3xl p-8 max-w-sm w-full mx-4 shadow-[0_0_60px_rgba(0,0,0,0.5)]">
                <h3 className="text-lg font-bold text-white mb-2">Model Answer Complete</h3>
                <p className="text-sm text-white/50 mb-6">What would you like to do next?</p>
                <div className="flex flex-col gap-2.5">
                  <button onClick={handleRepeatAnswer} className="w-full px-4 py-3 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-200 text-sm font-bold hover:bg-amber-500/30 transition-all flex items-center gap-2 justify-center">
                    <RotateCcw className="w-4 h-4" /> Repeat this answer
                  </button>
                  <button onClick={handleNextAnswer} className="w-full px-4 py-3 rounded-xl bg-cyan-500/20 border border-cyan-500/30 text-cyan-200 text-sm font-bold hover:bg-cyan-500/30 transition-all flex items-center gap-2 justify-center">
                    <SkipForward className="w-4 h-4" /> Next answer
                  </button>
                  <button onClick={handleStartFromBeginning} className="w-full px-4 py-3 rounded-xl bg-white/[0.06] border border-white/[0.08] text-white/60 text-sm font-bold hover:bg-white/10 transition-all flex items-center gap-2 justify-center">
                    <Rewind className="w-4 h-4" /> Start from beginning
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PageShell>
  );
}
