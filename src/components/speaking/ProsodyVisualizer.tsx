import { useState, useEffect, useRef, useCallback } from "react";
import type { WordData } from "@/lib/prosody";

interface Props {
  data: WordData[];
  activeWordIndex: number;
}

export default function ProsodyVisualizer({ data, activeWordIndex }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wordRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [lines, setLines] = useState<number[][]>([]);

  const measureLines = useCallback(() => {
    if (!containerRef.current || data.length === 0) return;
    const groups: number[][] = [[]];
    let lastTop: number | null = null;
    wordRefs.current.forEach((el, i) => {
      if (!el) return;
      const top = el.offsetTop;
      if (lastTop !== null && Math.abs(top - lastTop) > 4) groups.push([]);
      groups[groups.length - 1].push(i);
      lastTop = top;
    });
    setLines(groups);
  }, [data]);

  useEffect(() => {
    wordRefs.current = wordRefs.current.slice(0, data.length);
    // Measure after render
    requestAnimationFrame(measureLines);
  }, [data, measureLines]);

  const renderWord = (item: WordData, i: number, refCb: (el: HTMLDivElement | null) => void) => {
    const isActive = i === activeWordIndex;
    const activeScale = isActive ? "scale-110" : "scale-100";
    const activeBlur = !isActive && activeWordIndex !== -1 ? "blur-[1px] opacity-60" : "opacity-100";
    return (
      <div
        key={i}
        ref={refCb}
        className={`relative ${item.chunkWithNext ? "mr-0.5" : "mx-1"} flex items-baseline group transition-all duration-200 ${activeScale} ${activeBlur}`}
      >
        {item.syllables.map((syl, sIdx) => {
          let yOffset = 0,
            fontSize = "text-base",
            color = isActive ? "text-cyan-300" : "text-white/60",
            weight = "font-medium",
            shadow = "";
          if (syl.pitch === 2 && syl.stress === 2) {
            yOffset = -10; fontSize = "text-xl"; weight = "font-bold";
            color = isActive ? "text-cyan-200" : "text-yellow-400";
            shadow = isActive ? "drop-shadow-[0_0_14px_rgba(34,211,238,0.9)]" : "drop-shadow-[0_0_10px_rgba(250,204,21,0.6)]";
          } else if (syl.pitch === 2) {
            yOffset = -4; fontSize = "text-lg"; weight = "font-semibold";
            color = isActive ? "text-cyan-300" : "text-white";
          } else {
            color = isActive ? "text-cyan-500" : "text-gray-400";
          }
          return (
            <span
              key={sIdx}
              className={`relative inline-block ${fontSize} ${color} ${weight} ${shadow} z-10 transition-colors duration-100`}
              style={{ transform: `translateY(${yOffset}px)`, transition: "transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)" }}
            >
              {syl.text}
            </span>
          );
        })}
      </div>
    );
  };

  // Before measurement, render hidden flex-wrap to measure positions
  if (lines.length === 0) {
    return (
      <div ref={containerRef} className="relative min-h-[2.5rem] w-full max-w-4xl mx-auto flex flex-wrap items-end justify-between content-end gap-y-1 mt-0 mb-0 px-6">
        {data.map((item, i) => renderWord(item, i, (el) => { wordRefs.current[i] = el; }))}
      </div>
    );
  }

  return (
    <div className="relative min-h-[2.5rem] w-full max-w-4xl mx-auto flex flex-col items-center justify-end gap-y-1 mt-0 mb-0 px-6">
      {lines.map((lineIndices, lineIdx) => {
        const isFirstLine = lineIdx === 0;
        const justify = isFirstLine || lineIndices.length >= 4 ? "justify-between" : "justify-center";
        return (
          <div key={lineIdx} className={`w-full flex flex-wrap items-baseline ${justify}`}>
            {lineIndices.map((wi) => renderWord(data[wi], wi, (el) => { wordRefs.current[wi] = el; }))}
          </div>
        );
      })}
    </div>
  );
}
