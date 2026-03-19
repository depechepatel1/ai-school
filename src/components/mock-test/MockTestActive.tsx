import { ChevronRight, Square, Loader2 } from "lucide-react";
import type { TestPart } from "@/types/speaking";
import type { ChatMsg } from "@/types/speaking";
import CountdownRing from "./CountdownRing";
import CueCard from "@/components/speaking/CueCard";
import FreehandNotePad from "@/components/speaking/FreehandNotePad";
import MicRecordButton from "@/components/speaking/MicRecordButton";
import LiveTranscriptBar from "@/components/speaking/LiveTranscriptBar";
import { PART2_TOPIC } from "@/types/speaking";

interface Props {
  currentPart: TestPart | null;
  timeLeft: number;
  status: string;
  completedParts: string[];
  partLabel: string;
  isRecording: boolean;
  isAiThinking: boolean;
  liveTranscript: string;
  liveInterim: string;
  messages: ChatMsg[];
  onAdvance: () => void;
  onSkipPrep: () => void;
  onNextQuestion: () => void;
  onStopTest: () => void;
  activeStream?: MediaStream | null;
  micDenied?: boolean;
  onToggleRecord?: () => void;
}

const PART_DURATIONS: Record<string, number> = {
  part1: 300,
  part2_prep: 60,
  part2_speak: 120,
  part3: 300,
};

export default function MockTestActive({
  currentPart, timeLeft, status, completedParts, partLabel,
  isRecording, isAiThinking, liveTranscript, liveInterim, messages,
  onAdvance, onSkipPrep, onNextQuestion, onStopTest,
  activeStream, micDenied, onToggleRecord,
}: Props) {
  const totalTime = currentPart ? PART_DURATIONS[currentPart] || 300 : 300;
  const lastTeacherMsg = [...messages].reverse().find((m) => m.role === "teacher");

  return (
    <div className="absolute inset-0 z-[200] flex flex-col animate-fade-in">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 pt-4 z-[210] relative">
        <div className="flex items-center gap-3">
          {/* Completed parts indicators */}
          <div className="flex gap-1">
            {completedParts.map((p, i) => (
              <span key={i} className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-[10px] font-bold">{p} ✓</span>
            ))}
          </div>
          <span className="px-3 py-1.5 rounded-full bg-card/80 backdrop-blur-xl border border-border text-xs font-bold text-foreground">
            {partLabel}
          </span>
        </div>
        <div className="flex items-center gap-3 mr-14">
          <button onClick={onStopTest} className="p-2.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive hover:bg-destructive/20 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center" title="End Test">
            <Square className="w-4 h-4" />
          </button>
          <CountdownRing timeLeft={timeLeft} totalTime={totalTime} size={64} strokeWidth={4} />
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col items-end justify-center px-4 relative">
        {/* Part 2 Prep: Cue card + notepad */}
        {currentPart === "part2_prep" && (
          <div className="flex flex-col lg:flex-row gap-4 w-full max-w-4xl items-start justify-center">
            <div className="flex-1 min-w-0">
              <CueCard topic={PART2_TOPIC} />
            </div>
            <div className="flex-1 min-w-0 hidden lg:block">
              <FreehandNotePad />
            </div>
            <button
              onClick={onSkipPrep}
              className="self-center mt-4 lg:mt-0 px-8 py-4 bg-primary rounded-2xl text-primary-foreground font-bold uppercase tracking-widest hover:bg-primary/90 transition-colors shadow-lg min-h-[48px]"
            >
              I'm Ready — Start Speaking
            </button>
          </div>
        )}

        {/* Part 1, 2 speak, 3: Question + mic */}
        {(currentPart === "part1" || currentPart === "part2_speak" || currentPart === "part3") && (
          <>
            {/* AI Question floating panel */}
            {lastTeacherMsg && (
              <div className="absolute top-4 left-4 max-w-sm bg-card/80 backdrop-blur-xl border border-border rounded-2xl p-4 shadow-lg animate-fade-in">
                <span className="text-[10px] font-bold uppercase tracking-widest text-primary mb-1 block">Examiner</span>
                <p className="text-sm text-foreground leading-relaxed">
                  {isAiThinking ? (
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="w-3 h-3 animate-spin" /> Thinking...
                    </span>
                  ) : lastTeacherMsg.text}
                </p>
              </div>
            )}

            {/* Part 2 cue card on left during speaking */}
            {currentPart === "part2_speak" && (
              <div className="absolute bottom-32 left-4 w-64 opacity-60 scale-90 origin-bottom-left">
                <CueCard topic={PART2_TOPIC} />
              </div>
            )}
          </>
        )}

        {/* Paused boundary — advance button */}
        {status === "paused_boundary" && (
          <button
            onClick={onAdvance}
            className="px-10 py-4 bg-primary rounded-2xl text-primary-foreground font-bold uppercase tracking-widest shadow-lg hover:bg-primary/90 transition-all animate-fade-in min-h-[56px] text-base"
          >
            {completedParts.length < 3 ? "Start Next Part →" : "Finish Test"}
          </button>
        )}
      </div>

      {/* Bottom controls */}
      <div className="px-4 pb-4 z-10">
        {/* Live Transcript */}
        <LiveTranscriptBar
          transcript={liveTranscript}
          interim={liveInterim}
          isRecording={isRecording}
        />

        {/* Mic controls */}
        {status === "running" && (currentPart === "part1" || currentPart === "part2_speak" || currentPart === "part3") && (
          <div className="flex items-center justify-center gap-3 mt-3">
            <MicRecordButton
              isRecording={isRecording}
              micDenied={micDenied ?? false}
              onToggle={onToggleRecord ?? (() => {})}
              stream={activeStream ?? null}
              size="xl"
              shape="circle"
            />
            {(currentPart === "part1" || currentPart === "part3") && isRecording && (
              <button onClick={onNextQuestion}
                className="p-4 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground transition-colors shadow-lg min-w-[56px] min-h-[56px] flex items-center justify-center"
                title="Next Question"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
