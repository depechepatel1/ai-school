import {
  ChevronDown, AlertCircle, ChevronRight, AlertTriangle, Zap, Check,
  Book, PenTool, Headphones, Edit, CloudDownload,
} from "lucide-react";
import StudentMessagesTab from "./StudentMessagesTab";

interface LeftPillarProps {
  onShowSkills: () => void;
  showSkills: boolean;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  setTeacherHint: (hint: string | null) => void;
  displayName?: string;
  avatarUrl?: string | null;
  inDrawer?: boolean;
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
          <stop offset="0%" stopColor="hsl(24 100% 50%)" />
          <stop offset="100%" stopColor="hsl(0 72% 51%)" />
        </linearGradient>
      </defs>
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" className="fill-white/70 text-[8px] font-bold font-outfit">
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
      <span className="px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.15em] text-white/35 bg-black/40 rounded-full">
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

export default function LeftPillar({
  onShowSkills, showSkills, activeTab, setActiveTab, setTeacherHint,
  displayName = "Student", avatarUrl, inDrawer = false,
}: LeftPillarProps) {
  const initials = displayName.charAt(0).toUpperCase();

  const wrapperClass = inDrawer
    ? "w-full flex flex-col gap-4"
    : "absolute top-0 left-0 bottom-24 w-[280px] p-6 flex flex-col gap-4 z-20";

  return (
    <div className={wrapperClass}>
      {/* Profile Card — dynamic data */}
      <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl p-4 flex items-center gap-4 shadow-lg cursor-pointer hover:bg-black/60 transition-colors relative z-50" onClick={onShowSkills}>
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 p-[2px] flex-shrink-0">
          {avatarUrl ? (
            <img src={avatarUrl} alt={displayName} className="w-full h-full rounded-full object-cover" />
          ) : (
            <div className="w-full h-full rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white text-xl font-bold">
              {initials}
            </div>
          )}
        </div>
        <div className="min-w-0">
          <div className="font-sans text-lg leading-tight text-white truncate" style={{ textShadow: '0 0 10px rgba(255,255,255,0.5)' }}>
            {displayName}
          </div>
          <div className="text-sm text-blue-200 flex items-center gap-1 mt-1 bg-blue-500/20 px-2 py-0.5 rounded-md w-fit">
            Skills <ChevronDown className="w-3 h-3" />
          </div>
        </div>
        {showSkills && (
          <div className="absolute top-full left-0 w-full mt-2 bg-gray-900 border border-white/20 rounded-xl p-4 text-xs shadow-2xl animate-fade-in-up ring-1 ring-white/10">
            <h4 className="text-gray-400 uppercase tracking-widest text-[10px] mb-2 font-bold border-b border-gray-700 pb-1">Practice Skills</h4>
            <div className="space-y-2">
              <div className="flex justify-between items-center"><span className="text-gray-300">Shadowing</span><span className="font-mono font-bold text-cyan-400 bg-cyan-400/10 px-1.5 rounded">—</span></div>
              <div className="flex justify-between items-center"><span className="text-gray-300">Pronunciation</span><span className="font-mono font-bold text-orange-400 bg-orange-400/10 px-1.5 rounded">—</span></div>
              <div className="flex justify-between items-center"><span className="text-gray-300">Speaking</span><span className="font-mono font-bold text-purple-400 bg-purple-400/10 px-1.5 rounded">—</span></div>
            </div>
          </div>
        )}
      </div>

      {/* Tasks / Messages Panel */}
      <div className={`flex-1 bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl p-4 shadow-lg flex flex-col gap-2 overflow-hidden z-10 ${inDrawer ? 'min-h-[400px]' : 'min-h-0'}`}>
        {/* ── Sliding pill tab bar ── */}
        <div className="relative flex bg-white/[0.04] rounded-full p-0.5 mb-1">
          {/* sliding pill */}
          <div
            className="absolute top-0.5 bottom-0.5 w-1/2 rounded-full bg-white/10 transition-transform duration-300 ease-out"
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
              {/* Demo badge */}
              <div className="flex items-center justify-center">
                <span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-400/20 text-[8px] font-bold uppercase tracking-wider text-amber-300/60">
                  Sample Tasks
                </span>
              </div>

              {/* Priority Task – gradient border */}
              <div
                className="relative rounded-2xl p-[1px] overflow-hidden animate-fade-in-up"
                style={{ animationDelay: '0ms', background: 'linear-gradient(135deg, hsl(24 100% 50%), hsl(0 72% 51%), hsl(24 100% 50%))', backgroundSize: '200% 200%' }}
              >
                <div className="animate-gradient-x absolute inset-0" style={{ background: 'inherit', backgroundSize: 'inherit' }} />
                <div className="relative bg-black/80 backdrop-blur-xl rounded-2xl p-4">
                  <div className="flex justify-between items-start mb-1">
                    <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.15em] text-white/50">
                      <AlertCircle className="w-3.5 h-3.5 text-primary" /> Priority
                    </div>
                    <ProgressRing done={3} total={12} size={30} />
                  </div>
                  <h3 className="text-base font-bold text-white mb-0 leading-tight">Reading:<br /><span className="text-lg">Passage 2</span></h3>
                  <p className="text-[10px] text-white/40 mb-3 mt-1">Test 4 · Questions 14–26</p>
                  <button className="w-full py-2 bg-gradient-to-r from-primary to-destructive hover:shadow-[0_0_20px_hsl(24_100%_50%/0.3)] text-primary-foreground text-xs font-bold rounded-lg transition-all duration-300 flex items-center justify-center gap-2">
                    Start Segment <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Daily Routine */}
              <SectionDivider label="Daily Routine" />
              {[
                { icon: AlertTriangle, label: "Mistake Book", sub: "3 Recurring Errors", accent: "hsl(0 72% 51% / 0.5)", pct: 30, hint: "Let's fix those persistent grammar errors together.", iconBg: "bg-destructive/20", iconColor: "text-red-300", delay: 50 },
                { icon: Zap, label: "Daily Idiom", sub: '"Burning The Midnight Oil"', accent: "hsl(280 80% 50% / 0.5)", pct: 0, hint: null, iconBg: "bg-purple-500/20", iconColor: "text-purple-300", delay: 100 },
                { icon: Check, label: "Vocabulary", sub: "Quiz: Environment", accent: "hsl(24 100% 50% / 0.5)", pct: 60, hint: null, iconBg: "bg-primary/20", iconColor: "text-accent-foreground", delay: 150 },
              ].map((item, i) => (
                <div
                  key={i}
                  className="bg-white/[0.03] border border-white/[0.06] p-3 rounded-xl hover:bg-white/[0.06] transition-all cursor-pointer group animate-fade-in-up"
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
                { icon: Book, label: "Reading", sub: "Passage 3 (Due Tmr)", accent: "hsl(210 80% 50% / 0.4)", pct: 0, hint: null, iconBg: "bg-blue-500/20", iconColor: "text-blue-300", extra: <CloudDownload className="w-3.5 h-3.5 text-green-400 opacity-40 group-hover:opacity-100 transition-opacity" />, delay: 200 },
                { icon: PenTool, label: "Grammar", sub: "Present Perfect Tense", accent: "hsl(140 60% 40% / 0.4)", pct: 20, hint: "Past tense can be tricky. Want a quick review?", iconBg: "bg-green-500/20", iconColor: "text-green-300", extra: null, delay: 250 },
                { icon: Headphones, label: "Listening", sub: "Part 3 Practice", accent: "hsl(170 60% 40% / 0.4)", pct: 0, hint: null, iconBg: "bg-teal-500/20", iconColor: "text-teal-300", extra: null, delay: 300 },
                { icon: Edit, label: "Writing", sub: "Task 2 Outline", accent: "hsl(330 70% 50% / 0.4)", pct: 0, hint: "Need help brainstorming ideas for writing?", iconBg: "bg-pink-500/20", iconColor: "text-pink-300", extra: null, delay: 350 },
              ].map((item, i) => (
                <div
                  key={i}
                  className="bg-white/[0.03] border border-white/[0.06] p-3 rounded-xl hover:bg-white/[0.06] transition-all cursor-pointer group animate-fade-in-up"
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
