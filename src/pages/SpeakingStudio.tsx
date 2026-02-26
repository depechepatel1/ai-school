import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import {
  Mic, Play, Headphones, Ghost, MoveHorizontal, Award, Folder, Trash,
  Send, X, Clock, Star, Users, Book, Smile, ChevronRight, Minus, Maximize,
  Flame, PenTool, Keyboard, Save, ArrowLeft, Check, Edit, SkipForward
} from "lucide-react";
import PageShell from "@/components/PageShell";
import { parseProsody, type WordData } from "@/lib/prosody";
import { chat, type ChatMessage } from "@/services/ai";
import { speak, stopSpeaking, type Accent, type TTSHandle } from "@/lib/tts-provider";
import { startListening, type STTHandle } from "@/lib/stt-provider";
import { fetchCurriculumPage, fetchNextSentence, fetchCurriculumProgress, saveCurriculumProgress, fetchCurriculumCount } from "@/services/db";
import { RealtimePitchTracker } from "@/lib/pitch-detector";
import { analyzeContour } from "@/lib/speech-analysis-provider";

// ============================================================
// CONSTANTS
// ============================================================

const FALLBACK_SENTENCES = [
  "The quick brown fox jumps over the lazy dog",
  "She sells seashells by the seashore",
];

const FLUENCY_SENTENCES = [
  "Photography captures moments in time that we can cherish forever.",
  "I believe that environmental protection is crucial for our future generations.",
  "Many people prefer working from home because it saves commuting time.",
  "Technology has revolutionized the way we communicate with each other.",
  "Learning a new language opens up doors to different cultures and perspectives.",
];

interface CurriculumItem {
  id: string;
  track: string;
  band_level: number;
  topic: string;
  sentence: string;
  sort_order: number;
}

const PART2_TOPIC = {
  title: "Describe a memorable journey you have taken.",
  cues: [
    "Where you went",
    "How you traveled",
    "Who you went with",
    "And explain why this journey was memorable to you",
  ],
};

const SYSTEM_PROMPT =
  "You are a professional IELTS Speaking Examiner. Your goal is to assess the student. Keep your responses concise (1-2 sentences). In Part 1, ask about personal topics (hometown, work, studies). In Part 3, ask abstract questions based on the Part 2 topic. Do not be overly encouraging, act formal but polite. Ask one question at a time. Do not repeat questions already asked.";

type Persona = "Examiner" | "Teacher" | "Friend" | "Subject" | "Counselor";
type TestPart = "part1" | "part2_prep" | "part2_speak" | "part3";
type TestStatus = "idle" | "running" | "paused_boundary" | "transition_to_speak" | "finishing" | "completed";

interface TestState {
  status: TestStatus;
  queue: string[];
  currentPartIndex: number;
  currentPart: TestPart | null;
  timeLeft: number;
  elapsedInCurrent: number;
}

// ============================================================
// CANVAS VISUALIZERS
// ============================================================

function TargetContourCanvas({ data, isPlaying, activeWordIndex }: { data: WordData[]; isPlaying: boolean; activeWordIndex: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const progressRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const w = rect.width;
    const h = rect.height;
    const allSyllables = data.flatMap((d) => d.syllables);
    const pad = 12;
    const drawW = w - pad * 2;

    const getPoints = () => allSyllables.map((s, i) => ({
      x: pad + i * (drawW / Math.max(1, allSyllables.length - 1)),
      y: s.pitch === 2 && s.stress === 2 ? h * 0.15
        : s.pitch === 2 ? h * 0.3
        : s.pitch === -1 ? h * 0.85
        : h * 0.6,
    }));

    // Calculate progress based on activeWordIndex
    const totalWords = data.length;
    const targetProgress = isPlaying && totalWords > 0
      ? Math.min(1, (activeWordIndex + 1) / totalWords)
      : isPlaying ? 0.02 : 0;

    const draw = () => {
      // Smoothly animate progress
      if (isPlaying) {
        progressRef.current += (targetProgress - progressRef.current) * 0.08;
      } else {
        progressRef.current *= 0.92; // fade out
      }

      ctx.clearRect(0, 0, w, h);

      // Center line
      ctx.strokeStyle = "rgba(255,255,255,0.05)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, h / 2);
      ctx.lineTo(w, h / 2);
      ctx.stroke();

      const points = getPoints();
      if (points.length === 0) return;

      // Draw dim trail (full line)
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.strokeStyle = "rgba(34,211,238,0.15)";
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();

      // Draw lit portion (played segment)
      if (progressRef.current > 0.005) {
        const litEndX = pad + progressRef.current * drawW;
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
          if (points[i].x > litEndX) {
            // Interpolate to exact cutoff
            const prev = points[i - 1];
            const t = (litEndX - prev.x) / (points[i].x - prev.x);
            ctx.lineTo(prev.x + t * (points[i].x - prev.x), prev.y + t * (points[i].y - prev.y));
            break;
          }
          ctx.lineTo(points[i].x, points[i].y);
        }
        const grad = ctx.createLinearGradient(0, 0, litEndX, 0);
        grad.addColorStop(0, "#22d3ee");
        grad.addColorStop(1, "#3b82f6");
        ctx.strokeStyle = grad;
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.shadowColor = "#22d3ee";
        ctx.shadowBlur = 12;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Playhead dot
        const dotX = litEndX;
        const dotY = (() => {
          for (let i = 1; i < points.length; i++) {
            if (points[i].x >= dotX) {
              const prev = points[i - 1];
              const t = (dotX - prev.x) / (points[i].x - prev.x);
              return prev.y + t * (points[i].y - prev.y);
            }
          }
          return points[points.length - 1].y;
        })();
        ctx.beginPath();
        ctx.arc(dotX, dotY, 5, 0, Math.PI * 2);
        ctx.fillStyle = "#22d3ee";
        ctx.shadowColor = "#22d3ee";
        ctx.shadowBlur = 16;
        ctx.fill();
        ctx.shadowBlur = 0;
      } else {
        // Static: draw full bright line
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
          ctx.lineTo(points[i].x, points[i].y);
        }
        const grad = ctx.createLinearGradient(0, 0, w, 0);
        grad.addColorStop(0, "#22d3ee");
        grad.addColorStop(1, "#3b82f6");
        ctx.strokeStyle = grad;
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.shadowColor = "#22d3ee";
        ctx.shadowBlur = 10;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      if (isPlaying || progressRef.current > 0.01) {
        animRef.current = requestAnimationFrame(draw);
      }
    };

    if (isPlaying) {
      animRef.current = requestAnimationFrame(draw);
    } else {
      draw();
    }

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [data, isPlaying, activeWordIndex]);

  return <canvas ref={canvasRef} className="w-full h-full" />;
}

