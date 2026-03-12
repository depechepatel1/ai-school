import { useRef, useEffect, useMemo, memo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { analyzeTranscript, type TextAnnotation } from "@/lib/speech-annotations";

interface LiveTranscriptBarProps {
  transcript: string;
  interim: string;
  isRecording: boolean;
  questionText?: string;
}

/** Render transcript text with inline annotations */
function AnnotatedText({ text }: { text: string }) {
  const analysis = useMemo(() => analyzeTranscript(text), [text]);

  if (analysis.annotations.length === 0) {
    return <>{text}</>;
  }

  const segments: React.ReactNode[] = [];
  let cursor = 0;

  for (const ann of analysis.annotations) {
    if (ann.start > cursor) {
      segments.push(<span key={`t-${cursor}`}>{text.slice(cursor, ann.start)}</span>);
    }

    const chunk = text.slice(ann.start, ann.end);

    if (ann.type === "filler") {
      segments.push(
        <span
          key={`f-${ann.start}`}
          className="underline decoration-wavy decoration-amber-400/70 underline-offset-4 text-amber-200/90"
          title="Filler word"
        >
          {chunk}
        </span>
      );
    } else if (ann.type === "pause") {
      segments.push(
        <span
          key={`p-${ann.start}`}
          className="inline-flex items-center mx-1 px-1.5 py-0.5 rounded-full bg-red-500/20 border border-red-400/30 text-[10px] font-mono text-red-300/90 align-middle"
          title="Long pause detected"
        >
          ⋯ {ann.label}
        </span>
      );
    } else if (ann.type === "repetition") {
      segments.push(
        <span
          key={`r-${ann.start}`}
          className="underline decoration-dotted decoration-violet-400/60 underline-offset-4 text-violet-200/80"
          title="Repeated phrase"
        >
          {chunk}
        </span>
      );
    }

    cursor = ann.end;
  }

  if (cursor < text.length) {
    segments.push(<span key={`t-${cursor}`}>{text.slice(cursor)}</span>);
  }

  return <>{segments}</>;
}

/** Summary bar showing counts */
function FluencyIndicators({ text, isRecording }: { text: string; isRecording: boolean }) {
  const analysis = useMemo(() => analyzeTranscript(text), [text]);
  const { fillerCount, pauseCount, repetitionCount } = analysis;
  const hasAny = fillerCount > 0 || pauseCount > 0 || repetitionCount > 0;

  if (!hasAny || (!isRecording && text.trim().length === 0)) return null;

  return (
    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/[0.06] text-[10px] font-medium tracking-wide">
      <span className="text-white/30 uppercase">Fluency</span>
      {fillerCount > 0 && (
        <span className="text-amber-400/70">{fillerCount} filler{fillerCount !== 1 ? "s" : ""}</span>
      )}
      {pauseCount > 0 && (
        <span className="text-red-400/70">{pauseCount} pause{pauseCount !== 1 ? "s" : ""}</span>
      )}
      {repetitionCount > 0 && (
        <span className="text-violet-400/70">{repetitionCount} repeat{repetitionCount !== 1 ? "s" : ""}</span>
      )}
    </div>
  );
}

function LiveTranscriptBar({ transcript, interim, isRecording, questionText }: LiveTranscriptBarProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript, interim]);

  const hasContent = transcript.trim().length > 0 || interim.trim().length > 0;

  return (
    <div className="absolute bottom-0 left-0 right-0 z-[100] bg-black/60 backdrop-blur-2xl border-t border-white/10 shadow-[0_-4px_30px_-8px_rgba(0,0,0,0.6)] animate-fade-in">
      <ScrollArea className="h-[12rem]">
        <div className="px-5 py-3">
          {questionText && (
            <div className={hasContent ? "mb-3 pb-2.5 border-b border-white/[0.06]" : ""}>
              <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-cyan-400/60 mr-2">Q:</span>
              <span className="text-[13px] text-white/70 font-medium leading-relaxed">{questionText}</span>
            </div>
          )}

          {hasContent && (
            <div>
              <p className="text-base leading-relaxed text-white/90 font-light">
                <AnnotatedText text={transcript} />
                {interim && (
                  <span className="italic text-white/40 ml-1">{interim}</span>
                )}
              </p>
              <FluencyIndicators text={transcript} isRecording={isRecording} />
            </div>
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

export default memo(LiveTranscriptBar);
