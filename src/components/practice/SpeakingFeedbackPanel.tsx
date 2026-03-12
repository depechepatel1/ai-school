/**
 * AI Examiner Feedback Panel — extracted from SpeakingPractice.
 */
import { forwardRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Loader2, RotateCcw, SkipForward, X } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface SpeakingFeedbackPanelProps {
  isAiThinking: boolean;
  showPostAnswer: boolean;
  aiResponse: string | null;
  accentColor: "purple" | "violet";
  showNextQuestion: boolean;
  hasMultipleQuestions: boolean;
  onTryAgain: () => void;
  onNextQuestion: () => void;
  onDismiss: () => void;
}

const ACCENT_CLASSES = {
  purple: { feedbackIcon: "text-purple-400", feedbackLabel: "text-purple-300/80", spinner: "text-purple-400" },
  violet: { feedbackIcon: "text-violet-400", feedbackLabel: "text-violet-300/80", spinner: "text-violet-400" },
};

const SpeakingFeedbackPanel = forwardRef<HTMLDivElement, SpeakingFeedbackPanelProps>(function SpeakingFeedbackPanel({
  isAiThinking,
  showPostAnswer,
  aiResponse,
  accentColor,
  showNextQuestion,
  hasMultipleQuestions,
  onTryAgain,
  onNextQuestion,
}, ref) {
  const accent = ACCENT_CLASSES[accentColor] ?? ACCENT_CLASSES.purple;

  return (
    <AnimatePresence>
      {(isAiThinking || showPostAnswer) && (
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="absolute bottom-32 right-6 z-[400] w-[340px]"
        >
          <div className="bg-black/80 backdrop-blur-2xl border border-white/[0.12] rounded-2xl p-5 shadow-[0_0_40px_-5px_rgba(0,0,0,0.5)]">
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare className={`w-4 h-4 ${accent.feedbackIcon}`} />
              <span className={`text-[10px] font-bold uppercase tracking-[0.15em] ${accent.feedbackLabel}`}>Examiner Feedback</span>
            </div>

            {isAiThinking ? (
              <div className="flex items-center gap-2 py-4">
                <Loader2 className={`w-5 h-5 ${accent.spinner} animate-spin`} />
                <span className="text-sm text-white/50">Analyzing your response...</span>
              </div>
            ) : aiResponse ? (
              <>
                <div className="prose prose-sm prose-invert max-w-none text-[12px] leading-relaxed text-white/80 mb-4">
                  <ReactMarkdown>{aiResponse}</ReactMarkdown>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={onTryAgain}
                    className="flex-1 px-3 py-2.5 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-200 text-[11px] font-bold hover:bg-amber-500/30 transition-all flex items-center gap-1.5 justify-center"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Try Again
                  </button>
                  {showNextQuestion && hasMultipleQuestions && (
                    <button
                      onClick={onNextQuestion}
                      className="flex-1 px-3 py-2.5 rounded-xl bg-cyan-500/20 border border-cyan-500/30 text-cyan-200 text-[11px] font-bold hover:bg-cyan-500/30 transition-all flex items-center gap-1.5 justify-center"
                    >
                      <SkipForward className="w-3.5 h-3.5" />
                      Next Question
                    </button>
                  )}
                </div>
              </>
            ) : null}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

export default SpeakingFeedbackPanel;
