import { ChevronRight } from "lucide-react";
import MicRecordButton from "@/components/speaking/MicRecordButton";
import CueCard from "@/components/speaking/CueCard";
import FreehandNotePad from "@/components/speaking/FreehandNotePad";
import LiveTranscriptBar from "@/components/speaking/LiveTranscriptBar";
import SpeakingLeftPanel from "@/components/speaking/SpeakingLeftPanel";
import HomeworkInstructions from "@/components/speaking/HomeworkInstructions";
import { PART2_TOPIC } from "@/types/speaking";
import type { SpeakingQuestion } from "@/services/curriculum-storage";

interface TestState {
  status: string;
  currentPart: string | null;
  timeLeft: number;
  currentPartIndex: number;
  queue: unknown[];
}

interface SpeakingPanelProps {
  testState: TestState;
  isRecording: boolean;
  micDenied: boolean;
  activeStream: MediaStream | null;
  liveTranscript: string;
  liveInterim: string;
  speakingQuestions: SpeakingQuestion[];
  currentQuestionIndex: number;
  courseType: string | null;
  selectedWeek: number;
  shadowingWeek: number;
  userId: string | null;
  onWeekChange: (w: number) => void;
  onNextQuestion: () => void;
  onRecord: () => void;
  partLabel: (part: string) => string;
  skipPrep: () => void;
  advanceTest: () => void;
  handleNextQuestion: () => void;
}

export default function SpeakingPanel(props: SpeakingPanelProps) {
  const {
    testState, isRecording, micDenied, activeStream,
    liveTranscript, liveInterim, speakingQuestions, currentQuestionIndex,
    courseType, selectedWeek, shadowingWeek, userId,
    onWeekChange, onNextQuestion, onRecord,
    partLabel, skipPrep, advanceTest, handleNextQuestion,
  } = props;

  const sectionMap: Record<string, string> = {
    section_6: "Section 6", model_answer: "Section 6",
    part_2: "Part 2", part_3: "Part 3",
  };

  return (
    <>
      {/* Active test overlay */}
      {testState.status !== "idle" && testState.currentPart && (
        <div className="absolute inset-0 z-[60] flex flex-col justify-end pb-32 items-center animate-fade-in pointer-events-none">
          <div className="flex flex-col items-center pointer-events-auto">
            <div className="mb-2 text-cyan-400 text-xs font-bold uppercase tracking-[0.2em] bg-black/50 px-3 py-1 rounded-full border border-white/10">
              {partLabel(testState.currentPart)}
            </div>
            <div className={`font-black drop-shadow-2xl transition-all duration-500 ${testState.currentPart === "part2_prep" ? "text-amber-400" : "text-red-500"} ${testState.currentPart === "part2_speak" ? "text-4xl" : "text-6xl"}`}>
              {Math.floor(testState.timeLeft / 60)}:{(testState.timeLeft % 60).toString().padStart(2, "0")}
            </div>
            {testState.currentPart === "part2_prep" && (
              <button onClick={skipPrep} className="mt-4 px-6 py-2 bg-white/10 border border-white/20 rounded-full text-xs font-bold uppercase tracking-widest hover:bg-white/20 transition-colors">
                I'm Ready / Start Speaking
              </button>
            )}
            {testState.status === "paused_boundary" && (
              <button onClick={advanceTest} className="mt-4 px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl font-bold uppercase tracking-widest text-white shadow-lg hover:scale-105 transition-transform animate-fade-in">
                {testState.currentPartIndex < testState.queue.length - 1 ? "Start Next Part" : "Finish Test"}
              </button>
            )}
          </div>
          {testState.currentPart?.startsWith("part2") && <CueCard topic={PART2_TOPIC} />}
          {testState.currentPart?.startsWith("part2") && <FreehandNotePad />}
        </div>
      )}

      {/* Left side panel with week/question info */}
      {speakingQuestions.length > 0 && testState.status === "idle" && courseType && (
        <SpeakingLeftPanel
          weekNumber={selectedWeek}
          onWeekChange={onWeekChange}
          courseType={courseType}
          sectionLabel={(() => {
            const sid = speakingQuestions[currentQuestionIndex]?.sectionId;
            return sectionMap[sid] ?? sid ?? "Speaking";
          })()}
          questionIndex={currentQuestionIndex}
          totalQuestions={speakingQuestions.length}
          onNextQuestion={onNextQuestion}
        />
      )}

      {/* Homework Tasks — right side */}
      {courseType && testState.status === "idle" && (
        <div className="absolute right-2 sm:right-4 top-28 z-[320] w-[160px] sm:w-[200px] animate-fade-in">
          <div className="bg-black/50 backdrop-blur-2xl border border-white/[0.08] rounded-2xl p-4 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.5)]">
            <HomeworkInstructions
              courseType={courseType}
              selectedWeek={selectedWeek}
              shadowingWeek={shadowingWeek}
              userId={userId}
            />
          </div>
        </div>
      )}

      {/* Live Transcript Bar */}
      <LiveTranscriptBar
        transcript={liveTranscript}
        interim={liveInterim}
        isRecording={isRecording}
        questionText={speakingQuestions[currentQuestionIndex]?.text || undefined}
      />

      {/* Mic button — right side, vertically centered */}
      <div className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 z-[310] flex items-center justify-center">
        <div className="flex items-center gap-3 p-2 rounded-full bg-black/40 backdrop-blur-xl border border-white/10">
          <MicRecordButton
            isRecording={isRecording}
            micDenied={micDenied}
            onToggle={onRecord}
            stream={activeStream}
            size="xl"
            shape="circle"
            idleClassName="bg-white/10 border border-white/20 hover:bg-white/20"
          />
          {(testState.currentPart === "part1" || testState.currentPart === "part3") && isRecording && (
            <button onClick={handleNextQuestion} className="p-3 rounded-full bg-cyan-600 hover:bg-cyan-500 text-white transition-colors shadow-lg" title="Next Question">
              <ChevronRight className="w-6 h-6" />
            </button>
          )}
        </div>
      </div>
    </>
  );
}
