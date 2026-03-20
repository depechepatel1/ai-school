import { Download, RotateCcw, Home, Save, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MockTestResult } from "@/hooks/useMockTest";
import BandScoreDonut from "./BandScoreDonut";
import CriterionCard from "./CriterionCard";
import { useState } from "react";

interface Props {
  result: MockTestResult;
  completedParts: string[];
  onSave: () => void;
  onRetry: () => void;
  onHome: () => void;
}

export default function MockTestReport({ result, completedParts, onSave, onRetry, onHome }: Props) {
  const [showTranscript, setShowTranscript] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    onSave();
    setSaved(true);
  };

  const handleDownload = () => {
    const text = [
      `IELTS Mock Test Report`,
      `Overall Band: ${result.overallBand}`,
      `Parts Completed: ${completedParts.join(", ")}`,
      ``,
      ...result.criteria.map((c) => `${c.name}: ${c.score}\n${c.assessment}\nTip: ${c.tip}`),
      ``,
      `Vocabulary Suggestions: ${result.vocabularySuggestions.join(", ")}`,
      ``,
      `--- Transcript ---`,
      result.transcript,
    ].join("\n");

    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ielts-mock-test-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="absolute inset-0 z-[300] overflow-y-auto bg-background/95 backdrop-blur-xl animate-fade-in">
      <div className="max-w-2xl mx-auto px-4 py-8 md:py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-black text-foreground mb-2">Test Complete 🎉</h2>
          <p className="text-sm text-muted-foreground">{completedParts.length} part{completedParts.length !== 1 ? "s" : ""} completed</p>
        </div>

        {/* Band Score Donut */}
        <div className="flex justify-center mb-8">
          <BandScoreDonut score={result.overallBand} />
        </div>

        {/* Criteria Cards */}
        <div className="grid gap-3 mb-8">
          {result.criteria.map((c, i) => (
            <CriterionCard key={i} criterion={c} />
          ))}
        </div>

        {/* Vocabulary Suggestions */}
        {result.vocabularySuggestions.length > 0 && (
          <div className="mb-8">
            <h3 className="text-sm font-bold text-foreground mb-3">Vocabulary to Try Next Time</h3>
            <div className="flex flex-wrap gap-2">
              {result.vocabularySuggestions.map((word, i) => (
                <span key={i} className="px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary">
                  {word}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Transcript Accordion */}
        <div className="mb-8">
          <button
            onClick={() => setShowTranscript(!showTranscript)}
            className="flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronDown className={`w-4 h-4 transition-transform ${showTranscript ? "rotate-180" : ""}`} />
            View Full Transcript
          </button>
          {showTranscript && (
            <div className="mt-3 p-4 rounded-2xl bg-muted/20 border border-border max-h-[40vh] overflow-y-auto">
              <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-sans leading-relaxed">
                {result.transcript}
              </pre>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Button onClick={handleSave} disabled={saved} variant="outline" className="h-12 min-h-[48px]">
            <Save className="w-4 h-4 mr-1.5" />
            {saved ? "Saved ✓" : "Save"}
          </Button>
          <Button onClick={handleDownload} variant="outline" className="h-12 min-h-[48px]">
            <Download className="w-4 h-4 mr-1.5" />
            Download
          </Button>
          <Button onClick={onRetry} variant="outline" className="h-12 min-h-[48px]">
            <RotateCcw className="w-4 h-4 mr-1.5" />
            Try Again
          </Button>
          <Button onClick={onHome} className="h-12 min-h-[48px]">
            <Home className="w-4 h-4 mr-1.5" />
            Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
