import { BookOpen, Calendar, BarChart3, User, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface BottomDockProps {
  setShowHomeworkModal: (show: boolean) => void;
  setCalendarOpen: (open: boolean) => void;
  onSignOut: () => void;
  hasHomework?: boolean;
}

export default function BottomDock({ setShowHomeworkModal, setCalendarOpen, onSignOut, hasHomework = false }: BottomDockProps) {
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await onSignOut();
    navigate("/", { replace: true });
  };

  return (
    <div role="navigation" aria-label="Main navigation" className="absolute bottom-4 md:bottom-6 left-1/2 transform -translate-x-1/2 z-30 w-[calc(100%-2rem)] max-w-[480px] flex justify-center">
      <div className="bg-black/80 backdrop-blur-2xl border border-white/10 rounded-full px-4 md:px-6 py-3 flex items-center justify-between gap-3 md:gap-6 shadow-2xl hover:border-white/20 transition-colors">
        <button onClick={() => setShowHomeworkModal(true)} aria-label="Homework" className="min-h-[44px] min-w-[44px] text-gray-400 hover:text-white flex flex-col items-center gap-1 group">
          <div className="relative">
            <BookOpen className="w-5 h-5 text-blue-400 group-hover:-translate-y-1 transition-transform" />
            {hasHomework && <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-[0_0_5px_red]" />}
          </div>
          <span className="text-[9px] uppercase font-bold text-white group-hover:text-blue-200">Homework</span>
        </button>
        <button onClick={() => setCalendarOpen(true)} aria-label="Schedule" className="min-h-[44px] min-w-[44px] text-gray-400 hover:text-white flex flex-col items-center gap-1 group">
          <Calendar className="w-5 h-5 group-hover:-translate-y-1 transition-transform text-purple-400" />
          <span className="text-[9px] uppercase font-bold group-hover:text-purple-200">Schedule</span>
        </button>
        <button onClick={() => navigate("/analysis")} aria-label="Analysis" className="min-h-[44px] min-w-[44px] text-gray-400 hover:text-white flex flex-col items-center gap-1 group">
          <BarChart3 className="w-5 h-5 group-hover:-translate-y-1 transition-transform text-cyan-400" />
          <span className="text-[9px] uppercase font-bold group-hover:text-cyan-200">Analysis</span>
        </button>
        <button onClick={() => navigate("/profile")} aria-label="Profile" className="min-h-[44px] min-w-[44px] text-gray-400 hover:text-white flex flex-col items-center gap-1 group">
          <User className="w-5 h-5 group-hover:-translate-y-1 transition-transform text-white/50" />
          <span className="text-[9px] uppercase font-bold group-hover:text-white/80">Profile</span>
        </button>
        <button onClick={handleSignOut} aria-label="Sign Out" className="min-h-[44px] min-w-[44px] text-gray-400 hover:text-red-400 flex flex-col items-center gap-1 group">
          <LogOut className="w-5 h-5 group-hover:-translate-y-1 transition-transform text-gray-500" />
          <span className="text-[9px] uppercase font-bold group-hover:text-red-300">Sign Out</span>
        </button>
      </div>
    </div>
  );
}
