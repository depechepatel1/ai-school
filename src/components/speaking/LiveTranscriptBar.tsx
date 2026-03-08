import { useRef, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface LiveTranscriptBarProps {
  transcript: string;
  interim: string;
  isRecording: boolean;
  questionText?: string;
}

export default function LiveTranscriptBar({ transcript, interim, isRecording, questionText }: LiveTranscriptBarProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript, interim]);

  const hasContent = transcript.trim().length > 0 || interim.trim().length > 0;

  return (
    <div className="absolute bottom-0 left-0 right-0 z-[100] bg-black/60 backdrop-blur-2xl border-t border-white/10 shadow-[0_-4px_30px_-8px_rgba(0,0,0,0.6)] animate-fade-in">
      <ScrollArea className="h-[12rem]">
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
          {isRecording && !hasContent && (
            <p className="text-sm text-white/20 italic mt-2">Listening…</p>
          )}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>
    </div>
  );
}
