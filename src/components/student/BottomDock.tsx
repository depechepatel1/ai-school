import { forwardRef } from "react";
import { BookOpen, Calendar, BarChart3, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { usePrefetchProps } from "@/hooks/usePrefetch";

interface BottomDockProps {
  setShowHomeworkModal: (show: boolean) => void;
  setCalendarOpen: (open: boolean) => void;
  onSettings: () => void;
}

const BottomDock = forwardRef<HTMLDivElement, BottomDockProps>(({ setShowHomeworkModal, setCalendarOpen, onSettings }, ref) => {
  const navigate = useNavigate();
  const analysisPrefetch = usePrefetchProps("/analysis");
  const profilePrefetch = usePrefetchProps("/profile");

  return (
    <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-30 w-full max-w-[400px] flex justify-center">
      <div className="bg-background/80 backdrop-blur-2xl border border-border rounded-full px-8 py-3 flex items-center justify-between gap-8 shadow-2xl hover:border-border/80 transition-all">
        <button onClick={() => setShowHomeworkModal(true)} className="text-muted-foreground hover:text-foreground flex flex-col items-center gap-1 group transition-all">
          <div className="relative">
            <BookOpen className="w-5 h-5 text-primary group-hover:-translate-y-1 transition-transform" />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-destructive rounded-full shadow-[0_0_4px_hsl(var(--destructive)/0.5)]" />
          </div>
          <span className="text-[10px] uppercase font-bold text-foreground group-hover:text-accent-foreground">Homework</span>
        </button>
        <div className="w-px h-5 bg-border" />
        <button onClick={() => setCalendarOpen(true)} className="text-muted-foreground hover:text-foreground flex flex-col items-center gap-1 group transition-all">
          <Calendar className="w-5 h-5 group-hover:-translate-y-1 transition-transform text-purple-400" />
          <span className="text-[10px] uppercase font-bold group-hover:text-purple-200">Schedule</span>
        </button>
        <div className="w-px h-5 bg-border" />
        <button {...analysisPrefetch} onClick={() => navigate("/analysis")} className="text-muted-foreground hover:text-foreground flex flex-col items-center gap-1 group transition-all">
          <BarChart3 className="w-5 h-5 group-hover:-translate-y-1 transition-transform text-cyan-400" />
          <span className="text-[10px] uppercase font-bold group-hover:text-cyan-200">Analysis</span>
        </button>
        <button {...profilePrefetch} onClick={() => navigate("/profile")} className="text-muted-foreground hover:text-foreground flex flex-col items-center gap-1 group transition-all">
          <User className="w-5 h-5 group-hover:-translate-y-1 transition-transform text-foreground/50" />
          <span className="text-[10px] uppercase font-bold group-hover:text-foreground/80">Profile</span>
        </button>
      </div>
    </div>
  );
});

export default BottomDock;
