import { Check, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UKFlag, USFlag } from "@/components/speaking/FlagIcons";

interface Props {
  selectedParts: { part1: boolean; part2: boolean; part3: boolean };
  onTogglePart: (part: "part1" | "part2" | "part3") => void;
  selectedWeek: number;
  onWeekChange: (w: number) => void;
  accent: "UK" | "US";
  onAccentChange: (a: "UK" | "US") => void;
  estimatedMinutes: number;
  onStart: () => void;
  onBack: () => void;
}

const PART_INFO = [
  { key: "part1" as const, label: "Part 1", subtitle: "Introduction & Interview", time: "4-5 min", desc: "Personal questions about familiar topics" },
  { key: "part2" as const, label: "Part 2", subtitle: "Long Turn", time: "3-4 min", desc: "1 min prep + 2 min monologue on a cue card topic" },
  { key: "part3" as const, label: "Part 3", subtitle: "Discussion", time: "4-5 min", desc: "Abstract questions related to Part 2 topic" },
];

export default function MockTestConfig({
  selectedParts, onTogglePart, selectedWeek, onWeekChange,
  accent, onAccentChange, estimatedMinutes, onStart, onBack,
}: Props) {
  const anySelected = selectedParts.part1 || selectedParts.part2 || selectedParts.part3;

  return (
    <div className="absolute inset-0 z-[200] flex items-center justify-end pr-6 md:pr-10 p-4 animate-fade-in">
      <div className="w-full max-w-sm bg-card/80 backdrop-blur-[60px] border border-border rounded-3xl p-5 md:p-6 shadow-2xl max-h-[calc(100vh-2rem)] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button onClick={onBack} className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-bold text-foreground">IELTS Mock Test</h2>
          <div className="w-9" />
        </div>

        {/* Part Selection */}
        <div className="space-y-2 mb-6">
          <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Select Parts</span>
          {PART_INFO.map((p) => (
            <button
              key={p.key}
              onClick={() => onTogglePart(p.key)}
              className={`w-full flex items-center justify-between p-3 md:p-4 rounded-2xl text-left transition-all min-h-[56px] ${
                selectedParts[p.key]
                  ? "bg-primary/10 border border-primary/30 text-foreground"
                  : "bg-muted/30 border border-transparent text-muted-foreground hover:bg-muted/50"
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm">{p.label}</span>
                  <span className="text-xs text-muted-foreground">{p.subtitle}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 hidden md:block">{p.desc}</p>
              </div>
              <div className="flex items-center gap-2 ml-2">
                <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" />{p.time}</span>
                {selectedParts[p.key] && <Check className="w-4 h-4 text-primary" />}
              </div>
            </button>
          ))}
        </div>

        {/* Week & Accent Row */}
        <div className="flex gap-3 mb-6">
          {/* Week Selector */}
          <div className="flex-1 bg-muted/30 rounded-2xl p-3 border border-transparent">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-2">Cue Card Week</span>
            <div className="flex items-center justify-between">
              <button onClick={() => onWeekChange(Math.max(1, selectedWeek - 1))} className="p-1.5 rounded-lg hover:bg-accent transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center">
                <ChevronLeft className="w-4 h-4 text-muted-foreground" />
              </button>
              <span className="font-bold text-foreground text-center flex-1">Week {selectedWeek}</span>
              <button onClick={() => onWeekChange(Math.min(20, selectedWeek + 1))} className="p-1.5 rounded-lg hover:bg-accent transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center">
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          </div>

          {/* Accent */}
          <div className="bg-muted/30 rounded-2xl p-3 border border-transparent">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-2">Accent</span>
            <div className="flex gap-1">
              {(["UK", "US"] as const).map((a) => (
                <button key={a} onClick={() => onAccentChange(a)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all min-h-[36px] ${
                    accent === a ? "bg-primary/15 text-foreground border border-primary/30" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                >
                  {a === "UK" ? <UKFlag /> : <USFlag />}
                  <span className="text-xs font-semibold">{a}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Estimated Time */}
        {anySelected && (
          <div className="text-center mb-4">
            <span className="text-xs text-muted-foreground">Estimated time: </span>
            <span className="text-sm font-bold text-foreground">~{estimatedMinutes} minutes</span>
          </div>
        )}

        {/* Start Button */}
        <Button
          onClick={onStart}
          disabled={!anySelected}
          className="w-full h-14 text-base font-bold uppercase tracking-widest bg-primary hover:bg-primary/90 text-primary-foreground rounded-2xl shadow-[0_0_30px_-5px_hsl(var(--primary)/0.4)]"
        >
          Begin Test
        </Button>
      </div>
    </div>
  );
}
