import { useRef, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Pause } from "lucide-react";

interface LiveTranscriptBarProps {
  transcript: string;
  interim: string;
  isRecording: boolean;
  questionText?: string;
  isPaused?: boolean;
}

export default function LiveTranscriptBar({ transcript, interim, isRecording, questionText, isPaused }: LiveTranscriptBarProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript, interim]);

  const hasContent = transcript.trim().length > 0 || interim.trim().length > 0;

  return (
    <div aria-live="polite" role="log" aria-label="Live transcript" className="absolute bottom-0 left-0 right-0 z-[100] bg-black/60 backdrop-blur-2xl border-t border-white/10 shadow-[0_-4px_30px_-8px_rgba(0,0,0,0.6)] animate-fade-in">
      {/* Paused banner */}
      {isPaused && (
        <div className="flex items-center justify-center gap-2 px-4 py-2 bg-amber-500/15 border-b border-amber-500/20">
          <Pause className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-amber-300">
            Paused — No speech detected
          </span>
        </div>
      )}
      <ScrollArea className="h-[9rem]">
        <div className="px-5 py-3">
          {/* Question always displayed at top */}
          {questionText && (
            <div className={hasContent ? "mb-3 pb-2.5 border-b border-white/[0.06]" : ""}>
              <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-cyan-400/60 mr-2">Q:</span>
              <span className="text-[13px] text-white/70 font-medium leading-relaxed">{questionText}</span>
            </div>
          )}
          
          {hasContent && (
            <p className="text-base leading-relaxed text-white/90 font-light">
              {transcript}
              {interim && (
                <span className="italic text-white/40 ml-1">{interim}</span>
              )}
            </p>
          )}
          {isRecording && !isPaused && !hasContent && (
            <p className="text-sm text-white/20 italic mt-2">Listening…</p>
          )}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>
    </div>
  );
}
