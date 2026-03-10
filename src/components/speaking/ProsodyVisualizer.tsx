import type { WordData } from "@/lib/prosody";

interface Props {
  data: WordData[];
  activeWordIndex: number;
}

export default function ProsodyVisualizer({ data, activeWordIndex }: Props) {
  return (
    <div className="relative min-h-[6rem] w-full max-w-3xl mx-auto flex flex-wrap items-center justify-between content-center gap-y-4 mt-4 mb-2 px-8">
      {data.map((item, i) => {
        const isActive = i === activeWordIndex;
        const activeScale = isActive ? "scale-110" : "scale-100";
        const activeBlur = !isActive && activeWordIndex !== -1 ? "blur-[1px] opacity-60" : "opacity-100";
        return (
          <div
            key={i}
            className={`relative ${item.chunkWithNext ? "mr-1" : "mx-2"} flex items-baseline group transition-all duration-200 ${activeScale} ${activeBlur}`}
          >
            {item.syllables.map((syl, sIdx) => {
              let yOffset = 0,
                fontSize = "text-2xl",
                color = isActive ? "text-cyan-300" : "text-white/60",
                weight = "font-medium",
                shadow = "";
              if (syl.pitch === 2 && syl.stress === 2) {
                yOffset = -20; fontSize = "text-4xl"; weight = "font-bold";
                color = isActive ? "text-cyan-200" : "text-yellow-400";
                shadow = isActive ? "drop-shadow-[0_0_20px_rgba(34,211,238,0.9)]" : "drop-shadow-[0_0_15px_rgba(250,204,21,0.6)]";
              } else if (syl.pitch === 2) {
                yOffset = -8; fontSize = "text-2xl"; weight = "font-semibold";
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
      })}
    </div>
  );
}
