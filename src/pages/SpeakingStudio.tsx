import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import {
  Mic, MicOff, Play, Headphones, ChevronRight, ArrowLeft, SkipForward, Loader2, X } from
"lucide-react";
import MicRecordButton from "@/components/speaking/MicRecordButton";
import PageShell from "@/components/PageShell";
import { parseProsody, type WordData } from "@/lib/prosody";
import { speak, stopSpeaking, preloadAccent, type Accent } from "@/lib/tts-provider";
import { analyzeContour } from "@/lib/speech-analysis-provider";


// ── Components ──
import PronunciationVisualizer from "@/components/speaking/PronunciationVisualizer";

import ProsodyVisualizer from "@/components/speaking/ProsodyVisualizer";
import XPWidget from "@/components/speaking/XPWidget";
import StreakWidget from "@/components/speaking/StreakWidget";
import CountdownOverlay from "@/components/speaking/CountdownOverlay";
import PersonaSelector from "@/components/speaking/PersonaSelector";
import ExaminerConfig from "@/components/speaking/ExaminerConfig";
import CueCard from "@/components/speaking/CueCard";
import FreehandNotePad from "@/components/speaking/FreehandNotePad";
import SaveSessionModal from "@/components/speaking/SaveSessionModal";
import SessionFeedbackCard from "@/components/speaking/SessionFeedbackCard";
import LiveTranscriptBar from "@/components/speaking/LiveTranscriptBar";
import { UKFlag, USFlag } from "@/components/speaking/FlagIcons";

// ── Hooks ──
import { useXP } from "@/hooks/useXP";
import { useVideoLoopStack } from "@/hooks/useVideoLoopStack";
import { useAudioCapture } from "@/hooks/useAudioCapture";
import { useCurriculum } from "@/hooks/useCurriculum";
import { useSpeakingTest } from "@/hooks/useSpeakingTest";
import { useCourseWeek } from "@/hooks/useCourseWeek";
import { useFluencyTimings, usePronunciationTimings } from "@/hooks/useTTSTimings";
import { useShadowingCurriculum } from "@/hooks/useShadowingCurriculum";
import { usePracticeTimer, type ActivityType, type PracticeMode } from "@/hooks/usePracticeTimer";
import { PART2_TOPIC } from "@/types/speaking";
import WeekSelector from "@/components/speaking/WeekSelector";
import { getSpeakingQuestions, type SpeakingQuestion } from "@/services/curriculum-storage";
import SpeakingLeftPanel from "@/components/speaking/SpeakingLeftPanel";
import HomeworkInstructions from "@/components/speaking/HomeworkInstructions";

