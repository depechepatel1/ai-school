import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ChevronDown, AlertCircle, ChevronRight, AlertTriangle, Zap, Check,
  Book, PenTool, Headphones, Edit, CloudDownload, AudioWaveform, MessageSquare,
} from "lucide-react";
import { usePrefetchProps } from "@/hooks/usePrefetch";
import { useAnalyticsData } from "@/hooks/useAnalyticsData";
import { useAuth } from "@/lib/auth";
import StudentMessagesTab from "./StudentMessagesTab";

interface LeftPillarProps {
  onShowSkills: () => void;
  showSkills: boolean;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  handleEmailClick: (subject: string, body: string) => void;
  setTeacherHint: (hint: string | null) => void;
  courseType: "ielts" | "igcse" | null;
  courseLoading: boolean;
}

/* ── tiny progress ring (SVG) ── */
function ProgressRing({ done, total, size = 32 }: { done: number; total: number; size?: number }) {
  const r = (size - 4) / 2;
  const circ = 2 * Math.PI * r;
  const pct = total > 0 ? done / total : 0;
  return (
    <svg width={size} height={size} className="shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--border))" strokeWidth={2.5} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke="url(#prog-grad)" strokeWidth={2.5}
        strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        className="transition-all duration-700"
      />
      <defs>
        <linearGradient id="prog-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="hsl(174 84% 40%)" />
          <stop offset="100%" stopColor="hsl(172 72% 50%)" />
        </linearGradient>
      </defs>
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" className="fill-white/70 text-[10px] font-bold font-outfit">
        {done}/{total}
      </text>
    </svg>
  );
}

/* ── section divider with centered label chip ── */
function SectionDivider({ label }: { label: string }) {
  return (
    <div className="relative flex items-center py-1">
      <div className="flex-1 h-px bg-white/[0.06]" />
      <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.15em] text-white/35 bg-black/40 rounded-full">
        {label}
      </span>
      <div className="flex-1 h-px bg-white/[0.06]" />
    </div>
  );
}

/* ── micro progress bar ── */
function MicroProgress({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="h-[2px] w-full rounded-full overflow-hidden mt-2" style={{ background: 'hsl(0 0% 100% / 0.04)' }}>
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  );
}

