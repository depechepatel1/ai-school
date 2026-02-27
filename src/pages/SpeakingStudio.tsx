import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import {
  Mic, Play, Headphones, Ghost, ChevronRight, ArrowLeft, SkipForward,
} from "lucide-react";
import PageShell from "@/components/PageShell";
import { parseProsody, type WordData } from "@/lib/prosody";
import { speak, stopSpeaking, preloadVoices, type Accent } from "@/lib/tts-provider";
import { analyzeContour } from "@/lib/speech-analysis-provider";
import { RealtimePitchTracker } from "@/lib/pitch-detector";
import { FLUENCY_SENTENCES } from "@/types/speaking";

// ── Components ──
import TargetContourCanvas from "@/components/speaking/TargetContourCanvas";
import LiveInputCanvas from "@/components/speaking/LiveInputCanvas";

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
import { useHeadphoneDetect } from "@/hooks/useHeadphoneDetect";
import { PART2_TOPIC } from "@/types/speaking";

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
  
  const [streakTime, setStreakTime] = useState(850);
  const [ghostMode, setGhostMode] = useState(false);
  
  const [isRecordingShadow, setIsRecordingShadow] = useState(false);
  const [modelContour, setModelContour] = useState<number[]>([]);

  const chatScrollRef = useRef<HTMLDivElement>(null);
  const modelMicRef = useRef<{ ctx: AudioContext; stream: MediaStream; tracker: RealtimePitchTracker } | null>(null);
  const accentLower = accent.toLowerCase() as Accent;

  // ── Hooks ──
  const { xp, level, addXP } = useXP();
  const { lastRecordingUrl, isPlayingReplay, startMediaRecorder, stopMediaRecorder, handleReplay, clearRecording } = useAudioCapture();
  const curriculum = useCurriculum(userId, practiceType);
  const test = useSpeakingTest({ accent: accentLower });
  const { hasHeadphones } = useHeadphoneDetect();

  // Sync prosody
  useEffect(() => { setProsodyData(parseProsody(rawText)); }, [rawText]);
  useEffect(() => { preloadVoices(); }, []);

  // Sync curriculum sentence
  useEffect(() => {
    if (curriculum.currentSentence && practiceType === "pronunciation") {
      setRawText(curriculum.currentSentence);
    }
  }, [curriculum.currentSentence, practiceType]);

  // Auto-scroll chat
  useEffect(() => { chatScrollRef.current?.scrollIntoView({ behavior: "smooth" }); }, [test.messages, test.isAiThinking]);

  // ── Shadowing handlers ──
  const handleGenerate = (type: "pronunciation" | "fluency") => {
    if (type === "pronunciation") {
      curriculum.loadCurriculumPage(Math.floor(Math.random() * 100) * 5);
    } else {
      setRawText(FLUENCY_SENTENCES[Math.floor(Math.random() * FLUENCY_SENTENCES.length)]);
    }
    clearRecording();
    setModelContour([]);
  };

  const handleNextSentence = useCallback(async () => {
    clearRecording();
    setModelContour([]);
    const sentence = await curriculum.handleNextSentence();
    if (sentence) setRawText(sentence);
  }, [curriculum, clearRecording]);

  const handlePitchContour = useCallback((contour: number[]) => {
    if (mode === "shadowing" && contour.length > 0) {
      const result = analyzeContour(contour, rawText);
      curriculum.saveProgress(result.overallScore);
    }
  }, [mode, rawText, curriculum]);

  const cleanupModelMic = () => {
    if (modelMicRef.current) {
      const contour = modelMicRef.current.tracker.stop();
      if (contour.length > 0) setModelContour(contour);
      modelMicRef.current.stream.getTracks().forEach((t) => t.stop());
      modelMicRef.current.ctx.close().catch(() => {});
      modelMicRef.current = null;
    }
  };

  const handlePlayModel = async () => {
    if (isPlayingModel) {
      test.ttsHandleRef.current?.stop();
      setIsPlayingModel(false);
      setActiveWordIndex(-1);
      cleanupModelMic();
      return;
    }

    // Start mic capture for model contour if no headphones
    let micReady = false;
    if (!hasHeadphones) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const aCtx = new AudioContext();
        const analyser = aCtx.createAnalyser();
        analyser.fftSize = 2048;
        analyser.smoothingTimeConstant = 0.7;
        const src = aCtx.createMediaStreamSource(stream);
        src.connect(analyser);
        const tracker = new RealtimePitchTracker(analyser, aCtx.sampleRate);
        modelMicRef.current = { ctx: aCtx, stream, tracker };
        micReady = true;
      } catch { /* mic denied */ }
    }

    test.ttsHandleRef.current = speak(rawText, accentLower, {
      rate: 0.8, pitch: 1.1,
      onBoundary: (charIndex) => {
        const idx = prosodyData.findIndex((w) => Math.abs(w.startChar - charIndex) < 4);
        if (idx !== -1) setActiveWordIndex(idx);
      },
      onStart: () => {
        setIsPlayingModel(true);
        setActiveWordIndex(0);
        if (micReady && modelMicRef.current) modelMicRef.current.tracker.start();
      },
      onEnd: () => {
        setIsPlayingModel(false);
        setActiveWordIndex(-1);
        cleanupModelMic();
      },
    });
    addXP(5);
  };

  const handleRecord = async () => {
    if (mode === "speaking") {
      if (test.testState.status !== "idle") { test.stopTestManual(); stopMediaRecorder(); return; }
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
      setIsRecordingShadow(false);
      if (ghostMode) stopSpeaking();
      stopMediaRecorder();
      addXP(20);
    } else {
      setIsRecordingShadow(true);
      clearRecording();
      clearRecording();
      await startMediaRecorder();
      if (ghostMode) {
        test.ttsHandleRef.current = speak(rawText, accentLower, {
          rate: 0.8, pitch: 1.1,
          onBoundary: (charIndex) => {
            const idx = prosodyData.findIndex((w) => Math.abs(w.startChar - charIndex) < 4);
            if (idx !== -1) setActiveWordIndex(idx);
          },
          onEnd: () => setActiveWordIndex(-1),
        });
      }
    }
  };

  return (
    <PageShell
      fullWidth
      loopVideos={[
        "https://res.cloudinary.com/daujjfaqg/video/upload/2026-02-26T17-16-49_add_a_slight_smiling_ndaiwy.mp4",
        "https://res.cloudinary.com/daujjfaqg/video/upload/20_Second_Teacher_Loop_ucqth6.mp4",
        "https://res.cloudinary.com/daujjfaqg/video/upload/2026-02-26T10-21-39_add_head_nodding_i7rp3g.mp4",
        "https://res.cloudinary.com/daujjfaqg/video/upload/Cloudinary_Video_Player_Embed_v0.6.0_-_-_2026-02-26_16-08-58_rsq9sj.mp4",
        "https://res.cloudinary.com/daujjfaqg/video/upload/2026-02-26T10-21-39_add_head_nodding_hrufnm.mp4",
      ]}
    >
      <div className="relative w-full h-full text-white font-outfit select-none animate-fade-in-up">
        {/* Back button */}
        <button onClick={() => navigate("/student")} className="absolute top-4 left-4 z-[300] flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-black/50 backdrop-blur-2xl border border-white/10 text-white/60 hover:text-white hover:bg-black/70 hover:border-white/20 transition-all text-[11px] font-semibold tracking-wide group">
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" /> Back
        </button>

        {/* Top Bar */}
        <div className="absolute top-6 left-0 right-0 px-6 z-50 flex justify-between items-start">
          <div className="flex flex-col gap-2.5 ml-16">
            <StreakWidget time={streakTime} />
            {mode === "speaking" && (
              <PersonaSelector persona={test.persona} setPersona={test.handlePersonaChange} setShowTestConfig={test.setShowTestConfig} />
            )}
            {mode === "shadowing" && (
              <>
                <div className="flex items-center gap-2 bg-black/50 backdrop-blur-2xl border border-white/[0.08] rounded-2xl p-1.5">
                  <button onClick={() => setAccent("UK")} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all ${accent === "UK" ? "bg-white/[0.08] border border-white/[0.06]" : "hover:bg-white/5"}`}>
                    <UKFlag /><span className="text-[10px] font-bold tracking-wider text-white/70">UK</span>
                  </button>
                  <button onClick={() => setAccent("US")} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all ${accent === "US" ? "bg-white/[0.08] border border-white/[0.06]" : "hover:bg-white/5"}`}>
                    <USFlag /><span className="text-[10px] font-bold tracking-wider text-white/70">US</span>
                  </button>
                </div>
                {curriculum.currentTopic && (
                  <div className="bg-black/50 backdrop-blur-2xl border border-white/[0.08] rounded-2xl px-4 py-2">
                    <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/40">Topic</span>
                    <div className="text-sm font-semibold text-white/90 mt-0.5">{curriculum.currentTopic}</div>
                  </div>
                )}
                <div className="flex gap-1 bg-black/50 backdrop-blur-2xl border border-white/[0.08] rounded-2xl p-1">
                  {(["pronunciation", "fluency"] as const).map((t) => (
                    <button key={t} onClick={() => { setPracticeType(t); handleGenerate(t); }}
                      className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all duration-300 ${practiceType === t ? "bg-white/[0.08] text-white border border-white/[0.06]" : "text-white/35 hover:text-white/60"}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="flex flex-col gap-2.5 items-end">
            <XPWidget xp={xp} level={level} />
            {test.testState.status === "idle" && (
              <div className="flex p-1 gap-1 rounded-2xl bg-black/50 backdrop-blur-2xl border border-white/[0.08] shadow-[0_4px_24px_-4px_rgba(0,0,0,0.5)]">
                <button onClick={() => setMode("shadowing")}
                  className={`px-5 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all duration-300 ${mode === "shadowing" ? "bg-cyan-500/90 text-black shadow-[0_2px_12px_rgba(6,182,212,0.4)]" : "text-white/35 hover:text-white/60"}`}>
                  Shadowing
                </button>
                <button onClick={() => { setMode("speaking"); test.setShowTestConfig(true); }}
                  className={`px-5 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all duration-300 ${mode === "speaking" ? "bg-purple-500/90 text-white shadow-[0_2px_12px_rgba(168,85,247,0.4)]" : "text-white/35 hover:text-white/60"}`}>
                  Speaking
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ==================== SHADOWING MODE ==================== */}
        {mode === "shadowing" && (
          <>
            <div className="absolute bottom-0 left-0 right-0 pb-6 pt-8 px-24 flex flex-col items-center z-40 bg-gradient-to-t from-black/85 via-black/60 to-transparent">
              <div className="mb-1 w-full text-center relative z-10">
                <ProsodyVisualizer data={prosodyData} activeWordIndex={activeWordIndex} />
              </div>
              <div className="w-full max-w-3xl flex flex-col gap-2 mb-2">
                {practiceType === "pronunciation" && curriculum.curriculumTotal > 0 && (
                  <div className="w-full h-1 bg-white/[0.06] rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-700 ease-out"
                      style={{ width: `${((curriculum.globalSentenceIndex + 1) / curriculum.curriculumTotal) * 100}%` }} />
                  </div>
                )}
                <div onClick={handlePlayModel} className="relative h-20 rounded-2xl overflow-hidden transition-all duration-500 group cursor-pointer bg-white/[0.03] backdrop-blur-[40px] border border-white/10 shadow-[0_0_30px_-5px_rgba(34,211,238,0.3)]">
                  <div className="absolute top-2 left-4 flex items-center gap-3 z-10">
                    <span className="text-[9px] font-black uppercase text-cyan-300 tracking-[0.2em] opacity-70">Target</span>
                    <span className="text-[9px] font-black uppercase text-green-300 tracking-[0.2em] opacity-70">Live</span>
                  </div>
                  <div className="absolute top-2 right-4 z-10 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-black/40 border border-white/[0.06]">
                    {hasHeadphones ? (
                      <>
                        <Headphones className="w-3 h-3 text-amber-400/80" />
                        <span className="text-[8px] font-bold uppercase tracking-widest text-amber-400/70">Auto Generate</span>
                      </>
                    ) : (
                      <>
                        <Mic className="w-3 h-3 text-cyan-400/80" />
                        <span className="text-[8px] font-bold uppercase tracking-widest text-cyan-400/70">Mic Capture</span>
                      </>
                    )}
                  </div>
                  <div className="absolute inset-0 px-8 py-2">
                    <TargetContourCanvas data={prosodyData} isPlaying={isPlayingModel} activeWordIndex={activeWordIndex} contour={modelContour} />
                  </div>
                  <div className="absolute inset-0 px-8 py-2">
                    <LiveInputCanvas isRecording={isRecordingShadow} prosodyData={prosodyData} onAutoStop={handleRecord} onPitchContour={handlePitchContour} />
                  </div>
                </div>
              </div>
            </div>

            {/* Right action bar */}
            <div className="absolute top-1/2 -translate-y-1/2 right-5 flex flex-col items-center gap-3 z-50 bg-black/50 backdrop-blur-2xl border border-white/[0.08] rounded-3xl p-3.5 shadow-[0_8px_32px_-4px_rgba(0,0,0,0.6)]">
              <button onClick={handlePlayModel} className={`relative w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300 group ${isPlayingModel ? "bg-cyan-500/20 border border-cyan-500/30 text-cyan-300" : "text-white/40 hover:text-white hover:bg-white/[0.06]"}`} title="Hear Teacher Model">
                <Headphones className="w-7 h-7 group-hover:scale-110 transition-transform" />
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
                  !lastRecordingUrl
                    ? "text-white/20 opacity-30 cursor-not-allowed"
                    : isPlayingReplay
                      ? "bg-emerald-500/20 border border-emerald-500/30 text-emerald-300"
                      : "text-emerald-400/80 hover:text-emerald-300 hover:bg-emerald-500/10"
                }`}
                title={!lastRecordingUrl ? "No recording yet" : isPlayingReplay ? "Stop Replay" : "Replay Your Recording"}
              >
                <Play className="w-7 h-7 ml-0.5 group-hover:scale-110 transition-transform" />
              </button>
              <button onClick={() => setGhostMode(!ghostMode)} className={`relative w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300 group ${ghostMode ? "bg-purple-500/15 border border-purple-500/25 text-purple-300" : "text-white/30 hover:text-white/60 hover:bg-white/[0.06]"}`} title="Ghost Mode">
                <Ghost className="w-7 h-7 group-hover:scale-110 transition-transform" />
              </button>
              <div className="w-8 h-px bg-white/[0.06]" />
              {practiceType === "pronunciation" && (
                <button onClick={handleNextSentence} disabled={curriculum.curriculumLoading} className="relative w-16 h-16 rounded-2xl flex items-center justify-center text-white/40 hover:text-cyan-300 hover:bg-cyan-500/10 transition-all duration-300 group disabled:opacity-30" title="Next Sentence">
                  <SkipForward className="w-7 h-7 group-hover:scale-110 transition-transform" />
                </button>
              )}
            </div>
          </>
        )}

        {/* ==================== SPEAKING MODE ==================== */}
        {mode === "speaking" && (
          <>
            {test.testState.status !== "idle" && test.testState.currentPart && (
              <div className="absolute inset-0 z-[60] flex flex-col justify-end pb-32 items-center animate-fade-in pointer-events-none">
                <div className="flex flex-col items-center pointer-events-auto">
                  <div className="mb-2 text-cyan-400 text-xs font-bold uppercase tracking-[0.2em] bg-black/50 px-3 py-1 rounded-full border border-white/10">
                    {test.partLabel(test.testState.currentPart)}
                  </div>
                  <div className={`font-black drop-shadow-2xl transition-all duration-500 ${test.testState.currentPart === "part2_prep" ? "text-amber-400" : "text-red-500"} ${test.testState.currentPart === "part2_speak" ? "text-4xl" : "text-6xl"}`}>
                    {Math.floor(test.testState.timeLeft / 60)}:{(test.testState.timeLeft % 60).toString().padStart(2, "0")}
                  </div>
                  {test.testState.currentPart === "part2_prep" && (
                    <button onClick={test.skipPrep} className="mt-4 px-6 py-2 bg-white/10 border border-white/20 rounded-full text-xs font-bold uppercase tracking-widest hover:bg-white/20 transition-colors">
                      I'm Ready / Start Speaking
                    </button>
                  )}
                  {test.testState.status === "paused_boundary" && (
                    <button onClick={test.advanceTest} className="mt-4 px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl font-bold uppercase tracking-widest text-white shadow-lg hover:scale-105 transition-transform animate-fade-in">
                      {test.testState.currentPartIndex < test.testState.queue.length - 1 ? "Start Next Part" : "Finish Test"}
                    </button>
                  )}
                </div>
                {test.testState.currentPart?.startsWith("part2") && <CueCard topic={PART2_TOPIC} />}
                {test.testState.currentPart?.startsWith("part2") && <FreehandNotePad />}
              </div>
            )}

            {/* Chat panels */}
            <div className="absolute bottom-28 left-6 w-[260px] max-h-[200px] bg-white/[0.03] backdrop-blur-[40px] border border-white/10 rounded-2xl overflow-hidden z-[100] shadow-[0_0_30px_-5px_rgba(74,222,128,0.3)]">
              <div className="p-3 border-b border-white/10 bg-white/5 flex items-center gap-2">
                <Mic className="w-4 h-4 text-green-300" />
                <span className="text-xs font-bold uppercase tracking-widest text-white/80">{test.persona}</span>
              </div>
              <div className="overflow-y-auto p-3 text-sm space-y-2 max-h-[140px] scrollbar-hide">
                {test.messages.filter((m) => m.role === "teacher").map((m, i) => (
                  <div key={i} className={`p-3 rounded-xl rounded-tl-none mb-1 border ${test.getPersonaBubbleStyle(test.persona)}`}>{m.text}</div>
                ))}
                {test.isAiThinking && (
                  <div className="flex gap-1 p-2">
                    <div className="w-2 h-2 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: "0s" }} />
                    <div className="w-2 h-2 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: "0.2s" }} />
                    <div className="w-2 h-2 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: "0.4s" }} />
                  </div>
                )}
                <div ref={chatScrollRef} />
              </div>
            </div>

            <div className="absolute bottom-28 right-6 w-[260px] max-h-[200px] bg-white/[0.03] backdrop-blur-[40px] border border-white/10 rounded-2xl overflow-hidden z-[100] shadow-[0_0_30px_-5px_rgba(168,85,247,0.3)]">
              <div className="p-3 border-b border-white/10 bg-white/5 flex items-center gap-2">
                <Mic className="w-4 h-4 text-purple-300" />
                <span className="text-xs font-bold uppercase tracking-widest text-white/80">You</span>
              </div>
              <div className="overflow-y-auto p-3 text-sm space-y-2 max-h-[140px] scrollbar-hide">
                {test.messages.filter((m) => m.role === "student").map((m, i) => (
                  <div key={i} className="bg-purple-500/20 p-3 rounded-xl rounded-tr-none mb-1 border border-purple-500/20 text-right text-purple-100">{m.text}</div>
                ))}
              </div>
            </div>

            {/* Bottom action bar */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[310] flex items-center gap-4 p-2 rounded-full bg-black/40 backdrop-blur-xl border border-white/10">
              <button onClick={handleRecord}
                className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 ${test.isRecording ? "bg-red-500 shadow-[0_0_40px_rgba(239,68,68,0.6)] scale-110" : "bg-white/10 border border-white/20 hover:bg-white/20"}`}>
                {test.isRecording ? <div className="w-6 h-6 bg-white rounded animate-pulse" /> : <Mic className="w-10 h-10 text-white" />}
              </button>
              {(test.testState.currentPart === "part1" || test.testState.currentPart === "part3") && test.isRecording && (
                <button onClick={test.handleNextQuestion} className="p-3 rounded-full bg-cyan-600 hover:bg-cyan-500 text-white transition-colors shadow-lg" title="Next Question">
                  <ChevronRight className="w-6 h-6" />
                </button>
              )}
            </div>
          </>
        )}

        {/* Modals */}
        {test.showTestConfig && <ExaminerConfig onClose={() => test.setShowTestConfig(false)} onStartTest={test.initiateCountdown} />}
        {test.showSaveModal && (
          <SaveSessionModal isPartial={true}
            onSave={() => { addXP(50); test.resetTest(); }}
            onDiscard={() => test.resetTest()} />
        )}
        {test.countdown !== null && <CountdownOverlay count={test.countdown} />}
      </div>
    </PageShell>
  );
}
