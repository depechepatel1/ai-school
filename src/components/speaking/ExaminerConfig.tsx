import { useState } from "react";
import { X, Check } from "lucide-react";

interface Props {
  onStartTest: (parts: string[]) => void;
  onClose: () => void;
}

export default function ExaminerConfig({ onStartTest, onClose }: Props) {
  const [selectedParts, setSelectedParts] = useState({ part1: true, part2: true, part3: true });
  const toggle = (part: "part1" | "part2" | "part3") => setSelectedParts((p) => ({ ...p, [part]: !p[part] }));

  return (
    <div className="absolute top-40 right-8 w-64 bg-white/[0.03] backdrop-blur-[40px] border border-white/10 rounded-2xl p-4 z-[200] animate-fade-in shadow-[0_0_30px_-5px_rgba(34,211,238,0.3)]">
      <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-2">
        <span className="text-xs font-bold uppercase text-cyan-300">Choose Test Setup</span>
        <button onClick={onClose}><X className="w-4 h-4 text-white/50 hover:text-white" /></button>
      </div>
      <div className="space-y-2 mb-4">
        {(["Part 1", "Part 2", "Part 3"] as const).map((label, i) => {
          const key = `part${i + 1}` as "part1" | "part2" | "part3";
          return (
            <button key={key} onClick={() => toggle(key)}
              className={`w-full flex items-center justify-between p-2 rounded-lg text-sm font-medium transition-colors ${selectedParts[key] ? "bg-cyan-500/20 text-cyan-200 border border-cyan-500/30" : "bg-white/5 text-gray-400 hover:bg-white/10"}`}>
              {label}
              {selectedParts[key] && <Check className="w-4 h-4" />}
            </button>
          );
        })}
      </div>
      <button
        onClick={() => { const parts: string[] = []; if (selectedParts.part1) parts.push("part1"); if (selectedParts.part2) parts.push("part2"); if (selectedParts.part3) parts.push("part3"); if (parts.length > 0) onStartTest(parts); }}
        className="w-full py-2 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg text-xs font-bold uppercase tracking-widest hover:brightness-110 shadow-lg">
        Start Test
      </button>
    </div>
  );
}
