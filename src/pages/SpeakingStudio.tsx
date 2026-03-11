import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { usePageTitle } from "@/hooks/usePageTitle";
import { ArrowLeft } from "lucide-react";
import PageShell, { VIDEO_1_STACK } from "@/components/PageShell";
import { parseProsody, type WordData } from "@/lib/prosody";
import { speak, preloadAccent, type Accent } from "@/lib/tts-provider";
import { analyzeContour } from "@/lib/speech-analysis-provider";

// ── Components ──
import XPWidget from "@/components/speaking/XPWidget";
import StreakWidget from "@/components/speaking/StreakWidget";
import CountdownOverlay from "@/components/speaking/CountdownOverlay";
import SaveSessionModal from "@/components/speaking/SaveSessionModal";
import ShadowingPanel from "@/components/speaking/ShadowingPanel";
import SpeakingPanel from "@/components/speaking/SpeakingPanel";
import MicDeniedOverlay from "@/components/speaking/MicDeniedOverlay";

// ── Hooks ──
import { useXP } from "@/hooks/useXP";
import { useAudioCapture } from "@/hooks/useAudioCapture";
import { useCurriculum } from "@/hooks/useCurriculum";
import { useSpeakingTest } from "@/hooks/useSpeakingTest";
import { useCourseWeek } from "@/hooks/useCourseWeek";
import { useFluencyTimings, usePronunciationTimings } from "@/hooks/useTTSTimings";
import { useShadowingCurriculum } from "@/hooks/useShadowingCurriculum";
import { usePracticeTimer, type ActivityType, type PracticeMode } from "@/hooks/usePracticeTimer";
import { getSpeakingQuestions, type SpeakingQuestion } from "@/services/curriculum-storage";

