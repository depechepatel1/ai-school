import { forwardRef } from "react";
import { BookOpen, Calendar, BarChart3, User } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface BottomDockProps {
  setShowHomeworkModal: (show: boolean) => void;
  setCalendarOpen: (open: boolean) => void;
  onSettings: () => void;
}

const BottomDock = forwardRef<HTMLDivElement, BottomDockProps>(({ setShowHomeworkModal, setCalendarOpen, onSettings }, ref) => {
  const navigate = useNavigate();

  return (
    <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-30 w-full max-w-[400px] flex justify-center">
      <div className="bg-black/80 backdrop-blur-2xl border border-white/10 rounded-full px-8 py-3 flex items-center justify-between gap-8 shadow-2xl hover:border-white/20 transition-all">
        <button onClick={() => setShowHomeworkModal(true)} className="text-gray-400 hover:text-white flex flex-col items-center gap-1 group transition-all">
          <div className="relative">
            <BookOpen className="w-5 h-5 text-teal-400 group-hover:-translate-y-1 transition-transform" />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full shadow-[0_0_4px_rgba(239,68,68,0.5)]" />
          </div>
          <span className="text-[10px] uppercase font-bold text-white group-hover:text-teal-200">Homework</span>
        </button>
        <div className="w-px h-5 bg-white/10" />
        <button onClick={() => setCalendarOpen(true)} className="text-gray-400 hover:text-white flex flex-col items-center gap-1 group transition-all">
          <Calendar className="w-5 h-5 group-hover:-translate-y-1 transition-transform text-purple-400" />
          <span className="text-[10px] uppercase font-bold group-hover:text-purple-200">Schedule</span>
        </button>
        <div className="w-px h-5 bg-white/10" />
        <button onClick={() => navigate("/analysis")} className="text-gray-400 hover:text-white flex flex-col items-center gap-1 group transition-all">
          <BarChart3 className="w-5 h-5 group-hover:-translate-y-1 transition-transform text-cyan-400" />
          <span className="text-[10px] uppercase font-bold group-hover:text-cyan-200">Analysis</span>
        </button>
        <button onClick={() => navigate("/profile")} className="text-gray-400 hover:text-white flex flex-col items-center gap-1 group transition-all">
          <User className="w-5 h-5 group-hover:-translate-y-1 transition-transform text-white/50" />
          <span className="text-[10px] uppercase font-bold group-hover:text-white/80">Profile</span>
        </button>
      </div>
    </div>
  );
});

export default BottomDock;