function LiveInputCanvas({
  isRecording,
  prosodyData,
  onAutoStop,
  onPitchContour,
}: {
  isRecording: boolean;
  prosodyData: WordData[];
  onAutoStop?: () => void;
  onPitchContour?: (contour: number[]) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<any>({});
  const history = useRef<any[]>([]);
  const startRef = useRef(0);
  const silenceStartRef = useRef<number | null>(null);
  const onAutoStopRef = useRef(onAutoStop);
  const onPitchContourRef = useRef(onPitchContour);
  const pitchTrackerRef = useRef<RealtimePitchTracker | null>(null);

  useEffect(() => {
    onAutoStopRef.current = onAutoStop;
  }, [onAutoStop]);
  useEffect(() => {
    onPitchContourRef.current = onPitchContour;
  }, [onPitchContour]);

  useEffect(() => {
    if (!isRecording) {
      if (audioRef.current.req) cancelAnimationFrame(audioRef.current.req);
      // Stop pitch tracker and emit contour
      if (pitchTrackerRef.current) {
        const contour = pitchTrackerRef.current.stop();
        if (onPitchContourRef.current && contour.length > 0) {
          onPitchContourRef.current(contour);
        }
        pitchTrackerRef.current = null;
      }
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const w = rect.width;
    const h = rect.height;
    history.current = [];
    silenceStartRef.current = Date.now();
    startRef.current = Date.now();

    const initMic = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const aCtx = new AudioContext();
        const analyser = aCtx.createAnalyser();
        analyser.fftSize = 2048;
        analyser.smoothingTimeConstant = 0.3;
        const src = aCtx.createMediaStreamSource(stream);
        src.connect(analyser);
        audioRef.current = { ctx: aCtx, analyser, src, req: null, stream };

        // Start pitch tracker
        pitchTrackerRef.current = new RealtimePitchTracker(analyser, aCtx.sampleRate);
        pitchTrackerRef.current.start();

        draw(ctx, w, h);
      } catch {
        // Simulate if no mic
      }
    };

    const draw = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      if (!audioRef.current.analyser) return;
      const data = new Uint8Array(audioRef.current.analyser.frequencyBinCount);
      audioRef.current.analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) {
        const v = (data[i] - 128) / 128;
        sum += v * v;
      }
      const rawAmp = Math.sqrt(sum / data.length);
      const amp = Math.min(1, rawAmp * 30);

      if (onAutoStopRef.current) {
        if (rawAmp > 0.02) {
          silenceStartRef.current = Date.now();
        } else {
          if (!silenceStartRef.current) silenceStartRef.current = Date.now();
          if (Date.now() - silenceStartRef.current > 2000) {
            onAutoStopRef.current();
            silenceStartRef.current = null;
            return;
          }
        }
      }

      // Use pitch data for Y position if available
      const tracker = pitchTrackerRef.current;
      const pitchContour = tracker?.getContour() ?? [];
      const latestPitch = pitchContour.length > 0 ? pitchContour[pitchContour.length - 1] : null;

      let y: number;
      if (latestPitch !== null) {
        // Map pitch (0-1 normalized) to canvas Y (inverted: high pitch = top)
        y = h - latestPitch * h * 0.8 - h * 0.1;
      } else {
        y = h / 2 - amp * h * 0.45;
      }
      if (history.current.length > 0) y = history.current[history.current.length - 1].y * 0.85 + y * 0.15;
      y = Math.max(10, Math.min(h - 10, y));

      const totalSyl = prosodyData.flatMap((d) => d.syllables).length;
      const maxDur = Math.max(2400, totalSyl * 300);
      const x = ((Date.now() - startRef.current) / maxDur) * w;
      history.current.push({ x, y });

      ctx.clearRect(0, 0, w, h);
      ctx.strokeStyle = "rgba(255,255,255,0.1)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, h / 2);
      ctx.lineTo(w, h / 2);
      ctx.stroke();

      if (history.current.length > 1) {
        ctx.beginPath();
        ctx.moveTo(history.current[0].x, history.current[0].y);
        for (let i = 1; i < history.current.length; i++) {
          ctx.lineTo(history.current[i].x, history.current[i].y);
        }
        const grad = ctx.createLinearGradient(0, 0, w, 0);
        grad.addColorStop(0, "#4ade80");
        grad.addColorStop(1, "#22c55e");
        ctx.strokeStyle = grad;
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        ctx.shadowColor = "#4ade80";
        ctx.shadowBlur = 8;
        ctx.stroke();
      }

      audioRef.current.req = requestAnimationFrame(() => draw(ctx, w, h));
    };

    initMic();

    return () => {
      if (audioRef.current.req) cancelAnimationFrame(audioRef.current.req);
      if (audioRef.current.stream) {
        audioRef.current.stream.getTracks().forEach((t: MediaStreamTrack) => t.stop());
      }
      if (audioRef.current.ctx) audioRef.current.ctx.close().catch(() => {});
    };
  }, [isRecording, prosodyData]);

  return <canvas ref={canvasRef} className="w-full h-full" />;
}

// ============================================================
// PROSODY VISUALIZER
// ============================================================