export default function SpeakingStudio() {
  usePageTitle("Speaking Studio");
  const navigate = useNavigate();
  const { user } = useAuth();
  const userId = user?.id ?? null;

  // ── Local UI state ──
  const [mode, setMode] = useState<"shadowing" | "speaking">("shadowing");
  const practiceMode: PracticeMode = "homework";
  const [accent, setAccent] = useState<"UK" | "US">("UK");
  const [practiceType, setPracticeType] = useState<"pronunciation" | "fluency">("pronunciation");
  const [rawText, setRawText] = useState("");
  const [prosodyData, setProsodyData] = useState<WordData[]>([]);
  const [isPlayingModel, setIsPlayingModel] = useState(false);
  const [activeWordIndex, setActiveWordIndex] = useState(-1);
  const [targetProgress, setTargetProgress] = useState(0);
  const [sentenceKey, setSentenceKey] = useState(0);
  const [isRecordingShadow, setIsRecordingShadow] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const accentLower = accent.toLowerCase() as Accent;

  // ── Hooks ──
  const { xp, level, addXP } = useXP();
  const { lastRecordingUrl, isPlayingReplay, micDenied, activeStream, startMediaRecorder, stopMediaRecorder, handleReplay, clearRecording, clearMicDenied } = useAudioCapture();
  const curriculum = useCurriculum(userId, "pronunciation");
  const test = useSpeakingTest({ accent: accentLower });
  const courseWeek = useCourseWeek(userId);
  const shadowCurriculum = useShadowingCurriculum(courseWeek.courseType, courseWeek.shadowingWeek);
  const fluencyTimings = useFluencyTimings(courseWeek.courseType as "ielts" | "igcse" | null);
  const pronunciationTimings = usePronunciationTimings();
  const [speakingQuestions, setSpeakingQuestions] = useState<SpeakingQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  const timerActivityType: ActivityType = mode === "speaking" ? "speaking" : practiceType === "fluency" ? "shadowing" : "pronunciation";
  const isAudioActive = isRecordingShadow || isPlayingModel || test.isRecording;

  const practiceTimer = usePracticeTimer({
    userId,
    courseType: courseWeek.courseType,
    activityType: timerActivityType,
    weekNumber: courseWeek.selectedWeek,
    practiceMode,
    isAudioActive,
  });

  // ── Effects ──
  useEffect(() => {
    setProsodyData(parseProsody(rawText));
    setTargetProgress(0);
    setActiveWordIndex(-1);
    setSentenceKey((k) => k + 1);
  }, [rawText]);

  useEffect(() => { preloadAccent(accentLower); }, [accentLower]);

  useEffect(() => {
    if (curriculum.currentSentence && practiceType === "pronunciation") setRawText(curriculum.currentSentence);
  }, [curriculum.currentSentence, practiceType]);

  useEffect(() => {
    if (practiceType === "fluency") setRawText(shadowCurriculum.currentChunk?.text ?? "");
  }, [practiceType, shadowCurriculum.currentChunk]);

  useEffect(() => {
    if (!courseWeek.courseType || !shadowCurriculum.curriculumData) return;
    const qs = getSpeakingQuestions(shadowCurriculum.curriculumData, courseWeek.selectedWeek);
    setSpeakingQuestions(qs);
    setCurrentQuestionIndex(0);
  }, [courseWeek.courseType, courseWeek.selectedWeek, shadowCurriculum.curriculumData]);

  useEffect(() => { chatScrollRef.current?.scrollIntoView({ behavior: "smooth" }); }, [test.messages, test.isAiThinking]);

  // ── Handlers ──
  const handleGenerate = (type: "pronunciation" | "fluency") => {
    if (type === "pronunciation") curriculum.loadCurriculumPage(Math.floor(Math.random() * 100) * 5);
    clearRecording();
  };

  const handleNextSentence = useCallback(async () => {
    clearRecording();
    if (practiceType === "fluency") {
      shadowCurriculum.nextChunk();
    } else {
      const sentence = await curriculum.handleNextSentence();
      if (sentence) setRawText(sentence);
    }
  }, [curriculum, clearRecording, practiceType, shadowCurriculum]);

  const handlePitchContour = useCallback((contour: number[]) => {
    if (mode === "shadowing" && contour.length > 0) {
      curriculum.saveProgress(analyzeContour(contour, rawText).overallScore);
    }
  }, [mode, rawText, curriculum]);

  const computeTargetProgress = useCallback((wordIdx: number) => {
    if (prosodyData.length === 0) return 0;
    const allSyl = prosodyData.flatMap((d) => d.syllables);
    if (allSyl.length === 0) return 0;
    let sylCount = 0;
    for (let i = 0; i <= wordIdx && i < prosodyData.length; i++) sylCount += prosodyData[i].syllables.length;
    return Math.min(1, sylCount / allSyl.length);
  }, [prosodyData]);

  const handlePlayModel = async () => {
    if (isPlayingModel) {
      test.ttsHandleRef.current?.stop();
      setIsPlayingModel(false);
      setActiveWordIndex(-1);
      return;
    }
    setIsPlayingModel(true);
    setActiveWordIndex(0);
    setTargetProgress(0);
    test.ttsHandleRef.current = speak(rawText, accentLower, {
      rate: 0.8, pitch: 1.1,
      onBoundary: (charIndex) => {
        const idx = prosodyData.findIndex((w) => w.startChar <= charIndex && charIndex < w.endChar);
        if (idx !== -1) { setActiveWordIndex(idx); setTargetProgress(computeTargetProgress(idx)); }
      },
      onEnd: () => { setIsPlayingModel(false); setActiveWordIndex(-1); setTargetProgress(1); },
    });
    addXP(5);
  };

  const startShadowRecording = async () => {
    setIsRecordingShadow(true);
    clearRecording();
    await startMediaRecorder();
  };

  const stopShadowRecording = useCallback(() => {
    setIsRecordingShadow(false);
    stopMediaRecorder();
    addXP(20);
  }, [stopMediaRecorder, addXP]);

  const handleRecord = async () => {
    if (mode === "speaking") {
      if (test.testState.status !== "idle") { test.stopTestManual(); stopMediaRecorder(); return; }
      if (test.isRecording) {
        test.setIsRecording(false);
        test.stopSpeechRecognition();
        stopMediaRecorder();
        addXP(20);
      } else {
        test.setIsRecording(true);
        await startMediaRecorder();
        test.startSpeechRecognition();
      }
      return;
    }
    if (isRecordingShadow) stopShadowRecording();
    else startShadowRecording();
  };

  // ── Render ──
  return (
    <PageShell fullWidth loopVideos={VIDEO_1_STACK} hideFooter>
      <div className="relative w-full h-full text-white font-outfit select-none animate-fade-in-up">
        {/* Back button + course badge */}
        <div className="absolute top-4 left-4 z-[300] flex items-center gap-2">
          <button onClick={() => navigate("/student")} aria-label="Go back to student dashboard" className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-black/50 backdrop-blur-2xl border border-white/10 text-white/60 hover:text-white hover:bg-black/70 hover:border-white/20 transition-all text-[11px] font-semibold tracking-wide group">
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" /> Back
          </button>
          {courseWeek.courseType && (
            <span className="px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-[0.12em] backdrop-blur-2xl bg-amber-500/20 border border-amber-500/30 text-amber-300">
              {courseWeek.courseType === "ielts" ? "IELTS" : "IGCSE"} · Homework · Speaking
            </span>
          )}
        </div>

        {/* Top Bar */}
        <div className="absolute top-16 left-0 right-0 px-2 sm:px-3 z-50 flex justify-between items-start">
          <div className="gap-2.5 ml-2 flex flex-col animate-fade-in">
            {test.testState.status === "idle" && (
              <div className="flex p-1 gap-1 rounded-2xl bg-black/50 backdrop-blur-2xl border border-white/[0.08] shadow-[0_4px_24px_-4px_rgba(0,0,0,0.5)]">
                <button onClick={() => setMode("shadowing")} aria-pressed={mode === "shadowing"} className={`px-4 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all duration-300 ${mode === "shadowing" ? "bg-cyan-500/90 text-black shadow-[0_2px_12px_rgba(6,182,212,0.4)]" : "text-white/35 hover:text-white/60"}`}>
                  Shadowing
                </button>
                <button onClick={() => { setMode("speaking"); if (courseWeek.courseType === "ielts") test.setShowTestConfig(true); }} aria-pressed={mode === "speaking"} className={`px-4 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all duration-300 ${mode === "speaking" ? "bg-purple-500/90 text-white shadow-[0_2px_12px_rgba(168,85,247,0.4)]" : "text-white/35 hover:text-white/60"}`}>
                  Speaking
                </button>
              </div>
            )}
            <div style={{ animationDelay: "0s" }} className="animate-fade-in">
              <StreakWidget
                displaySeconds={practiceTimer.displaySeconds}
                isCountdown={practiceTimer.isCountdown}
                isComplete={practiceTimer.isComplete}
                isRunning={practiceTimer.isRunning}
                isOvertime={practiceTimer.isOvertime}
                modeLabel="Homework"
                onPause={practiceTimer.pause}
                onResume={practiceTimer.resume}
              />
            </div>
            {mode === "shadowing" && (
              <>
                {curriculum.currentTopic && practiceType === "pronunciation" && (
                  <div className="bg-black/40 backdrop-blur-2xl border border-white/[0.06] rounded-2xl px-3.5 py-2.5 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.5)] hover:border-white/[0.12] transition-colors animate-fade-in" style={{ animationDelay: "0.1s" }}>
                    <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-white/35">Topic</span>
                    <div className="text-[13px] font-semibold text-white/90 mt-1 leading-tight">{curriculum.currentTopic}</div>
                  </div>
                )}
                <div className="flex gap-0.5 bg-black/40 backdrop-blur-2xl border border-white/[0.06] rounded-2xl p-1 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.5)] animate-fade-in" style={{ animationDelay: "0.2s" }}>
                  {(["pronunciation", "fluency"] as const).map((t) => (
                    <button key={t} onClick={() => { setPracticeType(t); handleGenerate(t); }} className={`px-3.5 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all duration-200 ${practiceType === t ? "bg-white/10 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]" : "text-white/30 hover:text-white/60 hover:bg-white/[0.04]"}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          <div className="flex flex-col gap-2.5 items-end -mt-2 mr-1">
            <XPWidget xp={xp} level={level} />
          </div>
        </div>

        {/* ── Mode Panels ── */}
        {mode === "shadowing" && (
          <ShadowingPanel
            practiceType={practiceType}
            accent={accent}
            setAccent={setAccent}
            prosodyData={prosodyData}
            activeWordIndex={activeWordIndex}
            sentenceKey={sentenceKey}
            targetProgress={targetProgress}
            isPlayingModel={isPlayingModel}
            isRecordingShadow={isRecordingShadow}
            isPlayingReplay={isPlayingReplay}
            lastRecordingUrl={lastRecordingUrl}
            micDenied={micDenied}
            activeStream={activeStream}
            curriculumLoading={curriculum.curriculumLoading}
            shadowLoading={shadowCurriculum.loading}
            onPlayModel={handlePlayModel}
            onRecord={handleRecord}
            onReplay={lastRecordingUrl ? handleReplay : undefined}
            onNextSentence={handleNextSentence}
            onAutoStop={stopShadowRecording}
            onPitchContour={handlePitchContour}
            measuredDurationMs={practiceType === "fluency" ? fluencyTimings.getDuration(rawText) : pronunciationTimings.getDuration(rawText)}
            courseType={courseWeek.courseType}
            selectedWeek={courseWeek.selectedWeek}
            onWeekChange={courseWeek.setSelectedWeek}
            shadowingWeek={courseWeek.shadowingWeek}
            currentSectionId={shadowCurriculum.currentSectionId ?? null}
            currentQuestionId={shadowCurriculum.currentQuestionId ?? null}
            currentQuestionText={shadowCurriculum.currentQuestionText ?? null}
            globalSentenceIndex={curriculum.globalSentenceIndex}
            curriculumTotal={curriculum.curriculumTotal}
          />
        )}

        {mode === "speaking" && (
          <SpeakingPanel
            testState={test.testState}
            isRecording={test.isRecording}
            micDenied={micDenied}
            activeStream={activeStream}
            liveTranscript={test.liveTranscript}
            liveInterim={test.liveInterim}
            speakingQuestions={speakingQuestions}
            currentQuestionIndex={currentQuestionIndex}
            courseType={courseWeek.courseType}
            selectedWeek={courseWeek.selectedWeek}
            shadowingWeek={courseWeek.shadowingWeek}
            userId={userId}
            onWeekChange={courseWeek.setSelectedWeek}
            onNextQuestion={() => setCurrentQuestionIndex((i) => (i + 1) % speakingQuestions.length)}
            onRecord={handleRecord}
            partLabel={test.partLabel}
            skipPrep={test.skipPrep}
            advanceTest={test.advanceTest}
            handleNextQuestion={test.handleNextQuestion}
          />
        )}

        {/* Mic Permission Denied Overlay */}
        {micDenied && <MicDeniedOverlay onDismiss={clearMicDenied} />}

        {/* Modals */}
        {test.showSaveModal && (
          <SaveSessionModal
            isPartial={true}
            onSave={() => { addXP(50); test.resetTest(); }}
            onDiscard={() => test.resetTest()}
          />
        )}
        {test.countdown !== null && <CountdownOverlay count={test.countdown} />}
      </div>
    </PageShell>
  );
}
