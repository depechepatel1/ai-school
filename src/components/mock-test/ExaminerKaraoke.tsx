import { useMemo, memo } from "react";

interface Props {
  text: string;
  charIndex: number;
  isThinking?: boolean;
}

/**
 * Glassmorphic karaoke bar that highlights words as the examiner speaks.
 * Words before charIndex are "spoken" (cyan glow), the current word pulses.
 */
function ExaminerKaraoke({ text, charIndex, isThinking }: Props) {
  const words = useMemo(() => {
    if (!text) return [];
    const result: { word: string; start: number; end: number }[] = [];
    const regex = /\S+/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      result.push({ word: match[0], start: match.index, end: match.index + match[0].length });
    }
    return result;
  }, [text]);

  if (!text) return null;

  return (
    <div className="w-full bg-card/70 backdrop-blur-2xl border-t border-border shadow-[0_-4px_30px_-8px_rgba(0,0,0,0.4)] px-5 py-3 animate-fade-in">
      <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-primary/60 block mb-1">
        Miss Li
      </span>
      <p className="text-base leading-relaxed font-light flex flex-wrap gap-x-1.5 gap-y-0.5">
        {words.map((w, i) => {
          const isSpoken = charIndex >= w.end;
          const isCurrent = charIndex >= w.start && charIndex < w.end;
          return (
            <span
              key={i}
              className={
                isCurrent
                  ? "text-primary font-semibold animate-pulse drop-shadow-[0_0_6px_hsl(var(--primary)/0.5)]"
                  : isSpoken
                    ? "text-primary/80"
                    : "text-muted-foreground/50"
              }
            >
              {w.word}
            </span>
          );
        })}
      </p>
    </div>
  );
}

export default memo(ExaminerKaraoke);
