import { useState } from "react";
import {
  ChevronDown, AlertCircle, ChevronRight, AlertTriangle, Zap, Check,
  Book, PenTool, Headphones, Edit, CloudDownload, Mail, FileText,
  Mic, Trophy, Calendar, Star, Video
} from "lucide-react";

interface LeftPillarProps {
  onShowSkills: () => void;
  showSkills: boolean;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  handleEmailClick: (subject: string, body: string) => void;
  setTeacherHint: (hint: string | null) => void;
}

export default function LeftPillar({ onShowSkills, showSkills, activeTab, setActiveTab, handleEmailClick, setTeacherHint }: LeftPillarProps) {
  return (
    <div className="absolute top-0 left-0 bottom-24 w-[280px] p-6 flex flex-col gap-4 z-20">
      {/* Profile Card */}
      <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl p-4 flex items-center gap-4 shadow-lg cursor-pointer hover:bg-black/60 transition-colors relative z-50" onClick={onShowSkills}>
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 p-[2px] flex-shrink-0">
          <div className="w-full h-full rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white text-xl font-bold">
            雪
          </div>
        </div>
        <div>
          <div className="font-sans text-lg leading-tight text-white" style={{ textShadow: '0 0 10px rgba(255,255,255,0.5)' }}>李雪 (Lǐ Xuě)</div>
          <div className="text-sm font-bold text-blue-100">Snow Li</div>
          <div className="text-sm text-blue-200 flex items-center gap-1 mt-1 bg-blue-500/20 px-2 py-0.5 rounded-md w-fit">
            Band 6.5 <ChevronDown className="w-3 h-3" />
          </div>
        </div>
        {showSkills && (
          <div className="absolute top-full left-0 w-full mt-2 bg-gray-900 border border-white/20 rounded-xl p-4 text-xs shadow-2xl animate-fade-in-up ring-1 ring-white/10">
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

      {/* Tasks / Messages Panel */}
      <div className="flex-1 bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl p-4 shadow-lg flex flex-col gap-2 overflow-hidden min-h-0 z-10">
        <div className="flex border-b border-white/5 pb-2 mb-0">
          <button onClick={() => setActiveTab('tasks')} className={`flex-1 text-base font-bold text-center transition-colors ${activeTab === 'tasks' ? 'text-white' : 'text-gray-500'}`}>Tasks</button>
          <button onClick={() => setActiveTab('messages')} className={`flex-1 text-base font-bold text-center transition-colors ${activeTab === 'messages' ? 'text-white' : 'text-gray-500'}`}>Messages</button>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-hide p-2 space-y-3">
          {activeTab === 'tasks' ? (
            <>
              {/* Priority Task */}
              <div className="bg-gradient-to-br from-red-900/40 to-red-800/20 border border-red-500/40 p-4 rounded-2xl shadow-[0_0_15px_rgba(239,68,68,0.2)] relative overflow-hidden group hover:border-red-500/60 transition-all">
                <div className="absolute inset-0 bg-red-500/5 animate-pulse pointer-events-none" />
                <div className="flex justify-between items-start mb-0 relative z-10">
                  <div className="flex items-center gap-2 text-red-300 text-xs font-bold uppercase tracking-wider">
                    <AlertCircle className="w-4 h-4" /> First Task
                  </div>
                  <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg shadow-red-500/20">Today</span>
                </div>
                <div className="relative z-10">
                  <h3 className="text-lg font-bold text-white mb-0 leading-tight">Reading:<br /><span className="text-xl">Passage 2</span></h3>
                  <p className="text-xs text-gray-300 mb-3 mt-1">Test 4 • Questions 14–26</p>
                  <button className="w-full py-2 bg-red-600 hover:bg-red-500 text-white text-sm font-bold rounded-lg shadow-lg transition-colors flex items-center justify-center gap-2">
                    Start Segment <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Daily Routine */}
              <div className="space-y-2">
                <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest pl-1">Daily Routine</div>
                <div className="bg-red-900/20 border border-red-500/30 p-3 rounded-xl flex items-center gap-3 hover:bg-red-800/30 transition-colors cursor-pointer"
                  onMouseEnter={() => setTeacherHint("Let's fix those persistent grammar errors together.")}
                  onMouseLeave={() => setTeacherHint(null)}>
                  <div className="bg-red-500/20 p-2 rounded-lg"><AlertTriangle className="w-5 h-5 text-red-300" /></div>
                  <div>
                    <div className="text-sm font-bold text-white">Mistake Book</div>
                    <div className="text-xs text-red-200/70">3 Recurring Errors</div>
                  </div>
                </div>
                <button className="w-full bg-purple-900/20 border border-purple-500/30 p-3 rounded-xl text-left hover:bg-purple-800/30 transition-all group flex items-center gap-3">
                  <div className="bg-purple-500/20 p-2 rounded-lg"><Zap className="w-5 h-5 text-purple-300" /></div>
                  <div>
                    <div className="text-sm font-bold text-white">Daily Idiom</div>
                    <div className="text-xs text-purple-200/70">Quiz: "Burning The Midnight Oil"</div>
                  </div>
                </button>
                <div className="bg-white/5 border border-white/10 p-3 rounded-xl flex items-center gap-3 hover:bg-white/10 transition-colors cursor-pointer">
                  <div className="bg-orange-500/20 p-2 rounded-lg"><Check className="w-5 h-5 text-orange-300" /></div>
                  <div>
                    <div className="text-sm font-bold text-white">Vocabulary</div>
                    <div className="text-xs text-gray-400">Quiz: Environment</div>
                  </div>
                </div>
              </div>

              {/* Upcoming */}
              <div className="space-y-2">
                <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest pl-1">Upcoming</div>
                <div className="bg-white/5 border border-white/10 p-3 rounded-xl flex items-center justify-between hover:bg-white/10 transition-colors cursor-pointer group">
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-500/20 p-2 rounded-lg"><Book className="w-5 h-5 text-blue-300" /></div>
                    <div>
                      <div className="text-sm font-bold text-white">Reading</div>
                      <div className="text-xs text-gray-400">Passage 3 (Due Tmr)</div>
                    </div>
                  </div>
                  <CloudDownload className="w-4 h-4 text-green-400 opacity-50 group-hover:opacity-100" />
                </div>
                <div className="bg-white/5 border border-white/10 p-3 rounded-xl flex items-center gap-3 hover:bg-white/10 transition-colors cursor-pointer"
                  onMouseEnter={() => setTeacherHint("Past tense can be tricky. Want a quick review?")}
                  onMouseLeave={() => setTeacherHint(null)}>
                  <div className="bg-green-500/20 p-2 rounded-lg"><PenTool className="w-5 h-5 text-green-300" /></div>
                  <div>
                    <div className="text-sm font-bold text-white">Grammar</div>
                    <div className="text-xs text-gray-400">Present Perfect Tense</div>
                  </div>
                </div>
                <div className="bg-white/5 border border-white/10 p-3 rounded-xl flex items-center gap-3 hover:bg-white/10 transition-colors cursor-pointer">
                  <div className="bg-teal-500/20 p-2 rounded-lg"><Headphones className="w-5 h-5 text-teal-300" /></div>
                  <div>
                    <div className="text-sm font-bold text-white">Listening</div>
                    <div className="text-xs text-gray-400">Part 3 Practice</div>
                  </div>
                </div>
                <div className="bg-white/5 border border-white/10 p-3 rounded-xl flex items-center gap-3 hover:bg-white/10 transition-colors cursor-pointer"
                  onMouseEnter={() => setTeacherHint("Need help brainstorming ideas for writing?")}
                  onMouseLeave={() => setTeacherHint(null)}>
                  <div className="bg-pink-500/20 p-2 rounded-lg"><Edit className="w-5 h-5 text-pink-300" /></div>
                  <div>
                    <div className="text-sm font-bold text-white">Writing</div>
                    <div className="text-xs text-gray-400">Task 2 Outline</div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-3">
              {[
                { from: "Teacher Li", time: "10:30 AM", subject: "Feedback: Essay Task 2", icon: Mail, color: "pink" },
                { from: "System", time: "Yesterday", subject: "Streak Saved!", icon: Zap, color: "blue" },
                { from: "System", time: "2 days ago", subject: "Weekly Report Ready", icon: FileText, color: "blue" },
                { from: "Teacher Li", time: "3 days ago", subject: "Reminder: Mock Test", icon: AlertCircle, color: "pink" },
                { from: "System", time: "Last Week", subject: "Subscription Renewed", icon: Check, color: "blue" },
                { from: "Teacher Li", time: "Last Week", subject: "New Assignment: Speaking", icon: Mic, color: "pink" },
                { from: "System", time: "Last Week", subject: "Badge Unlocked: Early Bird", icon: Trophy, color: "yellow" },
                { from: "Teacher Li", time: "2 Weeks ago", subject: "Office Hours Update", icon: Calendar, color: "pink" },
                { from: "System", time: "3 Weeks ago", subject: "Welcome to Course 2", icon: Star, color: "yellow" },
                { from: "Teacher Li", time: "1 Month ago", subject: "Introductory Session", icon: Video, color: "pink" },
              ].map((msg, i) => {
                const colorClasses: Record<string, string> = {
                  pink: "text-pink-400 group-hover:text-pink-300",
                  blue: "text-blue-400 group-hover:text-blue-300",
                  yellow: "text-yellow-400 group-hover:text-yellow-300",
                };
                const iconColorClasses: Record<string, string> = {
                  pink: "text-pink-400",
                  blue: "text-blue-400",
                  yellow: "text-yellow-400",
                };
                return (
                  <div key={i} onClick={() => handleEmailClick(msg.subject, "Content placeholder...")} className="bg-white/5 border border-white/10 p-3 rounded-xl hover:bg-white/10 cursor-pointer transition-colors group">
                    <div className="flex justify-between items-start mb-1">
                      <div className="flex items-center gap-2">
                        <msg.icon className={`w-3 h-3 ${iconColorClasses[msg.color]}`} />
                        <span className={`font-bold text-xs ${colorClasses[msg.color]}`}>{msg.from}</span>
                      </div>
                      <span className="text-[9px] text-gray-500">{msg.time}</span>
                    </div>
                    <div className="text-xs text-gray-300 line-clamp-1">{msg.subject}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