export default function SpeakingStudio() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const userId = user?.id ?? null;

  // ── Local UI state ──
  const [mode, setMode] = useState<"shadowing" | "speaking">("shadowing");
  const practiceMode: PracticeMode = "homework";
  const [accent, setAccent] = useState<"UK" | "US">("UK");
  const [practiceType, setPracticeType] = useState<"pronunciation" | "fluency">("pronunciation");
  const [rawText, setRawText] = useState("");
  const [prosodyData, setProsodyData] = useState<WordData[]>([]);
  const [isPlayingModel, setIsPlayingModel] = useState(false);
  const [activeWordIndex, setActiveWordIndex] = useState(-1);
  const [targetProgress, setTargetProgress] = useState(0);
  const [sentenceKey, setSentenceKey] = useState(0);

  

  const [isRecordingShadow, setIsRecordingShadow] = useState(false);

  const chatScrollRef = useRef<HTMLDivElement>(null);
  const accentLower = accent.toLowerCase() as Accent;

  // ── Hooks ──
  const { videoList } = useVideoLoopStack();
  const { xp, level, addXP } = useXP();
  const { lastRecordingUrl, isPlayingReplay, micDenied, activeStream, startMediaRecorder, stopMediaRecorder, handleReplay, clearRecording, clearMicDenied } = useAudioCapture();
  const curriculum = useCurriculum(userId, "pronunciation");
  const test = useSpeakingTest({ accent: accentLower });
  const courseWeek = useCourseWeek(userId);
  const shadowCurriculum = useShadowingCurriculum(courseWeek.courseType, courseWeek.shadowingWeek);
  const fluencyTimings = useFluencyTimings(courseWeek.courseType as "ielts" | "igcse" | null);
  const pronunciationTimings = usePronunciationTimings();
  const [speakingQuestions, setSpeakingQuestions] = useState<SpeakingQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  // Derive activity type for timer
  const timerActivityType: ActivityType = mode === "speaking" ?
  "speaking" :
  practiceType === "fluency" ?
  "shadowing" :
  "pronunciation";

  // Audio active = recording or playing model
  const isAudioActive = isRecordingShadow || isPlayingModel || test.isRecording;

  const practiceTimer = usePracticeTimer({
    userId,
    courseType: courseWeek.courseType,
    activityType: timerActivityType,
    weekNumber: courseWeek.selectedWeek,
    practiceMode,
    isAudioActive
  });

  // Sync prosody + reset visualizer on new sentence
  useEffect(() => {
    setProsodyData(parseProsody(rawText));
    setTargetProgress(0);
    setActiveWordIndex(-1);
    setSentenceKey((k) => k + 1);
  }, [rawText]);
  useEffect(() => {preloadAccent(accentLower);}, [accentLower]);

  // Sync curriculum sentence (pronunciation mode)
  useEffect(() => {
    if (curriculum.currentSentence && practiceType === "pronunciation") {
      setRawText(curriculum.currentSentence);
    }
  }, [curriculum.currentSentence, practiceType]);

  // Sync shadowing curriculum chunk (fluency mode)
  useEffect(() => {
    if (practiceType === "fluency") {
      setRawText(shadowCurriculum.currentChunk?.text ?? "");
    }
  }, [practiceType, shadowCurriculum.currentChunk]);

  // Load speaking questions when course/week changes
  useEffect(() => {
    if (!courseWeek.courseType || !shadowCurriculum.curriculumData) return;
    const qs = getSpeakingQuestions(shadowCurriculum.curriculumData, courseWeek.selectedWeek);
    setSpeakingQuestions(qs);
    setCurrentQuestionIndex(0);
  }, [courseWeek.courseType, courseWeek.selectedWeek, shadowCurriculum.curriculumData]);

  // Auto-scroll chat
  useEffect(() => {chatScrollRef.current?.scrollIntoView({ behavior: "smooth" });}, [test.messages, test.isAiThinking]);

  // ── Shadowing handlers ──
  const handleGenerate = (type: "pronunciation" | "fluency") => {
    if (type === "pronunciation") {
      curriculum.loadCurriculumPage(Math.floor(Math.random() * 100) * 5);
    }
    // fluency type is handled by useShadowingCurriculum
    clearRecording();
  };

  const handleNextSentence = useCallback(async () => {
    clearRecording();
    if (practiceType === "fluency") {
      shadowCurriculum.nextChunk();
    } else {
      const sentence = await curriculum.handleNextSentence();
      if (sentence) setRawText(sentence);
    }
  }, [curriculum, clearRecording, practiceType, shadowCurriculum]);

  const handlePitchContour = useCallback((contour: number[]) => {
    if (mode === "shadowing" && contour.length > 0) {
      const result = analyzeContour(contour, rawText);
      curriculum.saveProgress(result.overallScore);
    }
  }, [mode, rawText, curriculum]);

  // Compute target progress from activeWordIndex + prosodyData
  const computeTargetProgress = useCallback((wordIdx: number) => {
    if (prosodyData.length === 0) return 0;
    const allSyl = prosodyData.flatMap((d) => d.syllables);
    if (allSyl.length === 0) return 0;
    let sylCount = 0;
    for (let i = 0; i <= wordIdx && i < prosodyData.length; i++) {
      sylCount += prosodyData[i].syllables.length;
    }
    return Math.min(1, sylCount / allSyl.length);
  }, [prosodyData]);

  const handlePlayModel = async () => {
    if (isPlayingModel) {
      test.ttsHandleRef.current?.stop();
      setIsPlayingModel(false);
      setActiveWordIndex(-1);
      return;
    }

    setIsPlayingModel(true);
    setActiveWordIndex(0);
    setTargetProgress(0);

    test.ttsHandleRef.current = speak(rawText, accentLower, {
      rate: 0.8, pitch: 1.1,
      onBoundary: (charIndex) => {
        const idx = prosodyData.findIndex((w) => w.startChar <= charIndex && charIndex < w.endChar);
        if (idx !== -1) {
          setActiveWordIndex(idx);
          setTargetProgress(computeTargetProgress(idx));
        }
      },
      onEnd: () => {
        setIsPlayingModel(false);
        setActiveWordIndex(-1);
        setTargetProgress(1); // freeze full contour
      }
    });
    addXP(5);
  };

  const handleRecord = async () => {
    if (mode === "speaking") {
      if (test.testState.status !== "idle") {test.stopTestManual();stopMediaRecorder();return;}
      if (test.isRecording) {
        test.setIsRecording(false);
        test.stopSpeechRecognition();
        stopMediaRecorder();
        addXP(20);
      } else {
        test.setIsRecording(true);
        await startMediaRecorder();
        test.startSpeechRecognition();
      }
      return;
    }
    // Shadowing mode
    if (isRecordingShadow) {
      stopShadowRecording();
    } else {
      startShadowRecording();
    }
  };

  const startShadowRecording = async () => {
    setIsRecordingShadow(true);
    clearRecording();
    await startMediaRecorder();
  };

  const stopShadowRecording = useCallback(() => {
    setIsRecordingShadow(false);
    stopMediaRecorder();
    addXP(20);
  }, [stopMediaRecorder, addXP]);

  return (
    <PageShell
      fullWidth
      loopVideos={videoList}
      hideFooter>

      <div className="relative w-full h-full text-white font-outfit select-none animate-fade-in-up">
        {/* Back button + course badge */}
        <div className="absolute top-4 left-4 z-[300] flex items-center gap-2">
          <button onClick={() => navigate("/student")} className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-black/50 backdrop-blur-2xl border border-white/10 text-white/60 hover:text-white hover:bg-black/70 hover:border-white/20 transition-all text-[11px] font-semibold tracking-wide group">
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" /> Back
          </button>
          {courseWeek.courseType && (
            <span className="px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-[0.12em] backdrop-blur-2xl bg-amber-500/20 border border-amber-500/30 text-amber-300">
              {courseWeek.courseType === "ielts" ? "IELTS" : "IGCSE"} · Homework · Speaking
            </span>
          )}
        </div>

        {/* Top Bar */}
        <div className="absolute top-16 left-0 right-0 px-3 z-50 flex justify-between items-start">
          <div className="gap-2.5 ml-2 flex flex-col animate-fade-in">
            {/* Practice Mode toggle */}
            
            {test.testState.status === "idle" &&
              <div className="flex p-1 gap-1 rounded-2xl bg-black/50 backdrop-blur-2xl border border-white/[0.08] shadow-[0_4px_24px_-4px_rgba(0,0,0,0.5)]">
                <button onClick={() => setMode("shadowing")}
                  className={`px-4 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all duration-300 ${mode === "shadowing" ? "bg-cyan-500/90 text-black shadow-[0_2px_12px_rgba(6,182,212,0.4)]" : "text-white/35 hover:text-white/60"}`}>
                  Shadowing
                </button>
                <button onClick={() => {setMode("speaking");if (courseWeek.courseType === "ielts") test.setShowTestConfig(true);}}
                  className={`px-4 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all duration-300 ${mode === "speaking" ? "bg-purple-500/90 text-white shadow-[0_2px_12px_rgba(168,85,247,0.4)]" : "text-white/35 hover:text-white/60"}`}>
                  Speaking
                </button>
              </div>
            }
            <div style={{ animationDelay: '0s' }} className="animate-fade-in">
              <StreakWidget
                displaySeconds={practiceTimer.displaySeconds}
                isCountdown={practiceTimer.isCountdown}
                isComplete={practiceTimer.isComplete}
                isRunning={practiceTimer.isRunning}
                isOvertime={practiceTimer.isOvertime}
                modeLabel="Homework"
                onPause={practiceTimer.pause}
                onResume={practiceTimer.resume} />
            </div>

            {mode === "shadowing" &&
            <>
                {curriculum.currentTopic && practiceType === "pronunciation" &&
              <div className="bg-black/40 backdrop-blur-2xl border border-white/[0.06] rounded-2xl px-3.5 py-2.5 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.5)] hover:border-white/[0.12] transition-colors animate-fade-in" style={{ animationDelay: '0.1s' }}>
                    <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-white/35">Topic</span>
                    <div className="text-[13px] font-semibold text-white/90 mt-1 leading-tight">{curriculum.currentTopic}</div>
                  </div>
              }
                <div className="flex gap-0.5 bg-black/40 backdrop-blur-2xl border border-white/[0.06] rounded-2xl p-1 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.5)] animate-fade-in" style={{ animationDelay: '0.2s' }}>
                  {(["pronunciation", "fluency"] as const).map((t) =>
                <button key={t} onClick={() => {setPracticeType(t);handleGenerate(t);}}
                className={`px-3.5 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all duration-200 ${practiceType === t ? "bg-white/10 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]" : "text-white/30 hover:text-white/60 hover:bg-white/[0.04]"}`}>
                      {t}
                    </button>
                )}
                </div>
              </>
            }
          </div>

          <div className="flex flex-col gap-2.5 items-end -mt-2 mr-1">
            <XPWidget xp={xp} level={level} />
          </div>
        </div>

        {/* ==================== SHADOWING MODE ==================== */}
        {mode === "shadowing" &&
        <>
            {/* WeekSelector — pinned top-right */}
            {practiceType === "fluency" && courseWeek.courseType && (() => {
              const sectionMap: Record<string, string> = {
                model_answer: "Model Answer",
                transcoded: "Transcoded Text",
                part_2: "Part 2",
                part_3: "Part 3",
              };
              const sectionLabel = shadowCurriculum.currentSectionId
                ? sectionMap[shadowCurriculum.currentSectionId] ?? shadowCurriculum.currentSectionId
                : null;
              const contextLabel = sectionLabel && shadowCurriculum.currentQuestionId
                ? `Wk ${courseWeek.shadowingWeek} ${sectionLabel} · ${shadowCurriculum.currentQuestionId.toUpperCase()}`
                : undefined;
              return (
                <div className="absolute top-80 left-5 z-50">
                  <WeekSelector
                    selectedWeek={courseWeek.selectedWeek}
                    onWeekChange={courseWeek.setSelectedWeek}
                    contextLabel={contextLabel}
                    courseType={courseWeek.courseType}
                  />
                </div>
              );
            })()}
            <div className="absolute bottom-0 left-0 right-0 pb-4 pt-8 px-24 flex flex-col items-center z-40 bg-gradient-to-t from-black/85 via-black/60 to-transparent">
              <div key={sentenceKey} className="mb-1 w-full text-center relative z-10 animate-fade-in">
                <ProsodyVisualizer data={prosodyData} activeWordIndex={activeWordIndex} />
              </div>
              {/* Question text — directly below karaoke */}
              <div className="w-full max-w-3xl flex flex-col gap-2 mb-2">
                {practiceType === "pronunciation" && curriculum.curriculumTotal > 0 &&
                <div className="w-full h-1 bg-white/[0.06] rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-cyan-500 to-teal-500 rounded-full transition-all duration-700 ease-out"
                style={{ width: `${(curriculum.globalSentenceIndex + 1) / curriculum.curriculumTotal * 100}%` }} />
                  </div>
              }
                <div onClick={handlePlayModel} className="relative h-20 rounded-2xl overflow-hidden transition-all duration-500 group cursor-pointer bg-white/[0.03] backdrop-blur-[40px] border border-white/10 shadow-[0_0_30px_-5px_rgba(34,211,238,0.3)]">
                  <div className="absolute top-2 left-4 flex items-center gap-3 z-10">
                    <span className="text-[9px] font-black uppercase text-cyan-300 tracking-[0.2em] opacity-70">Target</span>
                    <span className="text-[9px] font-black uppercase text-green-300 tracking-[0.2em] opacity-70">Live</span>
                  </div>
                  <div className="absolute inset-0 px-8 py-2">
                    <PronunciationVisualizer
                    isRecording={isRecordingShadow}
                    isPlayingModel={isPlayingModel}
                    activeWordIndex={activeWordIndex}
                    prosodyData={prosodyData}
                    targetProgress={targetProgress}
                    sentenceKey={sentenceKey}
                    onAutoStop={stopShadowRecording}
                    onPitchContour={handlePitchContour}
                    measuredDurationMs={practiceType === "fluency" ? fluencyTimings.getDuration(rawText) : pronunciationTimings.getDuration(rawText)} />

                  </div>
                </div>
              </div>
            </div>

            {/* Right action bar — lower-right to avoid face */}
            {/* Accent toggle — floats above action bar */}
            <div className="absolute top-[18%] right-5 z-50 flex items-center gap-1 bg-black/40 backdrop-blur-2xl border border-white/[0.06] rounded-xl p-1 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.5)]">
              <button onClick={() => setAccent("UK")} className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-all duration-200 ${accent === "UK" ? "bg-white/10 text-white" : "text-white/40 hover:text-white/70"}`}>
                <UKFlag /><span className="text-[9px] font-semibold">UK</span>
              </button>
              <button onClick={() => setAccent("US")} className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-all duration-200 ${accent === "US" ? "bg-white/10 text-white" : "text-white/40 hover:text-white/70"}`}>
                <USFlag /><span className="text-[9px] font-semibold">US</span>
              </button>
            </div>

            {/* Right action bar — vertically centered */}
            <div className="absolute top-1/2 -translate-y-1/2 right-5 flex flex-col items-center gap-1.5 z-50 bg-black/40 backdrop-blur-2xl border border-white/[0.06] rounded-2xl p-2.5 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.5)] animate-slide-in-right">
              <button onClick={handlePlayModel} className={`relative w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-150 group active:scale-95 ${isPlayingModel ? "bg-cyan-500/20 border border-cyan-500/30 text-cyan-300" : "text-white/40 hover:text-white hover:bg-white/[0.06]"}`} title="Hear Teacher Model">
                {isPlayingModel ? <Loader2 className="w-5 h-5 animate-spin" /> : <Headphones className="w-5 h-5 group-hover:scale-110 transition-transform" />}
              </button>
              <MicRecordButton
                isRecording={isRecordingShadow}
                micDenied={micDenied}
                onToggle={handleRecord}
                stream={activeStream}
                size="md"
                shape="rounded"
              />
              <button
                onClick={lastRecordingUrl ? handleReplay : undefined}
                disabled={!lastRecordingUrl}
                className={`relative w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 group ${
                  !lastRecordingUrl ?
                  "text-white/20 opacity-30 cursor-not-allowed" :
                  isPlayingReplay ?
                  "bg-emerald-500/20 border border-emerald-500/30 text-emerald-300" :
                  "text-emerald-400/80 hover:text-emerald-300 hover:bg-emerald-500/10"}`
                }
                title={!lastRecordingUrl ? "No recording yet" : isPlayingReplay ? "Stop Replay" : "Replay Your Recording"}>
                <Play className="w-5 h-5 ml-0.5 group-hover:scale-110 transition-transform" />
              </button>
              {(practiceType === "pronunciation" || practiceType === "fluency") &&
                <button onClick={handleNextSentence} disabled={curriculum.curriculumLoading || shadowCurriculum.loading} className="relative w-12 h-12 rounded-xl flex items-center justify-center text-white/40 hover:text-cyan-300 hover:bg-cyan-500/10 active:scale-90 transition-all duration-300 group disabled:opacity-30" title="Next Sentence">
                  <SkipForward className="w-5 h-5 group-hover:scale-110 transition-transform" />
                </button>
              }
            </div>
          </>
        }

        {/* ==================== SPEAKING MODE ==================== */}
        {mode === "speaking" &&
        <>
            {test.testState.status !== "idle" && test.testState.currentPart &&
          <div className="absolute inset-0 z-[60] flex flex-col justify-end pb-32 items-center animate-fade-in pointer-events-none">
                <div className="flex flex-col items-center pointer-events-auto">
                  <div className="mb-2 text-cyan-400 text-xs font-bold uppercase tracking-[0.2em] bg-black/50 px-3 py-1 rounded-full border border-white/10">
                    {test.partLabel(test.testState.currentPart)}
                  </div>
                  <div className={`font-black drop-shadow-2xl transition-all duration-500 ${test.testState.currentPart === "part2_prep" ? "text-amber-400" : "text-red-500"} ${test.testState.currentPart === "part2_speak" ? "text-4xl" : "text-6xl"}`}>
                    {Math.floor(test.testState.timeLeft / 60)}:{(test.testState.timeLeft % 60).toString().padStart(2, "0")}
                  </div>
                  {test.testState.currentPart === "part2_prep" &&
              <button onClick={test.skipPrep} className="mt-4 px-6 py-2 bg-white/10 border border-white/20 rounded-full text-xs font-bold uppercase tracking-widest hover:bg-white/20 transition-colors">
                      I'm Ready / Start Speaking
                    </button>
              }
                  {test.testState.status === "paused_boundary" &&
              <button onClick={test.advanceTest} className="mt-4 px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl font-bold uppercase tracking-widest text-white shadow-lg hover:scale-105 transition-transform animate-fade-in">
                      {test.testState.currentPartIndex < test.testState.queue.length - 1 ? "Start Next Part" : "Finish Test"}
                    </button>
              }
                </div>
                {test.testState.currentPart?.startsWith("part2") && <CueCard topic={PART2_TOPIC} />}
                {test.testState.currentPart?.startsWith("part2") && <FreehandNotePad />}
              </div>
          }

            {/* Left side panel with week/question info */}
            {speakingQuestions.length > 0 && test.testState.status === "idle" && courseWeek.courseType && (
              <SpeakingLeftPanel
                weekNumber={courseWeek.selectedWeek}
                onWeekChange={courseWeek.setSelectedWeek}
                courseType={courseWeek.courseType}
                sectionLabel={(() => {
                  const sid = speakingQuestions[currentQuestionIndex]?.sectionId;
                  const sectionMap: Record<string, string> = {
                    section_6: "Section 6", model_answer: "Section 6",
                    part_2: "Part 2", part_3: "Part 3",
                  };
                  return sectionMap[sid] ?? sid ?? "Speaking";
                })()}
                questionIndex={currentQuestionIndex}
                totalQuestions={speakingQuestions.length}
                onNextQuestion={() => setCurrentQuestionIndex((i) => (i + 1) % speakingQuestions.length)}
              />
            )}

            {/* Homework Tasks — right side */}
            {practiceMode === "homework" && courseWeek.courseType && test.testState.status === "idle" && (
              <div className="absolute right-4 top-28 z-[320] w-[200px] animate-fade-in">
                <div className="bg-black/50 backdrop-blur-2xl border border-white/[0.08] rounded-2xl p-4 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.5)]">
                  <HomeworkInstructions
                    courseType={courseWeek.courseType}
                    selectedWeek={courseWeek.selectedWeek}
                    shadowingWeek={courseWeek.shadowingWeek}
                    userId={userId}
                  />
                </div>
              </div>
            )}

            {/* Live Transcript Bar — with question text header */}
            <LiveTranscriptBar
              transcript={test.liveTranscript}
              interim={test.liveInterim}
              isRecording={test.isRecording}
              questionText={speakingQuestions[currentQuestionIndex]?.text || undefined}
            />

            {/* Mic button — right side, vertically centered */}
            <div className="absolute right-6 top-1/2 -translate-y-1/2 z-[310] flex items-center justify-center">
              <div className="flex items-center gap-3 p-2 rounded-full bg-black/40 backdrop-blur-xl border border-white/10">
                <MicRecordButton
                  isRecording={test.isRecording}
                  micDenied={micDenied}
                  onToggle={handleRecord}
                  stream={activeStream}
                  size="xl"
                  shape="circle"
                  idleClassName="bg-white/10 border border-white/20 hover:bg-white/20"
                />
                {(test.testState.currentPart === "part1" || test.testState.currentPart === "part3") && test.isRecording &&
                  <button onClick={test.handleNextQuestion} className="p-3 rounded-full bg-cyan-600 hover:bg-cyan-500 text-white transition-colors shadow-lg" title="Next Question">
                    <ChevronRight className="w-6 h-6" />
                  </button>
                }
              </div>
            </div>
          </>
        }

        {/* Mic Permission Denied Overlay */}
        {micDenied && (
          <div className="absolute inset-0 z-[500] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in">
            <div className="bg-black/80 border border-red-500/30 rounded-2xl p-8 max-w-md text-center shadow-[0_0_60px_-10px_rgba(239,68,68,0.3)]">
              <button
                onClick={clearMicDenied}
                className="absolute top-4 right-4 p-2 rounded-full text-white/40 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
                <MicOff className="w-8 h-8 text-red-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Microphone Access Denied</h3>
              <p className="text-white/60 text-sm mb-2">麦克风访问被拒绝</p>
              <p className="text-white/50 text-xs leading-relaxed mb-4">
                Please allow microphone access to use voice recording. Click the 🔒 icon in your browser's address bar and enable microphone permissions.
              </p>
              <p className="text-white/40 text-[10px] leading-relaxed mb-6">
                请在浏览器地址栏点击 🔒 图标，允许麦克风权限后重试。
              </p>
              <button
                onClick={clearMicDenied}
                className="px-6 py-2.5 rounded-xl bg-red-500/20 border border-red-500/30 text-red-300 text-sm font-semibold hover:bg-red-500/30 transition-all"
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {/* Modals */}
        
        {test.showSaveModal && (
          <>
            <SessionFeedbackCard
              transcript={test.messages.map((m) => `${m.role === "student" ? "Student" : "Examiner"}: ${m.text}`).join("\n")}
              partsCompleted={test.completedParts.length}
              onClose={() => {}}
            />
            <SaveSessionModal isPartial={true}
              onSave={() => {addXP(50);test.resetTest();}}
              onDiscard={() => test.resetTest()} />
          </>
        )}
        {test.countdown !== null && <CountdownOverlay count={test.countdown} />}
      </div>
    </PageShell>);

}