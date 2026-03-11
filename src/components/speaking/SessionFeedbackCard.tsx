import { useState, useEffect } from "react";
import { Trophy, Loader2, X } from "lucide-react";
import { sendChatMessage, type ChatMessage } from "@/services/ai";
import ReactMarkdown from "react-markdown";

interface Props {
  transcript: string;
  partsCompleted: number;
  onClose: () => void;
}

/**
 * Post-session feedback card. Sends the full speaking transcript
 * to the AI for a structured assessment based on the 4 IELTS criteria.
 * Designed for future Aliyun DashScope integration — pronunciation
 * scoring placeholder is included but not active.
 */
export default function SessionFeedbackCard({ transcript, partsCompleted, onClose }: Props) {
  const [feedback, setFeedback] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!transcript.trim()) {
      setFeedback("No speech was recorded in this session.");
      setLoading(false);
      return;
    }

    let cancelled = false;

    const messages: ChatMessage[] = [
      {
        role: "system",
        content: `You are an IELTS Speaking Examiner providing a post-session assessment. Analyse the student's transcript and provide:
1. **Estimated Band Score** (overall, e.g. 5.5-6.0)
2. **Fluency & Coherence**: one sentence assessment + one specific tip
3. **Lexical Resource**: one sentence + one vocabulary suggestion
4. **Grammatical Range & Accuracy**: one sentence + one correction example
5. **Pronunciation**: brief note (detailed scoring coming soon via speech analysis)

Keep the total response under 200 words. Be encouraging but honest.`,
      },
      {
        role: "user",
        content: `Here is the student's full speaking transcript from a practice session (${partsCompleted} part(s) completed):\n\n${transcript}`,
      },
    ];

    sendChatMessage(messages)
      .then((res) => {
        if (!cancelled) setFeedback(res.content);
      })
      .catch(() => {
        if (!cancelled) setFeedback("Unable to generate feedback. Please try again later.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [transcript, partsCompleted]);

  return (
    <div className="absolute inset-0 z-[490] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="w-[480px] max-w-[90vw] max-h-[80vh] overflow-y-auto bg-black/90 border border-white/10 rounded-3xl p-6 shadow-[0_0_40px_-10px_rgba(168,85,247,0.3)]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <h3 className="text-lg font-bold text-white">Session Feedback</h3>
          </div>
          <button onClick={onClose} className="p-2 rounded-full text-white/40 hover:text-white hover:bg-white/10 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="text-xs text-white/40 mb-4">
          {partsCompleted} part{partsCompleted !== 1 ? "s" : ""} completed
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
            <span className="text-sm text-white/50">Analysing your performance...</span>
          </div>
        ) : (
          <div className="prose prose-invert prose-sm max-w-none text-white/80 [&_strong]:text-white [&_h1]:text-lg [&_h2]:text-base [&_h3]:text-sm">
            <ReactMarkdown>{feedback ?? ""}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
