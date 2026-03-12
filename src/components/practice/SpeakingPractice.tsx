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
import CountdownTimer from "@/components/speaking/CountdownTimer";
import FloatingInfoPanel from "@/components/speaking/FloatingInfoPanel";
import LiveTranscriptBar from "@/components/speaking/LiveTranscriptBar";
import PageShell from "@/components/PageShell";
import { useVideoLoopStack } from "@/hooks/useVideoLoopStack";
import { Mic, SkipForward, AlertTriangle } from "lucide-react";
import { PracticeSkeleton } from "@/components/ui/practice-skeleton";
import { PracticeHeader, PracticeProgress } from "./practice-shared";
import SpeakingFeedbackPanel from "./SpeakingFeedbackPanel";

type CourseType = "ielts" | "igcse";

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

  const [questions, setQuestions] = useState<SpeakingQuestion[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [liveInterim, setLiveInterim] = useState("");
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [showPostAnswer, setShowPostAnswer] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<ChatMessage[]>([]);

  const sttHandleRef = useRef<STTHandle | null>(null);
  const currentTranscriptRef = useRef("");
  const { startMediaRecorder, stopMediaRecorder } = useAudioCapture();

  const debouncedPunctuate = useCallback(
    createDebouncedPunctuate((punctuated) => setLiveTranscript(punctuated), 800),
    []
  );

  const practiceTimer = usePracticeTimer({
    userId, courseType, activityType: "speaking",
    weekNumber: courseWeek.selectedWeek, practiceMode: "homework",
    isAudioActive: isRecording && !isPaused,
  });

  useEffect(() => {
    if (!shadowCurriculum.curriculumData) return;
    const qs = getSpeakingQuestions(shadowCurriculum.curriculumData, courseWeek.selectedWeek);
    setQuestions(config.singleQuestionPerWeek && qs.length > 0 ? [qs[0]] : qs);
    setCurrentQIndex(0);
  }, [shadowCurriculum.curriculumData, courseWeek.selectedWeek, config.singleQuestionPerWeek]);

  const currentQuestion = questions[currentQIndex];
  const sectionMap: Record<string, string> = { part_2: "Part 2", part_3: "Part 3", model_answer: "Model Answer" };
  const sectionLabel = currentQuestion ? sectionMap[currentQuestion.sectionId] ?? currentQuestion.sectionId : "";

  const startRecording = async () => {
    setIsRecording(true); setIsPaused(false); setLiveTranscript(""); setLiveInterim("");
    currentTranscriptRef.current = ""; setAiResponse(null); setShowPostAnswer(false);
    await startMediaRecorder();
    sttHandleRef.current = startListening("en-US", {
      onResult: (text) => { currentTranscriptRef.current += " " + text; setLiveTranscript((prev) => (prev + " " + text).trimStart()); setLiveInterim(""); debouncedPunctuate(currentTranscriptRef.current.trim()); },
      onInterim: (text) => setLiveInterim(text),
      onError: () => setIsRecording(false),
    });
  };

  const stopRecording = async () => {
    setIsRecording(false);
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

  const handleToggleRecording = () => { if (isRecording) stopRecording(); else startRecording(); };
  const handleTogglePause = () => { if (isPaused) { setIsPaused(false); practiceTimer.resume(); } else { setIsPaused(true); practiceTimer.pause(); } };
  const resetState = () => { setShowPostAnswer(false); setAiResponse(null); setLiveTranscript(""); setLiveInterim(""); currentTranscriptRef.current = ""; };
  const handleTryAgain = () => resetState();
  const handleNextQuestion = () => { resetState(); setCurrentQIndex((i) => (i + 1) % questions.length); };

  if (courseWeek.loading || shadowCurriculum.loading || timerSettings.loading) {
    return <PracticeSkeleton />;
  }

  return (
    <PageShell fullWidth loopVideos={videoList} hideFooter>
      <div className="relative w-full h-full text-white font-outfit select-none animate-fade-in-up">
        <PracticeHeader badgeClass={config.badgeClass} badgeLabel={config.badgeLabel} />

        {/* DO NOT READ reminder */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[300]">
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/15 border border-red-500/25 backdrop-blur-2xl">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-red-300">Do Not Read Your Answers</span>
          </div>
        </div>

        {/* Timer */}
        <div className="absolute top-16 left-4 z-50">
          {timerSettings.countdownMinutes && (
            <CountdownTimer countdownFrom={timerSettings.countdownMinutes} activeSeconds={practiceTimer.activeSeconds} isRunning={practiceTimer.isRunning} onPause={handleTogglePause} onResume={handleTogglePause} label="Speaking" />
          )}
        </div>

        {/* Floating Info Panel */}
        <div className="absolute top-40 left-4 z-50">
          <FloatingInfoPanel course={config.courseLabel} weekNumber={courseWeek.selectedWeek} questionType={config.singleQuestionPerWeek ? "Speaking" : sectionLabel} questionNumber={config.singleQuestionPerWeek ? "Q1" : `Q${currentQIndex + 1}`} questionText={currentQuestion?.text ?? ""} />
          <div className="mt-3 bg-black/40 backdrop-blur-2xl border border-white/[0.06] rounded-xl px-4 py-3 max-w-xs">
            <span className="text-[8px] font-bold uppercase tracking-[0.15em] text-white/30 block mb-1">Tips</span>
            <ul className="text-[10px] text-white/50 space-y-1 leading-relaxed">
              <li>• Use complex sentences</li>
              <li>• Add transition phrases</li>
              <li>• Include weekly vocabulary</li>
            </ul>
          </div>
        </div>

        <PracticeProgress label="Question" current={currentQIndex + 1} total={questions.length} />


        <LiveTranscriptBar transcript={liveTranscript} interim={liveInterim} isRecording={isRecording} />

        {/* Recording controls */}
        <div className="absolute bottom-[9rem] left-1/2 -translate-x-1/2 z-[310] flex items-center gap-3 p-1.5 rounded-full bg-black/40 backdrop-blur-xl border border-white/10">
          <button onClick={handleToggleRecording} className={`relative w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 ${isRecording ? "bg-red-500 shadow-[0_0_30px_rgba(239,68,68,0.6)] scale-110" : "bg-white/10 border border-white/20 hover:bg-white/20"}`}>
            {isRecording ? <div className="w-5 h-5 bg-white rounded animate-pulse" /> : <Mic className="w-7 h-7 text-white" />}
          </button>
          {!isRecording && !showPostAnswer && config.showNextQuestion && questions.length > 1 && (
            <button onClick={handleNextQuestion} className="p-2.5 rounded-full bg-cyan-600 hover:bg-cyan-500 text-white transition-colors shadow-lg" title="Skip Question">
              <SkipForward className="w-5 h-5" />
            </button>
          )}
        </div>

        <SpeakingFeedbackPanel
          isAiThinking={isAiThinking}
          showPostAnswer={showPostAnswer}
          aiResponse={aiResponse}
          accentColor={config.accentColor}
          showNextQuestion={config.showNextQuestion}
          hasMultipleQuestions={questions.length > 1}
          onTryAgain={handleTryAgain}
          onNextQuestion={handleNextQuestion}
        />
      </div>
    </PageShell>
  );
}
