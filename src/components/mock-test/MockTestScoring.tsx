import { Loader2 } from "lucide-react";

const STEPS = [
  "Analyzing fluency...",
  "Evaluating vocabulary...",
  "Scoring grammar...",
  "Generating report...",
];

interface Props {
  currentStep: number;
}

export default function MockTestScoring({ currentStep }: Props) {
  return (
    <div className="absolute inset-0 z-[300] flex items-center justify-center bg-background/90 backdrop-blur-xl animate-fade-in">
      <div className="flex flex-col items-center gap-8 max-w-sm text-center px-4">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
        <div className="space-y-3 w-full">
          {STEPS.map((step, i) => (
            <div
              key={i}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-500 ${
                i < currentStep
                  ? "bg-primary/10 text-primary"
                  : i === currentStep
                  ? "bg-card border border-border text-foreground animate-pulse"
                  : "text-muted-foreground/40"
              }`}
            >
              <div className={`w-2 h-2 rounded-full shrink-0 ${
                i < currentStep ? "bg-primary" : i === currentStep ? "bg-foreground" : "bg-muted"
              }`} />
              <span className="text-sm font-medium">{step}</span>
              {i < currentStep && <span className="ml-auto text-xs">✓</span>}
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">Analyzing your performance...</p>
      </div>
    </div>
  );
}
