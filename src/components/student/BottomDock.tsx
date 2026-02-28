import { BookOpen, Calendar, BarChart3, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface BottomDockProps {
  setShowHomeworkModal: (show: boolean) => void;
  setCalendarOpen: (open: boolean) => void;
  onSettings: () => void;
}

export default function BottomDock({ setShowHomeworkModal, setCalendarOpen, onSettings }: BottomDockProps) {
  const navigate = useNavigate();

  return (
    <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-30 w-full max-w-[400px] flex justify-center">
      <div className="bg-black/80 backdrop-blur-2xl border border-white/10 rounded-full px-8 py-3 flex items-center justify-between gap-8 shadow-2xl hover:border-white/20 transition-colors">
        <button onClick={() => setShowHomeworkModal(true)} className="text-gray-400 hover:text-white flex flex-col items-center gap-1 group">
          <div className="relative">
            <BookOpen className="w-5 h-5 text-blue-400 group-hover:-translate-y-1 transition-transform" />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-[0_0_5px_red]" />
          </div>
          <span className="text-[9px] uppercase font-bold text-white group-hover:text-blue-200">Homework</span>
        </button>
        <button onClick={() => setCalendarOpen(true)} className="text-gray-400 hover:text-white flex flex-col items-center gap-1 group">
          <Calendar className="w-5 h-5 group-hover:-translate-y-1 transition-transform text-purple-400" />
          <span className="text-[9px] uppercase font-bold group-hover:text-purple-200">Schedule</span>
        </button>
        <button onClick={() => navigate("/analysis")} className="text-gray-400 hover:text-white flex flex-col items-center gap-1 group">
          <BarChart3 className="w-5 h-5 group-hover:-translate-y-1 transition-transform text-cyan-400" />
          <span className="text-[9px] uppercase font-bold group-hover:text-cyan-200">Analysis</span>
        </button>
        <button onClick={onSettings} className="text-gray-400 hover:text-white flex flex-col items-center gap-1 group">
          <Settings className="w-5 h-5 group-hover:rotate-90 transition-transform duration-500" />
          <span className="text-[9px] uppercase font-bold">Settings</span>
        </button>
      </div>
    </div>
  );
}