export default function LeftPillar({ onShowSkills, showSkills, activeTab, setActiveTab, handleEmailClick, setTeacherHint, courseType, courseLoading }: LeftPillarProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: analytics } = useAnalyticsData(user?.id ?? null, courseType, "weekly");
  const pronPct = analytics ? Math.round(analytics.pronunciation.pct * 100) : 0;
  const fluPct = analytics ? Math.round(analytics.shadowing.pct * 100) : 0;
  const speakPct = analytics ? Math.round(analytics.speaking.pct * 100) : 0;
  return (
    <div className="absolute top-0 left-0 bottom-24 w-[280px] p-6 flex flex-col gap-4 z-20">
      {/* Profile Card */}
      <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl p-4 flex items-center gap-4 shadow-lg cursor-pointer hover:bg-black/60 transition-all relative z-50" onClick={onShowSkills}>
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-teal-400 to-cyan-500 p-[2px] flex-shrink-0">
          <div className="w-full h-full rounded-full bg-gradient-to-br from-teal-600 to-cyan-700 flex items-center justify-center text-white text-xl font-bold">
            雪
          </div>
        </div>
        <div>
          <div className="font-sans text-lg leading-tight text-white" style={{ textShadow: '0 0 10px rgba(255,255,255,0.5)' }}>李雪 (Lǐ Xuě)</div>
          <div className="text-sm font-bold text-teal-100">Snow Li</div>
          <div className="text-sm text-teal-200 flex items-center gap-1 mt-1 bg-teal-500/20 px-2 py-0.5 rounded-full w-fit">
            Band 6.5 <ChevronDown className="w-3 h-3" />
          </div>
        </div>
        {showSkills && (
          <div className="absolute top-full left-0 w-full mt-2 bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl p-4 text-xs shadow-2xl animate-fade-in-up ring-1 ring-white/10">
            <h4 className="text-gray-400 uppercase tracking-widest text-[10px] mb-2 font-bold border-b border-gray-700 pb-1">IELTS Breakdown</h4>
            <div className="space-y-2">
              <div className="flex justify-between items-center"><span className="text-gray-300">Speaking</span><span className="font-mono font-bold text-green-400 bg-green-400/10 px-1.5 rounded">6.0</span></div>
              <div className="flex justify-between items-center"><span className="text-gray-300">Writing</span><span className="font-mono font-bold text-green-400 bg-green-400/10 px-1.5 rounded">6.5</span></div>
              <div className="flex justify-between items-center"><span className="text-gray-300">Reading</span><span className="font-mono font-bold text-yellow-400 bg-yellow-400/10 px-1.5 rounded">6.0</span></div>
              <div className="flex justify-between items-center"><span className="text-gray-300">Listening</span><span className="font-mono font-bold text-green-400 bg-green-400/10 px-1.5 rounded">7.0</span></div>
            </div>
          </div>
        )}
      </div>

      {/* Course Banner */}
      {courseType && (
        <div className="flex items-center justify-center">
          <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-[0.15em] border ${
            courseType === "ielts"
              ? "bg-teal-500/15 border-teal-400/25 text-teal-300"
              : "bg-amber-500/15 border-amber-400/25 text-amber-300"
          }`}>
            {courseType === "ielts" ? "IELTS" : "IGCSE"} Course
          </span>
        </div>
      )}

      {/* Practice Mode Buttons */}
      {courseType && (
        <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl p-3 shadow-lg">
          <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/30 block text-center mb-2.5">Practice Modes</span>
          <div className="grid grid-cols-3 gap-2">
            {[
              { key: "pronunciation", label: "Pronun.", icon: Headphones, color: "#0ea5e9", bgClass: "bg-sky-500/15 border-sky-400/25", hoverClass: "hover:bg-sky-500/25 hover:border-sky-400/40", progress: pronPct },
              { key: "fluency", label: "Fluency", icon: AudioWaveform, color: "#8b5cf6", bgClass: "bg-violet-500/15 border-violet-400/25", hoverClass: "hover:bg-violet-500/25 hover:border-violet-400/40", progress: fluPct },
              { key: "speaking", label: "Speak", icon: MessageSquare, color: "#f59e0b", bgClass: "bg-amber-500/15 border-amber-400/25", hoverClass: "hover:bg-amber-500/25 hover:border-amber-400/40", progress: speakPct },
            ].map((mode) => {
              const Icon = mode.icon;
              const prefix = courseType === "ielts" ? "/ielts" : "/igcse";
              const r = 28;
              const circ = 2 * Math.PI * r;
              const dashOffset = circ - (mode.progress / 100) * circ;
              return (
                <button
                  key={mode.key}
                  onClick={() => navigate(`${prefix}/${mode.key}`)}
                  className={`relative flex flex-col items-center justify-center gap-1.5 py-3 rounded-2xl border transition-all duration-200 active:scale-95 group ${mode.bgClass} ${mode.hoverClass}`}
                >
                  {/* Circular progress ring overlaid */}
                  <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible" viewBox="0 0 70 80">
                    <circle cx="35" cy="36" r={r} fill="none" stroke={mode.color} strokeOpacity="0.15" strokeWidth="2.5" />
                    <circle cx="35" cy="36" r={r} fill="none" stroke={mode.color} strokeWidth="2.5" strokeDasharray={circ} strokeDashoffset={dashOffset} strokeLinecap="round" className="drop-shadow-[0_0_4px_rgba(255,255,255,0.2)] transition-all duration-1000 ease-out" transform="rotate(-90 35 36)" />
                  </svg>
                  {/* Completion tick */}
                  {mode.progress >= 100 && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center shadow-lg border-2 border-black/50 animate-bounce z-50">
                      <Check className="w-3 h-3 text-white stroke-[3]" />
                    </div>
                  )}
                  <Icon className="w-5 h-5 text-white/70 group-hover:text-white group-hover:scale-110 transition-all relative z-10" />
                  <span className="text-[9px] font-bold text-white/50 group-hover:text-white/80 uppercase tracking-wider relative z-10">{mode.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Tasks / Messages Panel */}
      <div className="flex-1 bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl p-4 shadow-lg flex flex-col gap-2 overflow-hidden min-h-0 z-10">
        {/* ── Sliding pill tab bar ── */}
        <div className="relative flex bg-white/[0.04] rounded-full p-0.5 mb-1">
          {/* sliding pill */}
          <div
            className="absolute top-0.5 bottom-0.5 w-1/2 rounded-full bg-white/10 transition-transform duration-300 ease-out will-change-transform"
            style={{ transform: activeTab === 'tasks' ? 'translateX(0)' : 'translateX(100%)' }}
          />
          <button
            onClick={() => setActiveTab('tasks')}
            className={`relative z-10 flex-1 text-[11px] font-bold text-center py-1.5 rounded-full transition-colors duration-200 ${activeTab === 'tasks' ? 'text-white' : 'text-white/35'}`}
          >
            Tasks
          </button>
          <button
            onClick={() => setActiveTab('messages')}
            className={`relative z-10 flex-1 text-[11px] font-bold text-center py-1.5 rounded-full transition-colors duration-200 ${activeTab === 'messages' ? 'text-white' : 'text-white/35'}`}
          >
            Messages
          </button>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-hide p-1 space-y-3">
          {activeTab === 'tasks' ? (
            <>

              {/* Daily Routine */}
              <SectionDivider label="Daily Routine" />
              {[
                { icon: AlertTriangle, label: "Mistake Book", sub: "3 Recurring Errors", accent: "hsl(0 72% 51% / 0.5)", pct: 30, hint: "Let's fix those persistent grammar errors together.", iconBg: "bg-destructive/20", iconColor: "text-red-300", delay: 50 },
                { icon: Zap, label: "Daily Idiom", sub: '"Burning The Midnight Oil"', accent: "hsl(280 80% 50% / 0.5)", pct: 0, hint: null, iconBg: "bg-purple-500/20", iconColor: "text-purple-300", delay: 100 },
                { icon: Check, label: "Vocabulary", sub: "Quiz: Environment", accent: "hsl(174 84% 40% / 0.5)", pct: 60, hint: null, iconBg: "bg-primary/20", iconColor: "text-accent-foreground", delay: 150 },
              ].map((item, i) => (
                <div
                  key={i}
                  className="bg-white/[0.03] border border-white/[0.06] p-3 rounded-2xl hover:bg-white/[0.06] transition-all cursor-pointer group animate-fade-in-up"
                  style={{ animationDelay: `${item.delay}ms` }}
                  onMouseEnter={() => item.hint && setTeacherHint(item.hint)}
                  onMouseLeave={() => item.hint && setTeacherHint(null)}
                >
                  <div className="flex items-center gap-3">
                    <div className={`${item.iconBg} p-2 rounded-lg`}><item.icon className={`w-4 h-4 ${item.iconColor}`} /></div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-white">{item.label}</div>
                      <div className="text-[10px] text-white/40 truncate">{item.sub}</div>
                    </div>
                  </div>
                  {item.pct > 0 && <MicroProgress pct={item.pct} color={item.accent} />}
                </div>
              ))}

              {/* Upcoming */}
              <SectionDivider label="Upcoming" />
              {[
                { icon: Book, label: "Reading", sub: "Passage 3 (Due Tmr)", accent: "hsl(174 84% 40% / 0.4)", pct: 0, hint: null, iconBg: "bg-teal-500/20", iconColor: "text-teal-300", extra: <CloudDownload className="w-3.5 h-3.5 text-green-400 opacity-40 group-hover:opacity-100 transition-opacity" />, delay: 200 },
                { icon: PenTool, label: "Grammar", sub: "Present Perfect Tense", accent: "hsl(140 60% 40% / 0.4)", pct: 20, hint: "Past tense can be tricky. Want a quick review?", iconBg: "bg-green-500/20", iconColor: "text-green-300", extra: null, delay: 250 },
                { icon: Headphones, label: "Listening", sub: "Part 3 Practice", accent: "hsl(170 60% 40% / 0.4)", pct: 0, hint: null, iconBg: "bg-teal-500/20", iconColor: "text-teal-300", extra: null, delay: 300 },
                { icon: Edit, label: "Writing", sub: "Task 2 Outline", accent: "hsl(330 70% 50% / 0.4)", pct: 0, hint: "Need help brainstorming ideas for writing?", iconBg: "bg-pink-500/20", iconColor: "text-pink-300", extra: null, delay: 350 },
              ].map((item, i) => (
                <div
                  key={i}
                  className="bg-white/[0.03] border border-white/[0.06] p-3 rounded-2xl hover:bg-white/[0.06] transition-all cursor-pointer group animate-fade-in-up"
                  style={{ animationDelay: `${item.delay}ms` }}
                  onMouseEnter={() => item.hint && setTeacherHint(item.hint)}
                  onMouseLeave={() => item.hint && setTeacherHint(null)}
                >
                  <div className="flex items-center gap-3">
                    <div className={`${item.iconBg} p-2 rounded-lg`}><item.icon className={`w-4 h-4 ${item.iconColor}`} /></div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-white">{item.label}</div>
                      <div className="text-[10px] text-white/40 truncate">{item.sub}</div>
                    </div>
                    {item.extra}
                  </div>
                  {item.pct > 0 && <MicroProgress pct={item.pct} color={item.accent} />}
                </div>
              ))}
            </>
          ) : (
            <StudentMessagesTab />
          )}
        </div>
      </div>
    </div>
  );
}