function ProsodyVisualizer({ data, activeWordIndex }: { data: WordData[]; activeWordIndex: number }) {
  return (
    <div className="relative min-h-[6rem] w-full max-w-3xl mx-auto flex flex-wrap items-center justify-center content-center gap-y-4 mt-4 mb-2 px-8">
      {data.map((item, i) => {
        const isActive = i === activeWordIndex;
        const activeScale = isActive ? "scale-110" : "scale-100";
        const activeBlur = !isActive && activeWordIndex !== -1 ? "blur-[1px] opacity-60" : "opacity-100";
        return (
          <div
            key={i}
            className={`relative ${item.chunkWithNext ? "mr-1" : "mx-2"} flex items-baseline group transition-all duration-200 ${activeScale} ${activeBlur}`}
          >
            {item.syllables.map((syl, sIdx) => {
              let yOffset = 0,
                fontSize = "text-2xl",
                color = isActive ? "text-cyan-300" : "text-white/60",
                weight = "font-medium",
                shadow = "";
              if (syl.pitch === 2 && syl.stress === 2) {
                yOffset = -20;
                fontSize = "text-4xl";
                weight = "font-bold";
                color = isActive ? "text-cyan-200" : "text-yellow-400";
                shadow = isActive
                  ? "drop-shadow-[0_0_20px_rgba(34,211,238,0.9)]"
                  : "drop-shadow-[0_0_15px_rgba(250,204,21,0.6)]";
              } else if (syl.pitch === 2) {
                yOffset = -8;
                fontSize = "text-2xl";
                weight = "font-semibold";
                color = isActive ? "text-cyan-300" : "text-white";
              } else {
                color = isActive ? "text-cyan-500" : "text-gray-400";
              }
              return (
                <span
                  key={sIdx}
                  className={`relative inline-block ${fontSize} ${color} ${weight} ${shadow} z-10 transition-colors duration-100`}
                  style={{ transform: `translateY(${yOffset}px)`, transition: "transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)" }}
                >
                  {syl.text}
                </span>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

// ============================================================
// SMALL UI COMPONENTS
// ============================================================

function XPWidget({ xp, level }: { xp: number; level: number }) {
  return (
    <div className="flex gap-3 items-center bg-black/50 backdrop-blur-2xl border border-amber-500/20 rounded-2xl pl-3 pr-5 py-2.5 shadow-[0_4px_24px_-4px_rgba(250,204,21,0.15)] hover:border-amber-500/30 transition-colors">
      <div className="relative w-9 h-9 flex items-center justify-center">
        <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/20" />
        <Star className="w-4 h-4 text-amber-400 fill-current drop-shadow-[0_0_8px_rgba(250,204,21,0.6)]" />
      </div>
      <div className="flex flex-col w-28">
        <div className="flex justify-between text-[9px] font-bold uppercase tracking-wider text-amber-300/80 mb-1">
          <span>Lvl {level}</span>
          <span className="text-amber-200">{xp} XP</span>
        </div>
        <div className="h-1 bg-black/60 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transition-all duration-1000"
            style={{ width: `${xp % 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function StreakWidget({ time }: { time: number }) {
  const mins = Math.floor(time / 60);
  const secs = time % 60;
  return (
    <div className="flex items-center gap-2.5 bg-black/50 backdrop-blur-2xl border border-orange-500/20 rounded-2xl px-4 py-2.5 shadow-[0_4px_24px_-4px_rgba(249,115,22,0.15)] hover:border-orange-500/30 transition-colors">
      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500/20 to-red-500/10 border border-orange-500/20 flex items-center justify-center">
        <Flame className="w-4 h-4 text-orange-400 animate-flame-premium" />
      </div>
      <div className="font-mono text-sm font-bold text-orange-200 tabular-nums tracking-wide">
        {mins}:{secs.toString().padStart(2, "0")}
      </div>
    </div>
  );
}

function CountdownOverlay({ count }: { count: number }) {
  return (
    <div className="absolute inset-0 z-[400] flex items-center justify-center bg-black/80 backdrop-blur-md animate-fade-in">
      <div
        key={count}
        className="text-9xl font-black text-transparent bg-clip-text bg-gradient-to-br from-cyan-400 to-blue-600 animate-countdown-pop"
      >
        {count === 0 ? "GO!" : count}
      </div>
    </div>
  );
}

function PersonaSelector({
  persona,
  setPersona,
  setShowTestConfig,
}: {
  persona: Persona;
  setPersona: (p: Persona) => void;
  setShowTestConfig: (b: boolean) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const personas: { id: Persona; icon: typeof Mic; label: string; color: string }[] = [
    { id: "Examiner", icon: Mic, label: "Examiner", color: "text-cyan-300" },
    { id: "Teacher", icon: Book, label: "English Teacher", color: "text-green-300" },
    { id: "Friend", icon: Smile, label: "Friend", color: "text-yellow-300" },
    { id: "Subject", icon: Users, label: "Subject Teacher", color: "text-purple-300" },
    { id: "Counselor", icon: Headphones, label: "Counselor", color: "text-pink-300" },
  ];
  const current = personas.find((p) => p.id === persona) || personas[0];
  return (
    <div className="relative z-[200]">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-black/40 backdrop-blur-xl border border-white/10 rounded-full hover:bg-white/10 transition-colors"
      >
        <current.icon className={`w-4 h-4 ${current.color}`} />
        <span className={`text-xs font-bold uppercase tracking-wider ${current.color}`}>{current.label}</span>
        <MoveHorizontal className="w-3 h-3 text-white/40 rotate-90" />
      </button>
      {isOpen && (
        <div className="absolute top-12 right-0 w-48 flex flex-col gap-1 p-2 rounded-xl bg-white/[0.03] backdrop-blur-[40px] border border-white/10 shadow-2xl animate-fade-in z-[200]">
          {personas.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                setPersona(p.id);
                setIsOpen(false);
                if (p.id === "Examiner") setShowTestConfig(true);
                else setShowTestConfig(false);
              }}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors hover:bg-white/10 ${persona === p.id ? "bg-white/10" : ""}`}
            >
              <p.icon className={`w-4 h-4 ${p.color}`} />
              <span className={`text-xs font-bold ${p.color}`}>{p.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ExaminerConfig({
  onStartTest,
  onClose,
}: {
  onStartTest: (parts: string[]) => void;
  onClose: () => void;
}) {
  const [selectedParts, setSelectedParts] = useState({ part1: true, part2: true, part3: true });
  const toggle = (part: "part1" | "part2" | "part3") =>
    setSelectedParts((p) => ({ ...p, [part]: !p[part] }));

  return (
    <div className="absolute top-40 right-8 w-64 bg-white/[0.03] backdrop-blur-[40px] border border-white/10 rounded-2xl p-4 z-[200] animate-fade-in shadow-[0_0_30px_-5px_rgba(34,211,238,0.3)]">
      <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-2">
        <span className="text-xs font-bold uppercase text-cyan-300">Choose Test Setup</span>
        <button onClick={onClose}>
          <X className="w-4 h-4 text-white/50 hover:text-white" />
        </button>
      </div>
      <div className="space-y-2 mb-4">
        {(["Part 1", "Part 2", "Part 3"] as const).map((label, i) => {
          const key = `part${i + 1}` as "part1" | "part2" | "part3";
          return (
            <button
              key={key}
              onClick={() => toggle(key)}
              className={`w-full flex items-center justify-between p-2 rounded-lg text-sm font-medium transition-colors ${
                selectedParts[key]
                  ? "bg-cyan-500/20 text-cyan-200 border border-cyan-500/30"
                  : "bg-white/5 text-gray-400 hover:bg-white/10"
              }`}
            >
              {label}
              {selectedParts[key] && <Check className="w-4 h-4" />}
            </button>
          );
        })}
      </div>
      <button
        onClick={() => {
          const parts: string[] = [];
          if (selectedParts.part1) parts.push("part1");
          if (selectedParts.part2) parts.push("part2");
          if (selectedParts.part3) parts.push("part3");
          if (parts.length > 0) onStartTest(parts);
        }}
        className="w-full py-2 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg text-xs font-bold uppercase tracking-widest hover:brightness-110 shadow-lg"
      >
        Start Test
      </button>
    </div>
  );
}

function CueCard({ topic }: { topic: typeof PART2_TOPIC }) {
  return (
    <div className="absolute top-[150px] left-5 w-[280px] bg-white/[0.03] backdrop-blur-[40px] border border-white/10 rounded-2xl border-l-4 border-l-amber-500 p-4 z-[200] animate-fade-in">
      <div className="flex justify-between items-center mb-2 border-b border-white/10 pb-2">
        <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">Part 2 Topic</span>
        <Book className="w-4 h-4 text-amber-500" />
      </div>
      <h3 className="text-lg font-bold text-white mb-2 leading-tight">{topic.title}</h3>
      <ul className="space-y-1 text-sm text-gray-300 pl-4 list-disc">
        {topic.cues.map((c, i) => (
          <li key={i}>{c}</li>
        ))}
      </ul>
    </div>
  );
}

function FreehandNotePad() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<"draw" | "type">("type");
  const [isDrawing, setIsDrawing] = useState(false);
  const [typedText, setTypedText] = useState("");

  useEffect(() => {
    if (mode === "draw" && wrapperRef.current && canvasRef.current) {
      canvasRef.current.width = wrapperRef.current.clientWidth;
      canvasRef.current.height = wrapperRef.current.clientHeight;
    }
  }, [mode]);

  const startDrawing = (e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setIsDrawing(true);
    const ctx = canvas.getContext("2d")!;
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "white";
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  const draw = (e: React.PointerEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;
    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const clearCanvas = () => {
    if (mode === "draw" && canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    } else {
      setTypedText("");
    }
  };

  return (
    <div className="absolute top-[150px] right-5 w-[280px] h-[220px] bg-white/[0.03] backdrop-blur-[40px] border border-white/10 rounded-2xl flex flex-col z-[200] animate-fade-in overflow-hidden">
      <div className="p-3 border-b border-white/10 flex items-center justify-between bg-white/5">
        <div className="flex items-center gap-2">
          <Edit className="w-4 h-4 text-emerald-400" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-white/80">Notes</span>
        </div>
        <div className="flex gap-2 items-center">
          <button
            onClick={() => setMode("type")}
            className={`p-1.5 rounded transition-colors ${mode === "type" ? "bg-white/20 text-white" : "hover:bg-white/10 text-white/60"}`}
          >
            <Keyboard className="w-4 h-4" />
          </button>
          <button
            onClick={() => setMode("draw")}
            className={`p-1.5 rounded transition-colors ${mode === "draw" ? "bg-white/20 text-white" : "hover:bg-white/10 text-white/60"}`}
          >
            <PenTool className="w-4 h-4" />
          </button>
          <button onClick={clearCanvas} className="p-1.5 hover:bg-white/10 rounded text-white/60">
            <Trash className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div ref={wrapperRef} className="flex-1 relative bg-white/5 overflow-hidden">
        {mode === "draw" ? (
          <canvas
            ref={canvasRef}
            className="w-full h-full touch-none cursor-crosshair"
            style={{ touchAction: "none" }}
            onPointerDown={startDrawing}
            onPointerMove={draw}
            onPointerUp={() => setIsDrawing(false)}
            onPointerLeave={() => setIsDrawing(false)}
          />
        ) : (
          <textarea
            value={typedText}
            onChange={(e) => setTypedText(e.target.value)}
            className="w-full h-full bg-transparent p-4 text-white font-mono text-sm resize-none focus:outline-none placeholder-white/20"
            placeholder="Type your notes here..."
          />
        )}
      </div>
    </div>
  );
}

function SaveSessionModal({
  onSave,
  onDiscard,
  isPartial,
}: {
  onSave: () => void;
  onDiscard: () => void;
  isPartial: boolean;
}) {
  return (
    <div className="absolute inset-0 z-[500] flex items-center justify-center bg-black/90 backdrop-blur-md animate-fade-in">
      <div className="w-[400px] bg-white/[0.03] backdrop-blur-[40px] border border-white/10 rounded-3xl p-6 shadow-[0_0_30px_-5px_rgba(168,85,247,0.3)] flex flex-col items-center text-center">
        <Save className="w-12 h-12 text-purple-400 mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">{isPartial ? "Save Partial Session?" : "Test Completed"}</h3>
        <p className="text-sm text-gray-400 mb-6">
          {isPartial
            ? "You cancelled the test early. Would you like to save the parts you completed?"
            : "Great job! Would you like to save this recording to your history?"}
        </p>
        <div className="flex gap-3 w-full">
          <button
            onClick={onDiscard}
            className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-300 transition-colors font-bold text-sm"
          >
            Discard
          </button>
          <button
            onClick={onSave}
            className="flex-1 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-900/50 transition-colors font-bold text-sm"
          >
            Save Session
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// FLAG COMPONENTS
// ============================================================

function UKFlag() {
  return (
    <svg viewBox="0 0 60 30" className="w-6 h-4 rounded-[3px] shadow-sm border border-white/20">
      <path d="M0,0 v30 h60 v-30 z" fill="#012169" />
      <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6" />
      <path d="M0,0 L60,30 M60,0 L0,30" stroke="#C8102E" strokeWidth="4" />
      <path d="M30,0 v30 M0,15 h60" stroke="#fff" strokeWidth="10" />
      <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth="6" />
    </svg>
  );
}

function USFlag() {
  return (
    <svg viewBox="0 0 60 30" className="w-6 h-4 rounded-[3px] shadow-sm border border-white/20">
      <path fill="#bd3d44" d="M0 0h60v30H0z" />
      <path stroke="#fff" strokeWidth="2.3" d="M0 2.5h60M0 7.5h60M0 12.5h60M0 17.5h60M0 22.5h60M0 27.5h60" />
      <path fill="#192f5d" d="M0 0h28v16H0z" />
    </svg>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function SpeakingStudio() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [mode, setMode] = useState<"shadowing" | "speaking">("shadowing");
  const [accent, setAccent] = useState<"UK" | "US">("UK");
  const [practiceType, setPracticeType] = useState<"pronunciation" | "fluency">("pronunciation");
  const [rawText, setRawText] = useState("The quick brown fox jumps over the lazy dog");
  const [prosodyData, setProsodyData] = useState<WordData[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlayingModel, setIsPlayingModel] = useState(false);
  const [activeWordIndex, setActiveWordIndex] = useState(-1);
  const [score, setScore] = useState<number | null>(null);
  const [streakTime, setStreakTime] = useState(850);
  const [ghostMode, setGhostMode] = useState(false);
  const [lastRecordingUrl, setLastRecordingUrl] = useState<string | null>(null);

  // Curriculum state (DB-driven for pronunciation)
  const [curriculumItems, setCurriculumItems] = useState<CurriculumItem[]>([]);
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [curriculumOffset, setCurriculumOffset] = useState(0);
  const [curriculumLoading, setCurriculumLoading] = useState(false);
  const [currentTopic, setCurrentTopic] = useState("");
  const [curriculumTotal, setCurriculumTotal] = useState(0);
  const [globalSentenceIndex, setGlobalSentenceIndex] = useState(0);

  // Speaking mode state
  const [messages, setMessages] = useState<{ role: "teacher" | "student"; text: string }[]>([
    { role: "teacher", text: "Hello. Could you start by telling me your full name, please?" },
  ]);
  const [persona, setPersona] = useState<Persona>("Examiner");
  const [showTestConfig, setShowTestConfig] = useState(false);
  const [isAiThinking, setIsAiThinking] = useState(false);

  // Test state
  const [testState, setTestState] = useState<TestState>({
    status: "idle",
    queue: [],
    currentPartIndex: -1,
    currentPart: null,
    timeLeft: 0,
    elapsedInCurrent: 0,
  });
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [completedParts, setCompletedParts] = useState<string[]>([]);

  // XP
  const [xp, setXp] = useState(1250);
  const [level, setLevel] = useState(3);
  const addXP = (amount: number) => {
    setXp((p) => p + amount);
    if (Math.floor((xp + amount) / 500) > Math.floor(xp / 500)) setLevel((l) => l + 1);
  };

  // Refs
  const ttsHandleRef = useRef<TTSHandle | null>(null);
  const sttHandleRef = useRef<STTHandle | null>(null);
  const currentTranscriptRef = useRef("");
  const interimTranscriptRef = useRef("");
  const isRecordingRef = useRef(false);
  const testStateRef = useRef(testState);
  const nextTransition = useRef<any>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Sync refs
  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);
  useEffect(() => {
    testStateRef.current = testState;
  }, [testState]);
  useEffect(() => {
    setProsodyData(parseProsody(rawText));
  }, [rawText]);

  // Timer
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (testState.status === "running" && testState.timeLeft > 0) {
      interval = setInterval(() => {
        setTestState((prev) => {
          const newTime = prev.timeLeft - 1;
          if (prev.currentPart === "part2_prep" && newTime === 0) {
            return { ...prev, status: "transition_to_speak" as TestStatus, timeLeft: 0 };
          }
          if (prev.currentPart === "part2_speak" && newTime === 0) {
            return { ...prev, status: "finishing" as TestStatus, timeLeft: 5 };
          }
          return { ...prev, timeLeft: newTime, elapsedInCurrent: prev.elapsedInCurrent + 1 };
        });
      }, 1000);
    } else if (testState.status === "transition_to_speak") {
      startTransition("part2_speak", 120);
    } else if (testState.status === "finishing") {
      interval = setInterval(() => {
        setTestState((prev) => {
          if (prev.timeLeft <= 1) {
            const totalSpeech = (currentTranscriptRef.current + " " + interimTranscriptRef.current).trim();
            const userSpeech = totalSpeech || "(Audio Response Recorded)";
            setMessages((m) => [...m, { role: "student", text: userSpeech }]);
            setIsRecording(false);
            stopSpeechRecognition();
            return { ...prev, status: "paused_boundary" as TestStatus, timeLeft: 0 };
          }
          return { ...prev, timeLeft: prev.timeLeft - 1 };
        });
      }, 1000);
    }
    if (testState.status === "running" && testState.timeLeft === 0 && (testState.currentPart === "part1" || testState.currentPart === "part3")) {
      setTestState((prev) => ({ ...prev, status: "paused_boundary" as TestStatus, timeLeft: 0 }));
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [testState.status, testState.timeLeft, testState.currentPart]);

  // Countdown
  useEffect(() => {
    if (countdown === null) return;
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown((c) => (c ?? 1) - 1), 1000);
      return () => clearTimeout(timer);
    }
    if (countdown === 0) {
      setCountdown(null);
      if (nextTransition.current) {
        const { part, duration, index } = nextTransition.current;
        setTestState((prev) => ({
          ...prev,
          status: "running",
          currentPart: part,
          timeLeft: duration,
          elapsedInCurrent: 0,
          currentPartIndex: index !== undefined ? index : prev.currentPartIndex,
        }));
        nextTransition.current = null;
        if (["part1", "part2_speak", "part3"].includes(part)) {
          setTimeout(() => {
            if (testStateRef.current.status === "running") {
              setIsRecording(true);
              startSpeechRecognition();
              if (part === "part1" || part === "part3") {
                setTimeout(() => triggerAIQuestion(), 1500);
              }
            }
          }, 50);
        }
      }
    }
  }, [countdown]);

  // Speech recognition
  const accentLower = accent.toLowerCase() as Accent;

  const startSpeechRecognition = () => {
    if (sttHandleRef.current) {
      sttHandleRef.current.stop();
      sttHandleRef.current = null;
    }
    sttHandleRef.current = startListening("en-US", {
      onResult: (text) => {
        currentTranscriptRef.current += " " + text;
      },
      onInterim: (text) => {
        interimTranscriptRef.current = text;
      },
      onError: (err) => {
        if (err === "not-allowed") setIsRecording(false);
      },
    });
  };

  const stopSpeechRecognition = () => {
    if (sttHandleRef.current) {
      sttHandleRef.current.stop();
      sttHandleRef.current = null;
    }
  };

  // AI
  const triggerAIQuestion = async () => {
    setIsAiThinking(true);
    try {
      const history: ChatMessage[] = [
        { role: "system", content: SYSTEM_PROMPT },
        ...messages.map((m) => ({
          role: (m.role === "teacher" ? "assistant" : "user") as "system" | "user" | "assistant",
          content: m.text,
        })),
      ];
      const response = await chat(
        history,
        `I am currently in ${testState.currentPart}. Ask me a relevant question based on my previous answer if provided.`
      );
      setIsAiThinking(false);
      setMessages((prev) => [...prev, { role: "teacher", text: response }]);
      speakTeacherText(response);
    } catch {
      setIsAiThinking(false);
      const fallback = "Let's move to the next question.";
      setMessages((prev) => [...prev, { role: "teacher", text: fallback }]);
      speakTeacherText(fallback);
    }
  };

  const speakTeacherText = (text: string) => {
    ttsHandleRef.current?.stop();
    ttsHandleRef.current = speak(text, accentLower, { rate: 1.0 });
  };

  // Transition helpers
  const startTransition = (part: TestPart, duration: number, index?: number) => {
    nextTransition.current = { part, duration, index };
    setCountdown(3);
  };

  const runTestSetup = async (partsList: string[]) => {
    setCompletedParts([]);
    const introMsg = "Starting test. Good luck. Let's begin.";
    setMessages((prev) => [...prev, { role: "teacher", text: introMsg }]);
    speakTeacherText(introMsg);

    const firstPart = partsList[0];
    let firstPartState: TestPart = firstPart as TestPart;
    let duration = 300;
    if (firstPart === "part2") {
      firstPartState = "part2_prep";
      duration = 60;
    }

    setTestState({
      status: "running",
      queue: partsList,
      currentPartIndex: 0,
      currentPart: firstPartState,
      timeLeft: duration,
      elapsedInCurrent: 0,
    });

    if (firstPartState === "part1" || firstPartState === "part3") {
      setTimeout(() => {
        setIsRecording(true);
        startSpeechRecognition();
        setTimeout(() => triggerAIQuestion(), 1500);
      }, 500);
    }
  };

  const initiateCountdown = (partsList: string[]) => {
    setShowTestConfig(false);
    setCountdown(3);
    setTimeout(() => runTestSetup(partsList), 3000);
  };

  const advanceTest = () => {
    const nextIndex = testState.currentPartIndex + 1;
    if (testState.currentPart === "part2_speak") setCompletedParts((prev) => [...prev, "Part 2"]);
    else if (testState.currentPart === "part1") setCompletedParts((prev) => [...prev, "Part 1"]);
    else if (testState.currentPart === "part3") setCompletedParts((prev) => [...prev, "Part 3"]);

    if (nextIndex < testState.queue.length) {
      const nextPartId = testState.queue[nextIndex];
      if (nextPartId === "part2") {
        setTestState((prev) => ({
          ...prev,
          status: "running",
          currentPart: "part2_prep",
          timeLeft: 60,
          elapsedInCurrent: 0,
          currentPartIndex: nextIndex,
        }));
      } else {
        startTransition(nextPartId as TestPart, 300, nextIndex);
      }
    } else {
      finishTest();
    }
  };

  const stopTestManual = () => {
    stopSpeaking();
    setCountdown(null);
    nextTransition.current = null;
    if (isRecording) {
      const totalSpeech = (currentTranscriptRef.current + " " + interimTranscriptRef.current).trim();
      if (totalSpeech.length > 0) {
        setMessages((prev) => [...prev, { role: "student", text: totalSpeech }]);
      }
    }
    setIsRecording(false);
    stopSpeechRecognition();
    setTestState((prev) => ({ ...prev, status: "completed" }));
    setShowSaveModal(true);
  };

  const finishTest = () => {
    setIsRecording(false);
    stopSpeechRecognition();
    setTestState((prev) => ({ ...prev, status: "completed" }));
    setShowSaveModal(true);
  };

  const skipPrep = () => startTransition("part2_speak", 120);

  const handleNextQuestion = async () => {
    setIsRecording(false);
    stopSpeechRecognition();
    const totalSpeech = (currentTranscriptRef.current + " " + interimTranscriptRef.current).trim();
    const userSpeech = totalSpeech || "(Audio Response Recorded)";
    setMessages((prev) => [...prev, { role: "student", text: userSpeech }]);
    currentTranscriptRef.current = "";
    interimTranscriptRef.current = "";
    await triggerAIQuestion();
    setIsRecording(true);
    startSpeechRecognition();
  };

  // Curriculum loading — supports resuming from a sort_order
  const loadCurriculumPage = useCallback(async (offset: number, resumeSortOrder?: number) => {
    setCurriculumLoading(true);
    try {
      const items = await fetchCurriculumPage("pronunciation", offset, 5);
      if (items.length > 0) {
        setCurriculumItems(items);
        setCurriculumOffset(offset);

        // If resuming, find the item *after* the last completed sort_order
        let startIdx = 0;
        if (resumeSortOrder !== undefined) {
          const idx = items.findIndex((i) => i.sort_order > resumeSortOrder);
          if (idx !== -1) startIdx = idx;
        }
        setCurrentItemIndex(startIdx);
        setRawText(items[startIdx].sentence);
        setCurrentTopic(items[startIdx].topic);
        // Global index = offset + local index within page
        setGlobalSentenceIndex(offset + startIdx);
      }
    } catch (err) {
      console.error("Failed to load curriculum:", err);
    } finally {
      setCurriculumLoading(false);
    }
  }, []);

  // Load curriculum with progress on mount
  useEffect(() => {
    if (practiceType !== "pronunciation" || !userId) return;
    (async () => {
      try {
        // Fetch total count for progress bar
        const total = await fetchCurriculumCount("pronunciation");
        setCurriculumTotal(total);

        const progress = await fetchCurriculumProgress(userId, "pronunciation");
        if (progress && progress.last_sort_order > 0) {
          const nextItem = await fetchNextSentence("pronunciation", progress.last_sort_order);
          if (nextItem) {
            const pageOffset = Math.floor((nextItem.sort_order - 1) / 5) * 5;
            await loadCurriculumPage(pageOffset, progress.last_sort_order);
          } else {
            await loadCurriculumPage(0);
          }
        } else {
          await loadCurriculumPage(0);
        }
      } catch {
        await loadCurriculumPage(0);
      }
    })();
  }, [userId, practiceType, loadCurriculumPage]);

  // Shadowing handlers
  const handleGenerate = (type: "pronunciation" | "fluency") => {
    if (type === "pronunciation") {
      // Load next random page from DB
      loadCurriculumPage(Math.floor(Math.random() * 100) * 5);
    } else {
      const source = FLUENCY_SENTENCES;
      setRawText(source[Math.floor(Math.random() * source.length)]);
      setCurrentTopic("");
    }
    setLastRecordingUrl(null);
  };

  const handleNextSentence = useCallback(async () => {
    setScore(null);
    setLastRecordingUrl(null);
    const nextIdx = currentItemIndex + 1;
    if (nextIdx < curriculumItems.length) {
      setCurrentItemIndex(nextIdx);
      setRawText(curriculumItems[nextIdx].sentence);
      setCurrentTopic(curriculumItems[nextIdx].topic);
      setGlobalSentenceIndex(curriculumOffset + nextIdx);
    } else {
      // Load next page — globalSentenceIndex updated inside loadCurriculumPage
      await loadCurriculumPage(curriculumOffset + 5);
    }
  }, [currentItemIndex, curriculumItems, curriculumOffset, loadCurriculumPage]);

  // Pitch contour callback — also saves progress
  const handlePitchContour = useCallback((contour: number[]) => {
    if (mode === "shadowing" && contour.length > 0) {
      const result = analyzeContour(contour, rawText);
      setScore(result.overallScore);

      // Save progress for the current curriculum item
      const currentItem = curriculumItems[currentItemIndex];
      if (userId && currentItem && practiceType === "pronunciation") {
        saveCurriculumProgress(userId, "pronunciation", currentItem.sort_order, result.overallScore).catch(console.error);
      }
    }
  }, [mode, rawText, userId, curriculumItems, currentItemIndex, practiceType]);

  const handlePlayModel = () => {
    if (isPlayingModel) {
      ttsHandleRef.current?.stop();
      setIsPlayingModel(false);
      setActiveWordIndex(-1);
      return;
    }
    ttsHandleRef.current = speak(rawText, accentLower, {
      rate: 0.8,
      pitch: 1.1,
      onBoundary: (charIndex) => {
        const idx = prosodyData.findIndex((w) => Math.abs(w.startChar - charIndex) < 4);
        if (idx !== -1) setActiveWordIndex(idx);
      },
      onStart: () => {
        setIsPlayingModel(true);
        setActiveWordIndex(0);
      },
      onEnd: () => {
        setIsPlayingModel(false);
        setActiveWordIndex(-1);
      },
    });
    addXP(5);
  };

  const handleRecord = () => {
    if (testState.status !== "idle") {
      stopTestManual();
      return;
    }
    if (isRecording) {
      setIsRecording(false);
      stopSpeechRecognition();
      if (mode === "shadowing" && ghostMode) stopSpeaking();
      addXP(20);
      if (mode === "shadowing") {
        setLastRecordingUrl("mock_url");
        // Score is now set by handlePitchContour callback from LiveInputCanvas
      }
    } else {
      setIsRecording(true);
      setScore(null);
      if (mode === "shadowing") setLastRecordingUrl(null);
      if (mode === "shadowing" && ghostMode) {
        ttsHandleRef.current = speak(rawText, accentLower, {
          rate: 0.8,
          pitch: 1.1,
          onBoundary: (charIndex) => {
            const idx = prosodyData.findIndex((w) => Math.abs(w.startChar - charIndex) < 4);
            if (idx !== -1) setActiveWordIndex(idx);
          },
          onEnd: () => setActiveWordIndex(-1),
        });
      } else {
        startSpeechRecognition();
      }
    }
  };

  const handlePersonaChange = (newPersona: Persona) => {
    setPersona(newPersona);
    const greetings: Record<Persona, string> = {
      Examiner: "Good day. Shall we begin a practice test?",
      Teacher: "Hello! Do you have a question about English grammar or vocabulary?",
      Friend: "Hi, we can talk privately about anything you like.",
      Subject: "Hi, we can talk about any of your other subjects.",
      Counselor: "Hello. I'm here to listen. What's on your mind today?",
    };
    setMessages((prev) => [...prev, { role: "teacher", text: greetings[newPersona] }]);
  };

  const getPersonaBubbleStyle = (p: Persona) => {
    switch (p) {
      case "Teacher": return "bg-green-900/40 border-green-500/30 text-green-100";
      case "Friend": return "bg-yellow-900/40 border-yellow-500/30 text-yellow-100";
      case "Subject": return "bg-purple-900/40 border-purple-500/30 text-purple-100";
      case "Counselor": return "bg-pink-900/40 border-pink-500/30 text-pink-100";
      default: return "bg-cyan-900/40 border-cyan-500/30 text-cyan-100";
    }
  };

  const partLabel = (part: TestPart | null) => {
    switch (part) {
      case "part1": return "Part 1: Introduction";
      case "part2_prep": return "Part 2: Preparation";
      case "part2_speak": return "Part 2: Long Turn";
      case "part3": return "Part 3: Discussion";
      default: return "";
    }
  };

  // Auto-scroll chat
  useEffect(() => {
    chatScrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isAiThinking]);

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
        <button
          onClick={() => navigate("/student")}
          className="absolute top-4 left-4 z-[300] flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-black/50 backdrop-blur-2xl border border-white/10 text-white/60 hover:text-white hover:bg-black/70 hover:border-white/20 transition-all text-[11px] font-semibold tracking-wide group"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
          Back
        </button>

        {/* Top Bar */}
        <div className="absolute top-6 left-0 right-0 px-6 z-50 flex justify-between items-start">
          <div className="flex flex-col gap-2.5 ml-16">
            <StreakWidget time={streakTime} />
            {mode === "speaking" && (
              <PersonaSelector persona={persona} setPersona={handlePersonaChange} setShowTestConfig={setShowTestConfig} />
            )}
            {mode === "shadowing" && (
              <>
                {/* Accent Toggle */}
                <div className="relative bg-black/50 backdrop-blur-2xl border border-white/[0.08] rounded-2xl p-1 flex w-max shadow-[0_4px_24px_-4px_rgba(0,0,0,0.5)]">
                  <div
                    className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white/[0.08] rounded-xl transition-all duration-400 ease-out border border-white/[0.06] ${accent === "UK" ? "left-1" : "left-[calc(50%+3px)]"}`}
                  />
                  {(["UK", "US"] as const).map((acc) => (
                    <button
                      key={acc}
                      onClick={() => setAccent(acc)}
                      className={`relative z-10 px-5 py-2 rounded-xl flex items-center gap-2 transition-all duration-300 ${accent === acc ? "text-white" : "text-white/35 grayscale hover:text-white/50"}`}
                    >
                      {acc === "UK" ? <UKFlag /> : <USFlag />}
                      <span className="text-[11px] font-semibold tracking-wide">{acc === "UK" ? "British" : "American"}</span>
                    </button>
                  ))}
                </div>
                {/* Practice Type */}
                <div className="flex p-1 gap-1 bg-black/50 backdrop-blur-2xl border border-white/[0.08] rounded-2xl w-max shadow-[0_4px_24px_-4px_rgba(0,0,0,0.5)]">
                  {(["pronunciation", "fluency"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => {
                        setPracticeType(t);
                        handleGenerate(t);
                      }}
                      className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all duration-300 ${practiceType === t ? "bg-white/[0.08] text-white border border-white/[0.06]" : "text-white/35 hover:text-white/60"}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="flex flex-col gap-2.5 items-end">
            <XPWidget xp={xp} level={level} />
            {testState.status === "idle" && (
              <div className="flex p-1 gap-1 rounded-2xl bg-black/50 backdrop-blur-2xl border border-white/[0.08] shadow-[0_4px_24px_-4px_rgba(0,0,0,0.5)]">
                <button
                  onClick={() => setMode("shadowing")}
                  className={`px-5 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all duration-300 ${mode === "shadowing" ? "bg-cyan-500/90 text-black shadow-[0_2px_12px_rgba(6,182,212,0.4)]" : "text-white/35 hover:text-white/60"}`}
                >
                  Shadowing
                </button>
                <button
                  onClick={() => {
                    setMode("speaking");
                    setShowTestConfig(true);
                  }}
                  className={`px-5 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all duration-300 ${mode === "speaking" ? "bg-purple-500/90 text-white shadow-[0_2px_12px_rgba(168,85,247,0.4)]" : "text-white/35 hover:text-white/60"}`}
                >
                  Speaking
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ==================== SHADOWING MODE ==================== */}
        {mode === "shadowing" && (
          <>
            {/* Bottom area */}
            <div className="absolute bottom-0 left-0 right-0 pb-2 pt-16 px-24 flex flex-col items-center z-40 bg-gradient-to-t from-black/85 via-black/60 to-transparent">
              <div className="mb-1 w-full text-center relative z-10">
                <ProsodyVisualizer data={prosodyData} activeWordIndex={activeWordIndex} />
              </div>
              <div className="w-full max-w-3xl flex flex-col gap-2 mb-2">
                {/* Progress bar */}
                {practiceType === "pronunciation" && curriculumTotal > 0 && (
                  <div className="w-full h-1 bg-white/[0.06] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-700 ease-out"
                      style={{ width: `${((globalSentenceIndex + 1) / curriculumTotal) * 100}%` }}
                    />
                  </div>
                )}
                {/* Target contour */}
                <div
                  onClick={handlePlayModel}
                  className="relative h-16 rounded-2xl overflow-hidden transition-all duration-500 group cursor-pointer bg-white/[0.03] backdrop-blur-[40px] border border-white/10 shadow-[0_0_30px_-5px_rgba(34,211,238,0.3)]"
                >
                  <div className="absolute top-2 left-4 text-[9px] font-black uppercase text-cyan-300 tracking-[0.2em] z-10 opacity-70">
                    Target Contour
                  </div>
                  <div className="absolute inset-0 px-8 py-2">
                    <TargetContourCanvas data={prosodyData} isPlaying={isPlayingModel} activeWordIndex={activeWordIndex} />
                  </div>
                </div>
                {/* Live input */}
                <div className="relative h-16 rounded-2xl overflow-hidden bg-white/[0.03] backdrop-blur-[40px] border border-white/10 shadow-[0_0_30px_-5px_rgba(74,222,128,0.3)]">
                  <div className="absolute top-2 left-4 text-[9px] font-black uppercase text-green-300 tracking-[0.2em] z-10 opacity-70">
                    Real-Time Input
                  </div>
                  <div className="absolute inset-0 px-8 py-2">
                    <LiveInputCanvas isRecording={isRecording} prosodyData={prosodyData} onAutoStop={handleRecord} onPitchContour={handlePitchContour} />
                  </div>
                  {score && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/80 backdrop-blur-xl border border-green-500/30 rounded-full px-4 py-1.5 flex items-center gap-2 shadow-[0_0_30px_rgba(34,199,89,0.3)] animate-fade-in-up z-20">
                      <Award className="w-4 h-4 text-green-400" />
                      <span className="text-[9px] text-green-200/50 uppercase tracking-widest font-bold">Match</span>
                      <span className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-green-300 to-emerald-500">
                        {score}%
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            {/* Right action bar */}
            <div className="absolute top-1/2 -translate-y-1/2 right-6 flex flex-col items-center gap-3 z-50 bg-black/50 backdrop-blur-2xl border border-white/[0.08] rounded-3xl p-3 shadow-[0_8px_32px_-4px_rgba(0,0,0,0.6)]">
              {/* Listen */}
              <button
                onClick={handlePlayModel}
                className={`relative w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 group ${isPlayingModel ? "bg-cyan-500/20 border border-cyan-500/30 text-cyan-300" : "text-white/40 hover:text-white hover:bg-white/[0.06]"}`}
                title="Hear Teacher Model"
              >
                <Play className="w-6 h-6 ml-0.5 group-hover:scale-110 transition-transform" />
              </button>

              {/* Divider */}
              <div className="w-7 h-px bg-white/[0.06]" />

              {/* Record */}
              <button
                onClick={handleRecord}
                className={`relative w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300 ${isRecording ? "bg-red-500 shadow-[0_0_24px_rgba(239,68,68,0.4)] scale-105" : "bg-white/[0.06] border border-white/[0.08] hover:bg-white/[0.1]"}`}
                title={isRecording ? "Stop" : "Record"}
              >
                {isRecording ? (
                  <div className="w-6 h-6 bg-white rounded-sm animate-pulse" />
                ) : (
                  <Mic className="w-8 h-8 text-white/80" />
                )}
              </button>

              {/* Divider */}
              <div className="w-7 h-px bg-white/[0.06]" />

              {/* Replay */}
              {lastRecordingUrl && (
                <button
                  className="relative w-14 h-14 rounded-2xl flex items-center justify-center text-emerald-400/80 hover:text-emerald-300 hover:bg-emerald-500/10 transition-all duration-300 group"
                  title="Replay"
                >
                  <Play className="w-6 h-6 ml-0.5 group-hover:scale-110 transition-transform" />
                </button>
              )}

              {/* Ghost Mode */}
              <button
                onClick={() => setGhostMode(!ghostMode)}
                className={`relative w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 group ${ghostMode ? "bg-purple-500/15 border border-purple-500/25 text-purple-300" : "text-white/30 hover:text-white/60 hover:bg-white/[0.06]"}`}
                title="Ghost Mode"
              >
                <Ghost className="w-6 h-6 group-hover:scale-110 transition-transform" />
              </button>

              {/* Divider */}
              <div className="w-7 h-px bg-white/[0.06]" />

              {/* Next Sentence */}
              {practiceType === "pronunciation" && (
                <button
                  onClick={handleNextSentence}
                  disabled={curriculumLoading}
                  className="relative w-14 h-14 rounded-2xl flex items-center justify-center text-white/40 hover:text-cyan-300 hover:bg-cyan-500/10 transition-all duration-300 group disabled:opacity-30"
                  title="Next Sentence"
                >
                  <SkipForward className="w-6 h-6 group-hover:scale-110 transition-transform" />
                </button>
              )}
            </div>
          </>
        )}

        {/* ==================== SPEAKING MODE ==================== */}
        {mode === "speaking" && (
          <>
            {/* Timer & test controls */}
            {testState.status !== "idle" && testState.currentPart && (
              <div className="absolute inset-0 z-[60] flex flex-col justify-end pb-32 items-center animate-fade-in pointer-events-none">
                <div className="flex flex-col items-center pointer-events-auto">
                  <div className="mb-2 text-cyan-400 text-xs font-bold uppercase tracking-[0.2em] bg-black/50 px-3 py-1 rounded-full border border-white/10">
                    {partLabel(testState.currentPart)}
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <div
                      className={`font-black drop-shadow-2xl transition-all duration-500 ${testState.currentPart === "part2_prep" ? "text-amber-400" : "text-red-500"} ${testState.currentPart === "part2_speak" ? "text-4xl" : "text-6xl"}`}
                    >
                      {Math.floor(testState.timeLeft / 60)}:{(testState.timeLeft % 60).toString().padStart(2, "0")}
                    </div>
                  </div>
                  {testState.currentPart === "part2_prep" && (
                    <button
                      onClick={skipPrep}
                      className="mt-4 px-6 py-2 bg-white/10 border border-white/20 rounded-full text-xs font-bold uppercase tracking-widest hover:bg-white/20 transition-colors"
                    >
                      I'm Ready / Start Speaking
                    </button>
                  )}
                  {testState.status === "paused_boundary" && (
                    <button
                      onClick={advanceTest}
                      className="mt-4 px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl font-bold uppercase tracking-widest text-white shadow-lg hover:scale-105 transition-transform animate-fade-in"
                    >
                      {testState.currentPartIndex < testState.queue.length - 1 ? "Start Next Part" : "Finish Test"}
                    </button>
                  )}
                </div>
                {testState.currentPart?.startsWith("part2") && <CueCard topic={PART2_TOPIC} />}
                {testState.currentPart?.startsWith("part2") && <FreehandNotePad />}
              </div>
            )}

            {/* Chat panels */}
            <div className="absolute bottom-28 left-6 w-[260px] max-h-[200px] bg-white/[0.03] backdrop-blur-[40px] border border-white/10 rounded-2xl overflow-hidden z-[100] shadow-[0_0_30px_-5px_rgba(74,222,128,0.3)]">
              <div className="p-3 border-b border-white/10 bg-white/5 flex items-center gap-2">
                <Mic className="w-4 h-4 text-green-300" />
                <span className="text-xs font-bold uppercase tracking-widest text-white/80">{persona}</span>
              </div>
              <div className="overflow-y-auto p-3 text-sm space-y-2 max-h-[140px] scrollbar-hide">
                {messages
                  .filter((m) => m.role === "teacher")
                  .map((m, i) => (
                    <div key={i} className={`p-3 rounded-xl rounded-tl-none mb-1 border ${getPersonaBubbleStyle(persona)}`}>
                      {m.text}
                    </div>
                  ))}
                {isAiThinking && (
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
                {messages
                  .filter((m) => m.role === "student")
                  .map((m, i) => (
                    <div key={i} className="bg-purple-500/20 p-3 rounded-xl rounded-tr-none mb-1 border border-purple-500/20 text-right text-purple-100">
                      {m.text}
                    </div>
                  ))}
              </div>
            </div>

            {/* Bottom action bar */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[310] flex items-center gap-4 p-2 rounded-full bg-black/40 backdrop-blur-xl border border-white/10">
              <button
                onClick={handleRecord}
                className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 ${isRecording ? "bg-red-500 shadow-[0_0_40px_rgba(239,68,68,0.6)] scale-110" : "bg-white/10 border border-white/20 hover:bg-white/20"}`}
              >
                {isRecording ? (
                  <div className="w-6 h-6 bg-white rounded animate-pulse" />
                ) : (
                  <Mic className="w-10 h-10 text-white" />
                )}
              </button>
              {(testState.currentPart === "part1" || testState.currentPart === "part3") && isRecording && (
                <button
                  onClick={handleNextQuestion}
                  className="p-3 rounded-full bg-cyan-600 hover:bg-cyan-500 text-white transition-colors shadow-lg"
                  title="Next Question"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              )}
            </div>
          </>
        )}

        {/* Modals */}
        {showTestConfig && <ExaminerConfig onClose={() => setShowTestConfig(false)} onStartTest={initiateCountdown} />}
        {showSaveModal && (
          <SaveSessionModal
            isPartial={true}
            onSave={() => {
              addXP(50);
              setShowSaveModal(false);
              setTestState({ status: "idle", queue: [], currentPartIndex: -1, currentPart: null, timeLeft: 0, elapsedInCurrent: 0 });
            }}
            onDiscard={() => {
              setShowSaveModal(false);
              setTestState({ status: "idle", queue: [], currentPartIndex: -1, currentPart: null, timeLeft: 0, elapsedInCurrent: 0 });
            }}
          />
        )}
        {countdown !== null && <CountdownOverlay count={countdown} />}
      </div>
    </PageShell>
  );
}
