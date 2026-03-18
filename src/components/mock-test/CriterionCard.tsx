import type { CriterionScore } from "@/hooks/useMockTest";
import { Lightbulb } from "lucide-react";

interface Props {
  criterion: CriterionScore;
}

const CRITERION_COLORS: Record<string, string> = {
  "Fluency & Coherence": "border-primary/30 bg-primary/5",
  "Lexical Resource": "border-accent-foreground/30 bg-accent/10",
  "Grammatical Range & Accuracy": "border-yellow-500/30 bg-yellow-500/5",
  "Pronunciation": "border-purple-500/30 bg-purple-500/5",
};

export default function CriterionCard({ criterion }: Props) {
  const colorClass = CRITERION_COLORS[criterion.name] || "border-border bg-muted/10";

  return (
    <div className={`rounded-2xl border p-4 ${colorClass} transition-all hover:shadow-md`}>
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-bold text-foreground">{criterion.name}</h4>
        <span className="text-lg font-black text-foreground">{criterion.score}</span>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed mb-3">{criterion.assessment}</p>
      <div className="flex items-start gap-2 px-3 py-2 rounded-xl bg-muted/30">
        <Lightbulb className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
        <p className="text-xs text-foreground/80 leading-relaxed">{criterion.tip}</p>
      </div>
    </div>
  );
}
