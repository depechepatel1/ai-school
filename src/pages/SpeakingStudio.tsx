import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import {
  Mic, Play, Headphones, Ghost, ChevronRight, ArrowLeft, SkipForward, Loader2 } from
"lucide-react";
import PageShell, { VIDEO_1_STACK } from "@/components/PageShell";
import { parseProsody, type WordData } from "@/lib/prosody";
import { speak, stopSpeaking, preloadVoices, preloadAccent, type Accent } from "@/lib/tts-provider";
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
import { UKFlag, USFlag } from "@/components/speaking/FlagIcons";

// ── Hooks ──
import { useXP } from "@/hooks/useXP";
import { useAudioCapture } from "@/hooks/useAudioCapture";
import { useCurriculum } from "@/hooks/useCurriculum";
import { useSpeakingTest } from "@/hooks/useSpeakingTest";
import { useCourseWeek } from "@/hooks/useCourseWeek";
import { useShadowingCurriculum } from "@/hooks/useShadowingCurriculum";
import { usePracticeTimer, type ActivityType } from "@/hooks/usePracticeTimer";
import { PART2_TOPIC } from "@/types/speaking";
import WeekSelector from "@/components/speaking/WeekSelector";
import { getSpeakingQuestions } from "@/services/curriculum-storage";

