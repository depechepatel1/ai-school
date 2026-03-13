/**
 * ProsodyVisualizer — Karaoke-style word highlighting
 *
 * Pedagogical design: content words (nouns, verbs, adjectives, adverbs)
 * render larger and brighter than function words (articles, prepositions).
 * This teaches English stress-timing rhythm to Chinese L1 students.
 */
import { memo } from "react";
import type { WordData } from "@/lib/prosody";

interface Props {
  data: WordData[];
  activeWordIndex: number;
}

export default memo(function ProsodyVisualizer({ data, activeWordIndex }: Props) {
  return (
    <div className="relative min-h-[2.5rem] w-full max-w-4xl mx-auto flex flex-wrap items-baseline justify-center gap-x-2 gap-y-1 px-6">
      {data.map((item, i) => {
        const isActive = i === activeWordIndex;
        const isPast = activeWordIndex !== -1 && i < activeWordIndex;
        const isContent = !item.isFunc;

        const sizeClass = isContent ? "text-2xl font-bold" : "text-lg font-normal";

        let colorClass = "text-white/40";
        if (isContent && !isPast && !isActive) colorClass = "text-white/70";
        if (isPast && isContent) colorClass = "text-white/30";
        if (isPast && !isContent) colorClass = "text-white/15";
        if (isActive) colorClass = isContent ? "text-cyan-300" : "text-cyan-400/70";

        const glowClass = isActive && isContent
          ? "drop-shadow-[0_0_20px_rgba(34,211,238,0.8)]"
          : isActive
          ? "drop-shadow-[0_0_12px_rgba(34,211,238,0.4)]"
          : "";

        return (
          <span
            key={i}
            className={`inline-block transition-all duration-150 ${sizeClass} ${colorClass} ${glowClass}`}
          >
            {item.word}
          </span>
        );
      })}

      {data.length > 0 && activeWordIndex === -1 && (
        <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-4 text-[9px] uppercase tracking-[0.15em] text-white/30">
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-full bg-white/60" />
            Stress (louder, longer)
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-white/25" />
            Weak (quieter, shorter)
          </span>
        </div>
      )}
    </div>
  );
});
