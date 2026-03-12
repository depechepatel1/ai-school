import { UKFlag, USFlag } from "./FlagIcons";

export type Accent = "uk" | "us";

interface AccentSelectorProps {
  accent: Accent;
  onChange: (accent: Accent) => void;
}

export default function AccentSelector({ accent, onChange }: AccentSelectorProps) {
  return (
    <div className="flex flex-col items-center gap-1.5 p-1.5 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/[0.08]">
      <button
        onClick={() => onChange("uk")}
        className={`relative p-1.5 rounded-xl transition-all duration-200 ${
          accent === "uk"
            ? "ring-2 ring-cyan-400/60 bg-white/10 shadow-[0_0_12px_rgba(34,211,238,0.25)]"
            : "opacity-40 hover:opacity-70"
        }`}
        title="British English"
      >
        <UKFlag size={44} />
        {accent === "uk" && (
          <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 text-[7px] font-bold uppercase tracking-widest text-cyan-300">UK</span>
        )}
      </button>
      <button
        onClick={() => onChange("us")}
        className={`relative p-1.5 rounded-xl transition-all duration-200 ${
          accent === "us"
            ? "ring-2 ring-cyan-400/60 bg-white/10 shadow-[0_0_12px_rgba(34,211,238,0.25)]"
            : "opacity-40 hover:opacity-70"
        }`}
        title="American English"
      >
        <USFlag size={44} />
        {accent === "us" && (
          <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 text-[7px] font-bold uppercase tracking-widest text-cyan-300">US</span>
        )}
      </button>
    </div>
  );
}