export default function SpeakingStudio() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const userId = user?.id ?? null;

  // ── Local UI state ──
  const [mode, setMode] = useState<"shadowing" | "speaking">("shadowing");
  const [accent, setAccent] = useState<"UK" | "US">("UK");
  const [practiceType, setPracticeType] = useState<"pronunciation" | "fluency">("pronunciation");
  const [rawText, setRawText] = useState("");
  const [prosodyData, setProsodyData] = useState<WordData[]>([]);
  const [isPlayingModel, setIsPlayingModel] = useState(false);
  const [activeWordIndex, setActiveWordIndex] = useState(-1);
  const [targetProgress, setTargetProgress] = useState(0);
  const [sentenceKey, setSentenceKey] = useState(0);

  const [ghostMode, setGhostMode] = useState(false);

  const [isRecordingShadow, setIsRecordingShadow] = useState(false);

  const chatScrollRef = useRef<HTMLDivElement>(null);
  const accentLower = accent.toLowerCase() as Accent;

  // ── Hooks ──
  const { xp, level, addXP } = useXP();
  const { lastRecordingUrl, isPlayingReplay, startMediaRecorder, stopMediaRecorder, handleReplay, clearRecording } = useAudioCapture();
  const curriculum = useCurriculum(userId, "pronunciation");
  const test = useSpeakingTest({ accent: accentLower });
  const courseWeek = useCourseWeek(userId);
  const shadowCurriculum = useShadowingCurriculum(courseWeek.courseType, courseWeek.shadowingWeek);
  const [speakingQuestions, setSpeakingQuestions] = useState<string[]>([]);
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
    isAudioActive
  });

  // Sync prosody + reset visualizer on new sentence
  useEffect(() => {
    setProsodyData(parseProsody(rawText));
    setTargetProgress(0);
    setActiveWordIndex(-1);
    setSentenceKey((k) => k + 1);
  }, [rawText]);
  useEffect(() => {preloadVoices();preloadAccent(accentLower);}, []);
  useEffect(() => {preloadAccent(accentLower);}, [accentLower]);

  // Sync curriculum sentence (pronunciation mode)
  useEffect(() => {
    if (curriculum.currentSentence && practiceType === "pronunciation") {
      setRawText(curriculum.currentSentence);
    }
  }, [curriculum.currentSentence, practiceType]);

  // Sync shadowing curriculum chunk (fluency mode)
  useEffect(() => {
    if (practiceType === "fluency" && shadowCurriculum.currentChunk) {
      setRawText(shadowCurriculum.currentChunk.text);
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
    // Fire TTS immediately if ghost mode
    if (ghostMode) {
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
          setActiveWordIndex(-1);
          setTargetProgress(1);
        }
      });
    }
    await startMediaRecorder();
  };

  const stopShadowRecording = useCallback(() => {
    setIsRecordingShadow(false);
    if (ghostMode) stopSpeaking();
    stopMediaRecorder();
    addXP(20);
  }, [ghostMode, stopMediaRecorder, addXP]);

  return (
    <PageShell
      fullWidth
      loopVideos={VIDEO_1_STACK}>

      <div className="relative w-full h-full text-white font-outfit select-none animate-fade-in-up">
        {/* Back button */}
        <button onClick={() => navigate("/student")} className="absolute top-4 left-4 z-[300] flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-black/50 backdrop-blur-2xl border border-white/10 text-white/60 hover:text-white hover:bg-black/70 hover:border-white/20 transition-all text-[11px] font-semibold tracking-wide group">
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" /> Back
        </button>

        {/* Top Bar */}
        <div className="absolute top-16 left-0 right-0 px-3 z-50 flex justify-between items-start">
          <div className="gap-2.5 ml-2 flex flex-col animate-fade-in">
            <div style={{ animationDelay: '0s' }} className="animate-fade-in">
              <StreakWidget
                displaySeconds={practiceTimer.displaySeconds}
                isCountdown={practiceTimer.isCountdown}
                isComplete={practiceTimer.isComplete}
                isRunning={practiceTimer.isRunning}
                isOvertime={practiceTimer.isOvertime}
                onPause={practiceTimer.pause}
                onResume={practiceTimer.resume} />
            </div>

            {mode === "speaking" &&
            <PersonaSelector persona={test.persona} setPersona={test.handlePersonaChange} setShowTestConfig={test.setShowTestConfig} />
            }
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

          <div className="flex flex-col gap-2.5 items-end mt-1 mr-1">
            <XPWidget xp={xp} level={level} />
            {test.testState.status === "idle" &&
            <div className="flex p-1 gap-1 rounded-2xl bg-black/50 backdrop-blur-2xl border border-white/[0.08] shadow-[0_4px_24px_-4px_rgba(0,0,0,0.5)]">
                <button onClick={() => setMode("shadowing")}
              className={`px-5 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all duration-300 ${mode === "shadowing" ? "bg-cyan-500/90 text-black shadow-[0_2px_12px_rgba(6,182,212,0.4)]" : "text-white/35 hover:text-white/60"}`}>
                  Shadowing
                </button>
                <button onClick={() => {setMode("speaking");test.setShowTestConfig(true);}}
              className={`px-5 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all duration-300 ${mode === "speaking" ? "bg-purple-500/90 text-white shadow-[0_2px_12px_rgba(168,85,247,0.4)]" : "text-white/35 hover:text-white/60"}`}>
                  Speaking
                </button>
              </div>
            }
          </div>
        </div>

        {/* ==================== SHADOWING MODE ==================== */}
        {mode === "shadowing" &&
        <>
            <div className="absolute bottom-0 left-0 right-0 pb-4 pt-8 px-24 flex flex-col items-center z-40 bg-gradient-to-t from-black/85 via-black/60 to-transparent">
              {practiceType === "fluency" && (
                <div className="flex items-center gap-3 mb-2">
                  {shadowCurriculum.totalChunks > 0 && (
                    <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-white/35">
                      Chunk {shadowCurriculum.currentIndex + 1}/{shadowCurriculum.totalChunks}
                    </span>
                  )}
                  {courseWeek.courseType && (
                    <WeekSelector selectedWeek={courseWeek.selectedWeek} onWeekChange={courseWeek.setSelectedWeek} />
                  )}
                </div>
              )}
              {practiceType === "fluency" && shadowCurriculum.currentQuestionText && (
                <p className="text-[11px] italic text-white/40 max-w-lg mx-auto mb-1 text-center line-clamp-2 leading-relaxed">
                  Q: {shadowCurriculum.currentQuestionText}
                </p>
              )}
              <div key={sentenceKey} className="mb-1 w-full text-center relative z-10 animate-fade-in">
                <ProsodyVisualizer data={prosodyData} activeWordIndex={activeWordIndex} />
              </div>
              <div className="w-full max-w-3xl flex flex-col gap-2 mb-2">
                {practiceType === "pronunciation" && curriculum.curriculumTotal > 0 &&
              <div className="w-full h-1 bg-white/[0.06] rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-700 ease-out"
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
                    onPitchContour={handlePitchContour} />

                  </div>
                </div>
              </div>
            </div>

            {/* Right action bar — lower-right to avoid face */}
            <div className="absolute bottom-32 right-5 flex flex-col items-center gap-3 z-50 bg-black/40 backdrop-blur-2xl border border-white/[0.06] rounded-2xl p-3.5 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.5)] animate-slide-in-right">
              {/* Accent toggle */}
              <div className="flex items-center gap-1 bg-black/30 rounded-xl p-0.5">
                <button onClick={() => setAccent("UK")} className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-all duration-200 ${accent === "UK" ? "bg-white/10 text-white" : "text-white/40 hover:text-white/70"}`}>
                  <UKFlag /><span className="text-[9px] font-semibold">UK</span>
                </button>
                <button onClick={() => setAccent("US")} className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-all duration-200 ${accent === "US" ? "bg-white/10 text-white" : "text-white/40 hover:text-white/70"}`}>
                  <USFlag /><span className="text-[9px] font-semibold">US</span>
                </button>
              </div>
              <div className="w-8 h-px bg-white/[0.06]" />
              <button onClick={handlePlayModel} className={`relative w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-150 group active:scale-95 ${isPlayingModel ? "bg-cyan-500/20 border border-cyan-500/30 text-cyan-300" : "text-white/40 hover:text-white hover:bg-white/[0.06]"}`} title="Hear Teacher Model">
                {isPlayingModel ? <Loader2 className="w-7 h-7 animate-spin" /> : <Headphones className="w-7 h-7 group-hover:scale-110 transition-transform" />}
              </button>
              <div className="w-8 h-px bg-white/[0.06]" />
              <button onClick={handleRecord} className={`relative w-[4.5rem] h-[4.5rem] rounded-2xl flex items-center justify-center transition-all duration-300 ${isRecordingShadow ? "bg-red-500 shadow-[0_0_24px_rgba(239,68,68,0.4)] scale-105" : "bg-white/[0.06] border border-white/[0.08] hover:bg-white/[0.1]"}`} title={isRecordingShadow ? "Stop" : "Record"}>
                {isRecordingShadow ? <div className="w-7 h-7 bg-white rounded-sm animate-pulse" /> : <Mic className="w-9 h-9 text-white/80" />}
              </button>
              <div className="w-8 h-px bg-white/[0.06]" />
              <button
              onClick={lastRecordingUrl ? handleReplay : undefined}
              disabled={!lastRecordingUrl}
              className={`relative w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300 group ${
              !lastRecordingUrl ?
              "text-white/20 opacity-30 cursor-not-allowed" :
              isPlayingReplay ?
              "bg-emerald-500/20 border border-emerald-500/30 text-emerald-300" :
              "text-emerald-400/80 hover:text-emerald-300 hover:bg-emerald-500/10"}`
              }
              title={!lastRecordingUrl ? "No recording yet" : isPlayingReplay ? "Stop Replay" : "Replay Your Recording"}>

                <Play className="w-7 h-7 ml-0.5 group-hover:scale-110 transition-transform" />
              </button>
              <button onClick={() => setGhostMode(!ghostMode)} className={`relative w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300 group ${ghostMode ? "bg-purple-500/15 border border-purple-500/25 text-purple-300" : "text-white/30 hover:text-white/60 hover:bg-white/[0.06]"}`} title="Ghost Mode">
                <Ghost className="w-7 h-7 group-hover:scale-110 transition-transform" />
              </button>
              <div className="w-8 h-px bg-white/[0.06]" />
              {(practiceType === "pronunciation" || practiceType === "fluency") &&
            <button onClick={handleNextSentence} disabled={curriculum.curriculumLoading || shadowCurriculum.loading} className="relative w-16 h-16 rounded-2xl flex items-center justify-center text-white/40 hover:text-cyan-300 hover:bg-cyan-500/10 active:scale-90 transition-all duration-300 group disabled:opacity-30" title="Next Sentence">
                  <SkipForward className="w-7 h-7 group-hover:scale-110 transition-transform" />
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

            {/* Speaking questions from curriculum */}
            {speakingQuestions.length > 0 && test.testState.status === "idle" &&
          <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[80] max-w-lg w-full px-4">
                <div className="bg-black/60 backdrop-blur-2xl border border-white/[0.08] rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/40">
                      Week {courseWeek.selectedWeek} — Question {currentQuestionIndex + 1}/{speakingQuestions.length}
                    </span>
                    {courseWeek.courseType &&
                <WeekSelector selectedWeek={courseWeek.selectedWeek} onWeekChange={courseWeek.setSelectedWeek} />
                }
                  </div>
                  <p className="text-sm text-white/90 leading-relaxed">{speakingQuestions[currentQuestionIndex]}</p>
                  {speakingQuestions.length > 1 &&
              <button
                onClick={() => setCurrentQuestionIndex((i) => (i + 1) % speakingQuestions.length)}
                className="mt-3 px-4 py-1.5 rounded-lg bg-white/[0.06] border border-white/[0.08] text-[10px] font-bold uppercase tracking-wider text-white/60 hover:text-white hover:bg-white/10 transition-all">

                      Next Question
                    </button>
              }
                </div>
              </div>
          }

            {/* Chat panels */}
            <div className="absolute bottom-28 left-6 w-[260px] max-h-[200px] bg-white/[0.03] backdrop-blur-[40px] border border-white/10 rounded-2xl overflow-hidden z-[100] shadow-[0_0_30px_-5px_rgba(74,222,128,0.3)]">
              <div className="p-3 border-b border-white/10 bg-white/5 flex items-center gap-2">
                <Mic className="w-4 h-4 text-green-300" />
                <span className="text-xs font-bold uppercase tracking-widest text-white/80">{test.persona}</span>
              </div>
              <div className="overflow-y-auto p-3 text-sm space-y-2 max-h-[140px] scrollbar-hide">
                {test.messages.filter((m) => m.role === "teacher").map((m, i) =>
              <div key={i} className={`p-3 rounded-xl rounded-tl-none mb-1 border ${test.getPersonaBubbleStyle(test.persona)}`}>{m.text}</div>
              )}
                {test.isAiThinking &&
              <div className="flex gap-1 p-2">
                    <div className="w-2 h-2 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: "0s" }} />
                    <div className="w-2 h-2 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: "0.2s" }} />
                    <div className="w-2 h-2 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: "0.4s" }} />
                  </div>
              }
                <div ref={chatScrollRef} />
              </div>
            </div>

            <div className="absolute bottom-28 right-6 w-[260px] max-h-[200px] bg-white/[0.03] backdrop-blur-[40px] border border-white/10 rounded-2xl overflow-hidden z-[100] shadow-[0_0_30px_-5px_rgba(168,85,247,0.3)]">
              <div className="p-3 border-b border-white/10 bg-white/5 flex items-center gap-2">
                <Mic className="w-4 h-4 text-purple-300" />
                <span className="text-xs font-bold uppercase tracking-widest text-white/80">You</span>
              </div>
              <div className="overflow-y-auto p-3 text-sm space-y-2 max-h-[140px] scrollbar-hide">
                {test.messages.filter((m) => m.role === "student").map((m, i) =>
              <div key={i} className="bg-purple-500/20 p-3 rounded-xl rounded-tr-none mb-1 border border-purple-500/20 text-right text-purple-100">{m.text}</div>
              )}
              </div>
            </div>

            {/* Bottom action bar */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[310] flex items-center gap-4 p-2 rounded-full bg-black/40 backdrop-blur-xl border border-white/10">
              <button onClick={handleRecord}
            className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 ${test.isRecording ? "bg-red-500 shadow-[0_0_40px_rgba(239,68,68,0.6)] scale-110" : "bg-white/10 border border-white/20 hover:bg-white/20"}`}>
                {test.isRecording ? <div className="w-6 h-6 bg-white rounded animate-pulse" /> : <Mic className="w-10 h-10 text-white" />}
              </button>
              {(test.testState.currentPart === "part1" || test.testState.currentPart === "part3") && test.isRecording &&
            <button onClick={test.handleNextQuestion} className="p-3 rounded-full bg-cyan-600 hover:bg-cyan-500 text-white transition-colors shadow-lg" title="Next Question">
                  <ChevronRight className="w-6 h-6" />
                </button>
            }
            </div>
          </>
        }

        {/* Modals */}
        {mode === "speaking" && test.showTestConfig && <ExaminerConfig onClose={() => test.setShowTestConfig(false)} onStartTest={test.initiateCountdown} />}
        {test.showSaveModal &&
        <SaveSessionModal isPartial={true}
        onSave={() => {addXP(50);test.resetTest();}}
        onDiscard={() => test.resetTest()} />
        }
        {test.countdown !== null && <CountdownOverlay count={test.countdown} />}
      </div>
    </PageShell>);

}