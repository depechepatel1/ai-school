import { useState, forwardRef } from "react";
import { useNavigate } from "react-router-dom";
import { Mic, Eye, Headphones, PenTool, Book, FileText, Check } from "lucide-react";

interface SatelliteWidgetProps {
  onNavigate: (section: string) => void;
  speakingProgress?: number;
}

const SatelliteWidget = forwardRef<HTMLDivElement, SatelliteWidgetProps>(({ onNavigate, speakingProgress = 0 }, ref) => {
  const navigate = useNavigate();
  const nodes = [
    { label: "READING", icon: Eye, color: "blue" as const, progress: 60 },
    { label: "LISTENING", icon: Headphones, color: "teal" as const, progress: 100 },
    { label: "WRITING", icon: PenTool, color: "pink" as const, progress: 30 },
    { label: "VOCAB", icon: Book, color: "orange" as const, progress: 50 },
    { label: "GRAMMAR", icon: FileText, color: "green" as const, progress: 0 },
  ];

  const getPosition = (index: number, total: number) => {
    const radius = 100;
    const angleStep = (2 * Math.PI) / total;
    const angle = index * angleStep - Math.PI / 2;
    return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
  };

  const centerProgress = speakingProgress;
  const centerR = 54;
  const centerCirc = 2 * Math.PI * centerR;
  const centerDashOffset = centerCirc - (centerProgress / 100) * centerCirc;

  const colorMap = {
    blue: { border: "border-sky-500/50 bg-sky-900/40 group-hover:bg-sky-500 group-hover:border-sky-200", glow: "bg-sky-500", ring: "#0ea5e9" },
    teal: { border: "border-teal-500/50 bg-teal-900/40 group-hover:bg-teal-500 group-hover:border-teal-200", glow: "bg-teal-400", ring: "#14b8a6" },
    pink: { border: "border-pink-500/50 bg-pink-900/40 group-hover:bg-pink-500 group-hover:border-pink-200", glow: "bg-pink-500", ring: "#ec4899" },
    orange: { border: "border-orange-500/50 bg-orange-900/40 group-hover:bg-orange-500 group-hover:border-orange-200", glow: "bg-orange-500", ring: "#f97316" },
    green: { border: "border-green-500/50 bg-green-900/40 group-hover:bg-green-500 group-hover:border-green-200", glow: "bg-green-500", ring: "#22c55e" },
  };

  return (
    <div className="relative w-80 h-80 flex items-center justify-center overflow-visible">
      {/* Background Animations */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
        <div className="absolute w-[300px] h-[300px] border border-teal-400/20 animate-spin" style={{ borderRadius: '40% 60% 70% 30% / 40% 50% 60% 50%', animationDuration: '20s' }} />
        <div className="absolute w-[280px] h-[280px] border border-cyan-400/20 animate-spin" style={{ borderRadius: '60% 40% 30% 70% / 60% 30% 70% 40%', animationDuration: '15s', animationDirection: 'reverse' }} />
        <div className="absolute w-[260px] h-[260px] border border-purple-400/20 animate-spin" style={{ borderRadius: '30% 70% 70% 30% / 30% 30% 70% 70%', animationDuration: '25s' }} />

        {Array.from({ length: 30 }).map((_, i) => {
          const angle = Math.random() * 360;
          const offsetX = (Math.random() - 0.5) * 20;
          const offsetY = (Math.random() - 0.5) * 20;
          const duration = 4 + Math.random() * 4;
          const delay = Math.random() * 5;
          const size = 2 + Math.random() * 3;
          const colors = ['#22d3ee', '#c084fc', '#f472b6', '#60a5fa', '#ffffff'];
          const color = colors[Math.floor(Math.random() * colors.length)];
          return (
            <div key={i} className="absolute top-1/2 left-1/2 w-0 h-0" style={{ transform: `translate(${offsetX}px, ${offsetY}px) rotate(${angle}deg)` }}>
              <div className="rounded-full blur-[1px]" style={{ width: `${size}px`, height: `${size}px`, backgroundColor: color, boxShadow: `0 0 8px ${color}`, animation: `ethericDrift ${duration}s ease-out infinite`, animationDelay: `${delay}s`, opacity: 0 }} />
            </div>
          );
        })}
      </div>

      {/* Central Hub */}
      <div className="relative z-30 flex items-center justify-center">
        <svg className="absolute w-[120px] h-[120px] -rotate-90 pointer-events-none overflow-visible z-20">
          <circle cx="50%" cy="50%" r={centerR} fill="none" stroke="#115e59" strokeWidth="4" strokeOpacity="0.3" />
          <circle cx="50%" cy="50%" r={centerR} fill="none" stroke="#14b8a6" strokeWidth="4" strokeDasharray={centerCirc} strokeDashoffset={centerDashOffset} strokeLinecap="round" className="drop-shadow-[0_0_8px_rgba(20,184,166,0.8)]" />
        </svg>
        <div onClick={() => navigate("/student")} className="relative w-24 h-24 rounded-full bg-gradient-to-br from-teal-600 to-cyan-600 flex flex-col items-center justify-center shadow-[0_0_60px_rgba(20,184,166,0.6)] border-2 border-white/20 group transition-all hover:scale-105 active:scale-95 cursor-pointer z-30 hover:shadow-[0_0_80px_rgba(20,184,166,1)]">
          <div className="absolute -inset-4 rounded-full bg-teal-500/20 animate-ping" style={{ animationDuration: '3s' }} />
          <div className="absolute -inset-1 rounded-full bg-gradient-to-tr from-white/20 to-transparent blur-md animate-pulse" />
          <Mic className="relative z-10 w-8 h-8 text-white drop-shadow-md group-hover:scale-110 transition-transform" />
          <span className="relative z-10 text-[10px] font-bold text-white uppercase tracking-widest mt-1">Speak</span>
        </div>
      </div>

      {/* Satellite Nodes */}
      {nodes.map((node, index) => {
        const { x, y } = getPosition(index, nodes.length);
        const cm = colorMap[node.color];
        const r = 26;
        const circ = 2 * Math.PI * r;
        const strokeDashoffset = circ - (node.progress / 100) * circ;
        return (
          <button key={index} style={{ transform: `translate(${x}px, ${y}px)`, zIndex: 40 }} onClick={() => onNavigate(node.label.toLowerCase())} className={`absolute w-16 h-16 rounded-full border-2 flex flex-col items-center justify-center group transition-all duration-300 ${cm.border}`}>
            <div className={`absolute inset-0 rounded-full ${cm.glow} opacity-0 blur-xl group-hover:opacity-60 group-hover:scale-150 transition-all duration-500 -z-10`} />
            <svg className="absolute -inset-[2px] w-[calc(100%+4px)] h-[calc(100%+4px)] -rotate-90 pointer-events-none overflow-visible z-20">
              <circle cx="50%" cy="50%" r={r} fill="none" stroke={cm.ring} strokeWidth="3" strokeDasharray={circ} strokeDashoffset={strokeDashoffset} strokeLinecap="round" className="opacity-100 drop-shadow-[0_0_2px_rgba(255,255,255,0.3)] transition-all duration-1000 ease-out" />
            </svg>
            {node.progress === 100 && (
              <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shadow-lg border-2 border-gray-900 animate-bounce z-50">
                <Check className="w-3.5 h-3.5 text-white stroke-[4]" />
              </div>
            )}
            <node.icon className="w-5 h-5 text-gray-300 group-hover:text-white group-hover:scale-110 transition-all duration-300 relative z-30" />
            <span className="text-[10px] text-gray-400 group-hover:text-white font-bold mt-1 uppercase text-outline tracking-wide relative z-30 transition-colors">{node.label}</span>
          </button>
        );
      })}
    </div>
  );
});

export default SatelliteWidget;
