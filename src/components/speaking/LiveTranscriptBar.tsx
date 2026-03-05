import { useRef, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Mic } from "lucide-react";

interface LiveTranscriptBarProps {
  transcript: string;
  interim: string;
  isRecording: boolean;
}

export default function LiveTranscriptBar({ transcript, interim, isRecording }: LiveTranscriptBarProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript, interim]);

  const hasContent = transcript.trim().length > 0 || interim.trim().length > 0;

  return (
    <div className="absolute bottom-24 left-6 right-6 z-[100] bg-black/50 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_4px_30px_-8px_rgba(0,0,0,0.6)] animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-white/[0.06]">
        <Mic className={`w-3.5 h-3.5 ${isRecording ? "text-red-400 animate-pulse" : "text-white/40"}`} />
        <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-white/40">
          Live Transcript
        </span>
        {isRecording && (
          <span className="ml-auto flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[8px] font-bold uppercase tracking-widest text-red-400/80">Recording</span>
          </span>
        )}
      </div>

      {/* Transcript body */}
      <ScrollArea className="max-h-[6rem]">
        <div className="px-4 py-3">
          {hasContent ? (
            <p className="text-base leading-relaxed text-white/90 font-light">
              {transcript}
              {interim && (
                <span className="italic text-white/40 ml-1">{interim}</span>
              )}
            </p>
          ) : (
            <p className="text-sm text-white/20 italic">
              {isRecording ? "Listening…" : "Start speaking to see your transcript here"}
            </p>
          )}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>
    </div>
  );
}
