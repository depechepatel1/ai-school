/**
 * IGCSE Speaking Practice Screen
 * 
 * Uses igcse/speaking-questions.json from curriculum storage.
 * Shows questions for the student's selected week (1 main question per week).
 * Timer: 10-minute countdown from timer_settings (igcse/speaking).
 * AI follow-up questions and feedback after each answer.
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
import PageShell, { VIDEO_1_STACK } from "@/components/PageShell";
import { ArrowLeft, Mic, RotateCcw, AlertTriangle, MessageSquare, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";

const SPEAKING_SYSTEM_PROMPT = `You are a professional IGCSE English Speaking Examiner. After the student answers a question:
1. Ask ONE short follow-up question based on their answer (1 sentence).
2. Then give brief improvement feedback (2-3 sentences max): highlight what was good and suggest ONE improvement.
Keep responses concise and encouraging. Focus on complex sentences, transition phrases, and vocabulary usage.`;

export default function IGCSESpeaking() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const courseWeek = useCourseWeek(userId);
  // Force igcse for curriculum
  const shadowCurriculum = useShadowingCurriculum("igcse", courseWeek.selectedWeek);
  const timerSettings = useTimerSettings("igcse", "speaking");

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
    createDebouncedPunctuate((punctuated) => {
      setLiveTranscript(punctuated);
    }, 800),
    []
  );

  const isAudioActive = isRecording;

  const practiceTimer = usePracticeTimer({
    userId,
    courseType: "igcse",
    activityType: "speaking",
    weekNumber: courseWeek.selectedWeek,
    practiceMode: "homework",
    isAudioActive: isAudioActive && !isPaused,
  });

  // Load questions — only Q1 per week for IGCSE
  useEffect(() => {
    if (!shadowCurriculum.curriculumData) return;
    const qs = getSpeakingQuestions(shadowCurriculum.curriculumData, courseWeek.selectedWeek);
    // IGCSE: only first question per week
    setQuestions(qs.length > 0 ? [qs[0]] : []);
    setCurrentQIndex(0);
  }, [shadowCurriculum.curriculumData, courseWeek.selectedWeek]);

  const currentQuestion = questions[currentQIndex];

  const startRecording = async () => {
    setIsRecording(true);
    setIsPaused(false);
    setLiveTranscript("");
    setLiveInterim("");
    currentTranscriptRef.current = "";
    setAiResponse(null);
    setShowPostAnswer(false);

    await startMediaRecorder();

    sttHandleRef.current = startListening("en-US", {
      onResult: (text) => {
        currentTranscriptRef.current += " " + text;
        setLiveTranscript((prev) => (prev + " " + text).trimStart());
        setLiveInterim("");
        debouncedPunctuate(currentTranscriptRef.current.trim());
      },
      onInterim: (text) => {
        setLiveInterim(text);
      },
      onError: () => setIsRecording(false),
    });
  };

  const stopRecording = async () => {
    setIsRecording(false);
    if (sttHandleRef.current) {
      sttHandleRef.current.stop();
      sttHandleRef.current = null;
    }
    stopMediaRecorder();

    const transcript = currentTranscriptRef.current.trim();
    if (!transcript || !currentQuestion) return;

    setIsAiThinking(true);
    try {
      const history: ChatMessage[] = [
        { role: "system", content: SPEAKING_SYSTEM_PROMPT },
        ...conversationHistory,
      ];
      const userMsg = `Question: "${currentQuestion.text}"\n\nStudent's answer: "${transcript}"\n\nPlease provide a follow-up question and brief feedback.`;
      const response = await chat(history, userMsg);
      setAiResponse(response);
      setConversationHistory([
        ...conversationHistory,
        { role: "user", content: transcript },
        { role: "assistant", content: response },
      ]);
    } catch (err) {
      console.error("AI feedback error:", err);
      setAiResponse("Great effort! Try to incorporate more complex sentences and transition phrases in your next attempt.");
    } finally {
      setIsAiThinking(false);
      setShowPostAnswer(true);
    }
  };

  const handleToggleRecording = () => {
    if (isRecording) stopRecording();
    else startRecording();
  };

  const handleTogglePause = () => {
    if (isPaused) {
      setIsPaused(false);
      practiceTimer.resume();
    } else {
      setIsPaused(true);
      practiceTimer.pause();
    }
  };

  const handleTryAgain = () => {
    setShowPostAnswer(false);
    setAiResponse(null);
    setLiveTranscript("");
    setLiveInterim("");
    currentTranscriptRef.current = "";
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
          <span className="px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-[0.12em] backdrop-blur-2xl bg-violet-500/20 border border-violet-500/30 text-violet-300">
            IGCSE · Homework · Speaking Practice
          </span>
        </div>

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
            <CountdownTimer
              countdownFrom={timerSettings.countdownMinutes}
              activeSeconds={practiceTimer.activeSeconds}
              isRunning={practiceTimer.isRunning}
              onPause={handleTogglePause}
              onResume={handleTogglePause}
              label="Speaking"
            />
          )}
        </div>

        {/* Floating Info Panel */}
        <div className="absolute top-32 left-4 z-50">
          <FloatingInfoPanel
            course="IGCSE"
            weekNumber={courseWeek.selectedWeek}
            questionType="Speaking"
            questionNumber="Q1"
            questionText={currentQuestion?.text ?? ""}
          />

          <div className="mt-3 bg-black/40 backdrop-blur-2xl border border-white/[0.06] rounded-xl px-4 py-3 max-w-xs">
            <span className="text-[8px] font-bold uppercase tracking-[0.15em] text-white/30 block mb-1">Tips</span>
            <ul className="text-[10px] text-white/50 space-y-1 leading-relaxed">
              <li>• Use complex sentences</li>
              <li>• Add transition phrases</li>
              <li>• Include weekly vocabulary</li>
            </ul>
          </div>
        </div>

        {/* Question progress */}
        <div className="absolute top-4 right-4 z-50">
          <div className="bg-black/50 backdrop-blur-2xl border border-white/[0.08] rounded-2xl px-4 py-2.5 text-center">
            <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-white/40 block">Question</span>
            <span className="text-lg font-bold text-white/90">1</span>
            <span className="text-white/30 text-sm font-medium"> / 1</span>
          </div>
        </div>

        {/* Main question display */}
        {!showPostAnswer && currentQuestion && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 max-w-xl w-full px-8">
            <div className="bg-black/60 backdrop-blur-2xl border border-white/[0.10] rounded-3xl p-8 text-center shadow-[0_0_60px_-10px_rgba(0,0,0,0.5)]">
              <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-violet-300/60 block mb-3">
                Speaking · Question 1
              </span>
              <p className="text-lg font-semibold text-white/90 leading-relaxed">
                {currentQuestion.text}
              </p>
            </div>
          </div>
        )}

        {/* Live transcript */}
        <LiveTranscriptBar
          transcript={liveTranscript}
          interim={liveInterim}
          isRecording={isRecording}
        />

        {/* Recording controls */}
        <div className="absolute bottom-[13.5rem] left-1/2 -translate-x-1/2 z-[310] flex items-center gap-3 p-1.5 rounded-full bg-black/40 backdrop-blur-xl border border-white/10">
          <button
            onClick={handleToggleRecording}
            className={`relative w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 ${isRecording ? "bg-red-500 shadow-[0_0_30px_rgba(239,68,68,0.6)] scale-110" : "bg-white/10 border border-white/20 hover:bg-white/20"}`}
          >
            {isRecording ? <div className="w-5 h-5 bg-white rounded animate-pulse" /> : <Mic className="w-7 h-7 text-white" />}
          </button>
        </div>

        {/* AI Response + Post-answer popup */}
        <AnimatePresence>
          {(isAiThinking || showPostAnswer) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute bottom-32 right-6 z-[400] w-[340px]"
            >
              <div className="bg-black/80 backdrop-blur-2xl border border-white/[0.12] rounded-2xl p-5 shadow-[0_0_40px_-5px_rgba(0,0,0,0.5)]">
                <div className="flex items-center gap-2 mb-3">
                  <MessageSquare className="w-4 h-4 text-violet-400" />
                  <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-violet-300/80">Examiner Feedback</span>
                </div>

                {isAiThinking ? (
                  <div className="flex items-center gap-2 py-4">
                    <Loader2 className="w-5 h-5 text-violet-400 animate-spin" />
                    <span className="text-sm text-white/50">Analyzing your response...</span>
                  </div>
                ) : aiResponse ? (
                  <>
                    <div className="prose prose-sm prose-invert max-w-none text-[12px] leading-relaxed text-white/80 mb-4">
                      <ReactMarkdown>{aiResponse}</ReactMarkdown>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleTryAgain}
                        className="flex-1 px-3 py-2.5 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-200 text-[11px] font-bold hover:bg-amber-500/30 transition-all flex items-center gap-1.5 justify-center"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Try Again
                      </button>
                    </div>
                  </>
                ) : null}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PageShell>
  );
}
