import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import PageShell from "@/components/PageShell";
import { useVideoLoopStack } from "@/hooks/useVideoLoopStack";
import { useAudioCapture } from "@/hooks/useAudioCapture";
import { useCourseWeek } from "@/hooks/useCourseWeek";
import { useMockTest } from "@/hooks/useMockTest";
import { preloadAccent, type Accent } from "@/lib/tts-provider";
import CountdownOverlay from "@/components/speaking/CountdownOverlay";
import MockTestConfig from "@/components/mock-test/MockTestConfig";
import MockTestActive from "@/components/mock-test/MockTestActive";
import MockTestScoring from "@/components/mock-test/MockTestScoring";
import MockTestReport from "@/components/mock-test/MockTestReport";

export default function IELTSMockTest() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [accent, setAccent] = useState<"UK" | "US">("UK");
  const accentLower = accent.toLowerCase() as Accent;

  const { videoList } = useVideoLoopStack();
  const { activeStream, micDenied, startMediaRecorder, stopMediaRecorder } = useAudioCapture();
  const courseWeek = useCourseWeek(userId);

  const test = useMockTest({ accent: accentLower, userId });

  const handleToggleRecord = useCallback(async () => {
    if (test.isRecording) {
      stopMediaRecorder();
    } else {
      await startMediaRecorder();
    }
  }, [test.isRecording, startMediaRecorder, stopMediaRecorder]);

  const videoPosition = test.phase === "config" ? "20% 45%" : "center center";

  return (
    <PageShell fullWidth loopVideos={videoList} hideFooter objectPosition={videoPosition}>
      <div className="relative w-full h-full text-foreground font-outfit select-none animate-fade-in-up">

        {test.phase === "config" && (
          <MockTestConfig
            selectedParts={test.selectedParts}
            onTogglePart={(p) => test.setSelectedParts((prev) => ({ ...prev, [p]: !prev[p] }))}
            selectedWeek={test.selectedWeek}
            onWeekChange={test.setSelectedWeek}
            accent={accent}
            onAccentChange={(a) => { setAccent(a); preloadAccent(a.toLowerCase() as Accent); }}
            estimatedMinutes={test.estimatedMinutes}
            onStart={test.startTest}
            onBack={() => navigate("/student")}
          />
        )}

        {/* Phase 2: Countdown */}
        {test.phase === "countdown" && test.countdown !== null && (
          <CountdownOverlay count={test.countdown} />
        )}

        {/* Phase 3: Active Test */}
        {test.phase === "active" && (
          <MockTestActive
            currentPart={test.currentPart}
            timeLeft={test.timeLeft}
            status={test.status}
            completedParts={test.completedParts}
            partLabel={test.partLabel(test.currentPart)}
            isRecording={test.isRecording}
            isAiThinking={test.isAiThinking}
            liveTranscript={test.liveTranscript}
            liveInterim={test.liveInterim}
            messages={test.messages}
            onAdvance={test.advancePart}
            onSkipPrep={test.skipPrep}
            onNextQuestion={test.handleNextQuestion}
            onStopTest={test.stopTestEarly}
            examinerText={test.examinerText}
            examinerCharIndex={test.examinerCharIndex}
            activeStream={activeStream}
            micDenied={micDenied}
            onToggleRecord={handleToggleRecord}
          />
        )}

        {/* Phase 4: Scoring */}
        {test.phase === "scoring" && (
          <MockTestScoring currentStep={test.scoringStep} />
        )}

        {/* Phase 5: Report */}
        {test.phase === "report" && test.result && (
          <MockTestReport
            result={test.result}
            completedParts={test.completedParts}
            onSave={test.saveSession}
            onRetry={test.resetTest}
            onHome={() => navigate("/student")}
          />
        )}
      </div>
    </PageShell>
  );
}
