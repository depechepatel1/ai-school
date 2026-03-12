/**
 * Generic Speaking Practice Screen
 * Shared by IELTS and IGCSE — parameterized by courseType.
 * Refactored: feedback panel and shared header extracted.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useCourseWeek } from "@/hooks/useCourseWeek";
import { useShadowingCurriculum } from "@/hooks/useShadowingCurriculum";
import { useTimerSettings } from "@/hooks/useTimerSettings";
import { usePracticeTimer } from "@/hooks/usePracticeTimer";
import { useAudioCapture } from "@/hooks/useAudioCapture";
import { getSpeakingQuestions, type SpeakingQuestion } from "@/services/curriculum-storage";
import { chat, type ChatMessage } from "@/services/ai";
import { startListening, type STTHandle } from "@/lib/stt-provider";
import { createDebouncedPunctuate } from "@/lib/punctuate";
import { createPauseTracker, stripPauseMarkers, reinsertPauseMarkers } from "@/lib/speech-annotations";
import { createSpeechActivityTracker, type SpeechActivityTracker } from "@/lib/speech-activity-tracker";
import CountdownTimer from "@/components/speaking/CountdownTimer";
import FloatingInfoPanel from "@/components/speaking/FloatingInfoPanel";
import LiveTranscriptBar from "@/components/speaking/LiveTranscriptBar";
import PageShell from "@/components/PageShell";
import { useVideoLoopStack } from "@/hooks/useVideoLoopStack";
import { Mic, Pause, Play, Square, Check, SkipForward, AlertTriangle } from "lucide-react";
import { PracticeSkeleton } from "@/components/ui/practice-skeleton";
import { PracticeHeader, PracticeProgress } from "./practice-shared";
import SpeakingFeedbackPanel from "./SpeakingFeedbackPanel";
import AccentSelector from "@/components/speaking/AccentSelector";
import { useAccent } from "@/hooks/useAccent";

type CourseType = "ielts" | "igcse";
type RecordingState = "idle" | "recording" | "paused";

interface SpeakingPracticeProps {
  courseType: CourseType;
}

const COURSE_CONFIG: Record<CourseType, {
  badgeClass: string;
  badgeLabel: string;
  courseLabel: string;
  accentColor: "purple" | "violet";
  systemPrompt: string;
  singleQuestionPerWeek: boolean;
  showNextQuestion: boolean;
}> = {
  ielts: {
    badgeClass: "bg-purple-500/20 border-purple-500/30 text-purple-300",
    badgeLabel: "IELTS · Homework · Speaking Practice",
    courseLabel: "IELTS",
    accentColor: "purple",
    systemPrompt: `You are a professional IELTS Speaking Examiner assessing across the 4 criteria: Fluency & Coherence, Lexical Resource, Grammatical Range & Accuracy, and Pronunciation.
After the student answers:
1. Ask ONE short follow-up question (1 sentence).
2. Give brief feedback (2-3 sentences): reference which criterion applies, highlight what was good, and suggest ONE specific improvement.
3. Suggest 1-2 advanced vocabulary words the student could have used.
Keep responses concise and encouraging.`,
    singleQuestionPerWeek: false,
    showNextQuestion: true,
  },
  igcse: {
    badgeClass: "bg-violet-500/20 border-violet-500/30 text-violet-300",
    badgeLabel: "IGCSE · Homework · Speaking Practice",
    courseLabel: "IGCSE",
    accentColor: "violet",
    systemPrompt: `You are a professional IGCSE English Speaking Examiner. Assess the student's communication skills, vocabulary, grammar, and pronunciation.
After the student answers:
1. Ask ONE short follow-up question (1 sentence).
2. Give brief feedback (2-3 sentences): highlight what was good and suggest ONE specific improvement in vocabulary or grammar.
3. Suggest 1-2 more advanced words or phrases the student could have used.
Keep responses concise and encouraging.`,
    singleQuestionPerWeek: true,
    showNextQuestion: false,
  },
};

export default function SpeakingPractice({ courseType }: SpeakingPracticeProps) {
  const { videoList } = useVideoLoopStack();
  const navigate = useNavigate();
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const courseWeek = useCourseWeek(userId);
  const shadowCurriculum = useShadowingCurriculum(courseType, courseWeek.selectedWeek);
  const timerSettings = useTimerSettings(courseType, "speaking");
  const config = COURSE_CONFIG[courseType];

  const { accent, setAccent } = useAccent(userId);
  const [questions, setQuestions] = useState<SpeakingQuestion[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);

  // 3-state recording
  const [recordingState, setRecordingState] = useState<RecordingState>("idle");
  const [isSpeechActive, setIsSpeechActive] = useState(false);
  const [silenceNudge, setSilenceNudge] = useState(false);
  const speechTrackerRef = useRef<SpeechActivityTracker | null>(null);
  const pauseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Derived booleans for backward compat
  const isRecording = recordingState === "recording";
  const isPaused = recordingState === "paused";

  const [liveTranscript, setLiveTranscript] = useState("");
  const [liveInterim, setLiveInterim] = useState("");
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [showPostAnswer, setShowPostAnswer] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<ChatMessage[]>([]);

  const sttHandleRef = useRef<STTHandle | null>(null);
  const currentTranscriptRef = useRef("");
  const pauseTracker = useRef(createPauseTracker(1500));
  const { startMediaRecorder, stopMediaRecorder } = useAudioCapture();

  // Keep a ref to the latest slots so the callback can access them
  const pauseSlotsRef = useRef<ReturnType<typeof stripPauseMarkers>["slots"]>([]);

  const debouncedPunctuate = useCallback(
    createDebouncedPunctuate((punctuated) => {
      // Re-inject pause markers that were stripped before sending to AI
      const restored = reinsertPauseMarkers(punctuated, pauseSlotsRef.current);
      currentTranscriptRef.current = restored;
      setLiveTranscript(restored);
    }, 800),
    []
  );

  // Wrapper that strips markers before punctuating
  const punctuateWithMarkers = useCallback((raw: string) => {
    const { clean, slots } = stripPauseMarkers(raw);
    pauseSlotsRef.current = slots;
    debouncedPunctuate(clean);
  }, [debouncedPunctuate]);

  const practiceTimer = usePracticeTimer({
    userId, courseType, activityType: "speaking",
    weekNumber: courseWeek.selectedWeek, practiceMode: "homework",
    isAudioActive: recordingState !== "idle",
    isSpeechDetected: isSpeechActive,
  });

  // Ref to always call the latest finishRecording (avoids stale closure)
  const finishRecordingRef = useRef<() => void>(() => {});

  // Create speech activity tracker on mount
  useEffect(() => {
    speechTrackerRef.current = createSpeechActivityTracker({
      onSilent: () => {
        setIsSpeechActive(false);
        setSilenceNudge(true);
      },
      onSpeaking: () => {
        setIsSpeechActive(true);
        setSilenceNudge(false);
      },
      onAutoPause: () => {
        finishRecordingRef.current();
      },
    });
    return () => speechTrackerRef.current?.destroy();
  }, []);

  // Cleanup pause timeout on unmount
  useEffect(() => {
    return () => {
      if (pauseTimeoutRef.current) clearTimeout(pauseTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (!shadowCurriculum.curriculumData) return;
    const qs = getSpeakingQuestions(shadowCurriculum.curriculumData, courseWeek.selectedWeek);
    setQuestions(config.singleQuestionPerWeek && qs.length > 0 ? [qs[0]] : qs);
    setCurrentQIndex(0);
  }, [shadowCurriculum.curriculumData, courseWeek.selectedWeek, config.singleQuestionPerWeek]);

  const currentQuestion = questions[currentQIndex];
  const sectionMap: Record<string, string> = { part_2: "Part 2", part_3: "Part 3", model_answer: "Model Answer" };
  const sectionLabel = currentQuestion ? sectionMap[currentQuestion.sectionId] ?? currentQuestion.sectionId : "";

  const cleanupRecordingResources = () => {
    if (sttHandleRef.current) { sttHandleRef.current.stop(); sttHandleRef.current = null; }
    stopMediaRecorder();
    speechTrackerRef.current?.reset();
  };

  const startSttListening = () => {
    sttHandleRef.current = startListening("en-US", {
      onResult: (text) => {
        speechTrackerRef.current?.onSpeechDetected();
        const pauseMarker = pauseTracker.current.onChunk();
        currentTranscriptRef.current += pauseMarker + " " + text;
        setLiveTranscript(currentTranscriptRef.current.trimStart());
        setLiveInterim("");
        punctuateWithMarkers(currentTranscriptRef.current.trim());
      },
      onInterim: (text) => {
        speechTrackerRef.current?.onSpeechDetected();
        setLiveInterim(text);
      },
      onError: () => {
        cleanupRecordingResources();
        setRecordingState("idle");
        setSilenceNudge(false);
      },
    });
  };

  const startRecording = async () => {
    // Clean up any leftover resources from a previous stuck session
    cleanupRecordingResources();
    setRecordingState("recording");
    setSilenceNudge(false);
    setLiveTranscript(""); setLiveInterim("");
    currentTranscriptRef.current = "";
    pauseSlotsRef.current = [];
    setAiResponse(null); setShowPostAnswer(false);
    speechTrackerRef.current?.reset();
    pauseTracker.current.reset();
    await startMediaRecorder();
    startSttListening();
  };

  const pauseRecording = () => {
    setRecordingState("paused");
    setSilenceNudge(false);
    practiceTimer.pause();
    if (sttHandleRef.current) { sttHandleRef.current.stop(); sttHandleRef.current = null; }
    stopMediaRecorder();

    // Auto-submit after 2 minutes of being paused
    if (pauseTimeoutRef.current) clearTimeout(pauseTimeoutRef.current);
    pauseTimeoutRef.current = setTimeout(() => {
      finishRecording();
    }, 120_000);
  };

  const resumeRecording = async () => {
    if (pauseTimeoutRef.current) { clearTimeout(pauseTimeoutRef.current); pauseTimeoutRef.current = null; }
    setRecordingState("recording");
    setSilenceNudge(false);
    practiceTimer.resume();
    await startMediaRecorder();
    startSttListening();
  };

  const finishRecording = async () => {
    if (pauseTimeoutRef.current) { clearTimeout(pauseTimeoutRef.current); pauseTimeoutRef.current = null; }
    setRecordingState("idle");
    setSilenceNudge(false);
    speechTrackerRef.current?.reset();
    if (sttHandleRef.current) { sttHandleRef.current.stop(); sttHandleRef.current = null; }
    stopMediaRecorder();
    const transcript = currentTranscriptRef.current.trim();
    if (!transcript || !currentQuestion) return;
    setIsAiThinking(true);
    try {
      const history: ChatMessage[] = [{ role: "system", content: config.systemPrompt }, ...conversationHistory];
      const userMsg = `Question: "${currentQuestion.text}"\n\nStudent's answer: "${transcript}"\n\nPlease provide a follow-up question and brief feedback.`;
      const response = await chat(history, userMsg);
      setAiResponse(response);
      setConversationHistory([...conversationHistory, { role: "user", content: transcript }, { role: "assistant", content: response }]);
    } catch {
      setAiResponse("Great effort! Try to incorporate more complex sentences and transition phrases in your next attempt.");
    } finally {
      setIsAiThinking(false); setShowPostAnswer(true);
    }
  };

  const handleRecordingTap = () => {
    if (recordingState === "idle") startRecording();
    else if (recordingState === "recording") pauseRecording();
    else if (recordingState === "paused") resumeRecording();
  };

  const handleFinish = () => {
    if (recordingState !== "idle") finishRecording();
  };

  const handleTogglePause = () => {
    if (isPaused) resumeRecording();
    else pauseRecording();
  };

  const resetState = () => {
    setShowPostAnswer(false); setAiResponse(null);
    setLiveTranscript(""); setLiveInterim("");
    currentTranscriptRef.current = "";
    setRecordingState("idle"); setSilenceNudge(false);
    speechTrackerRef.current?.reset();
  };
  const handleTryAgain = () => resetState();
  const handleNextQuestion = () => { resetState(); setCurrentQIndex((i) => (i + 1) % questions.length); };

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
            <CountdownTimer countdownFrom={timerSettings.countdownMinutes} activeSeconds={practiceTimer.activeSeconds} isRunning={practiceTimer.isRunning} onPause={handleTogglePause} onResume={handleTogglePause} label="Speaking" />
          )}
        </div>

        {/* Floating Info Panel + Tips + Do Not Read */}
        <div className="absolute top-40 left-4 z-50">
          <FloatingInfoPanel course={config.courseLabel} weekNumber={courseWeek.selectedWeek} questionType={config.singleQuestionPerWeek ? "Speaking" : sectionLabel} questionNumber={config.singleQuestionPerWeek ? "Q1" : `Q${currentQIndex + 1}`} questionText={currentQuestion?.text ?? ""} progressCurrent={currentQIndex + 1} progressTotal={questions.length} />
          <div className="mt-3 bg-black/40 backdrop-blur-2xl border border-white/[0.06] rounded-xl px-4 py-3 max-w-xs">
            <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/35 block mb-1">Tips</span>
            <ul className="text-[11px] text-white/50 space-y-1 leading-relaxed">
              <li>• Use complex sentences</li>
              <li>• Add transition phrases</li>
              <li>• Include weekly vocabulary</li>
            </ul>
          </div>
          <div className="mt-3 flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/15 border border-red-500/25 backdrop-blur-2xl max-w-[220px]">
            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-red-300">Do Not Read Your Answers</span>
          </div>
        </div>

        <LiveTranscriptBar transcript={liveTranscript} interim={liveInterim} isRecording={isRecording} />

        {/* Accent selector – top right */}
        <div className="absolute right-4 top-16 z-[310]">
          <AccentSelector accent={accent} onChange={setAccent} />
        </div>

        {/* Recording controls — 3 state: idle / recording / paused */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 z-[310] flex flex-col items-center gap-3 p-1.5 rounded-full bg-black/40 backdrop-blur-xl border border-white/10">
          {/* Main record/pause/resume button */}
          <button onClick={handleRecordingTap} className={`relative w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 ${
            recordingState === "recording"
              ? "bg-red-500 shadow-[0_0_30px_rgba(239,68,68,0.6)] scale-110"
              : recordingState === "paused"
                ? "bg-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.4)]"
                : "bg-white/10 border border-white/20 hover:bg-white/20"
          }`}>
            {recordingState === "recording" ? (
              <Pause className="w-6 h-6 text-white" />
            ) : recordingState === "paused" ? (
              <Play className="w-6 h-6 text-white ml-0.5" />
            ) : (
              <Mic className="w-7 h-7 text-white" />
            )}
          </button>

          {/* Finish/Submit button — only visible when recording or paused */}
          {recordingState !== "idle" && (
            <button onClick={handleFinish} className="w-10 h-10 rounded-full bg-emerald-500/80 hover:bg-emerald-500 flex items-center justify-center transition-all shadow-lg" title="Finish & Submit">
              <Check className="w-5 h-5 text-white" />
            </button>
          )}

          {/* Next question — only when idle and not showing feedback */}
          {recordingState === "idle" && !showPostAnswer && config.showNextQuestion && questions.length > 1 && (
            <button onClick={handleNextQuestion} className="p-2.5 rounded-full bg-cyan-600 hover:bg-cyan-500 text-white transition-colors shadow-lg" title="Skip Question">
              <SkipForward className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Silence nudge — shows when student hasn't spoken for 8 seconds */}
        {silenceNudge && recordingState === "recording" && (
          <div className="absolute bottom-28 left-1/2 -translate-x-1/2 z-[320] animate-fade-in-up">
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/15 border border-amber-500/25 backdrop-blur-2xl">
              <span className="text-xs text-amber-300 font-medium">Still thinking? Timer paused until you speak</span>
            </div>
          </div>
        )}

        {/* Paused indicator */}
        {recordingState === "paused" && (
          <div className="absolute bottom-28 left-1/2 -translate-x-1/2 z-[320] animate-fade-in-up">
            <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-amber-500/15 border border-amber-500/25 backdrop-blur-2xl">
              <Pause className="w-4 h-4 text-amber-400" />
              <span className="text-xs text-amber-300 font-medium">Paused — tap mic to continue</span>
            </div>
          </div>
        )}

        <SpeakingFeedbackPanel
          isAiThinking={isAiThinking}
          showPostAnswer={showPostAnswer}
          aiResponse={aiResponse}
          accentColor={config.accentColor}
          showNextQuestion={config.showNextQuestion}
          hasMultipleQuestions={questions.length > 1}
          onTryAgain={handleTryAgain}
          onNextQuestion={handleNextQuestion}
          onDismiss={resetState}
        />
      </div>
    </PageShell>
  );
}
