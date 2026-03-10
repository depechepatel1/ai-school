import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useCourseWeek } from "@/hooks/useCourseWeek";
import { SEMESTER_WEEKS } from "@/lib/semester";
import { motion } from "framer-motion";
import { Calendar, CheckCircle, ArrowRight, FastForward } from "lucide-react";
import PageShell from "@/components/PageShell";

export default function WeekSelection() {
  usePageTitle("Select Week");
  const { user } = useAuth();
  const navigate = useNavigate();
  const courseWeek = useCourseWeek(user?.id ?? null);
  const [picked, setPicked] = useState<number | null>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  const handlePick = (w: number) => {
    setPicked(w);
    setTimeout(() => confirmRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 100);
  };

  // Pre-select last used week once loaded
  useEffect(() => {
    if (!courseWeek.loading && picked === null) {
      setPicked(courseWeek.selectedWeek);
    }
  }, [courseWeek.loading, courseWeek.selectedWeek, picked]);

  const handleConfirm = async () => {
    if (picked === null) return;
    await courseWeek.setSelectedWeek(picked);
    navigate("/student", { replace: true });
  };

  if (courseWeek.loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const courseLabel = courseWeek.courseType === "ielts" ? "IELTS" : courseWeek.courseType === "igcse" ? "IGCSE" : "Course";
  const lastWeek = courseWeek.selectedWeek;

  return (
    <PageShell hideFooter>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex-1 flex flex-col items-center justify-center py-8 px-4 max-w-lg mx-auto w-full"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <span className="inline-block px-3 py-1 rounded-full bg-blue-500/15 border border-blue-400/20 text-[10px] font-bold uppercase tracking-[0.15em] text-blue-300/90 mb-3">
            {courseLabel} Course
          </span>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-200 via-white to-blue-200 leading-tight">
            Select Your Week
          </h1>
          <p className="text-sm text-white/40 mt-2">Choose which week's curriculum to practice</p>
        </div>

        {/* Week Grid */}
        <div className="grid grid-cols-4 sm:grid-cols-5 gap-2.5 w-full mb-8">
          {Array.from({ length: SEMESTER_WEEKS }, (_, i) => i + 1).map((w) => {
            const isSelected = w === picked;
            const isLast = w === lastWeek;

            return (
              <motion.button
                key={w}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => handlePick(w)}
                className={`
                  relative flex flex-col items-center justify-center py-3.5 rounded-xl border transition-all duration-200
                  ${isSelected
                    ? "bg-blue-600/30 border-blue-400/50 shadow-[0_0_20px_rgba(59,130,246,0.25)] ring-1 ring-blue-400/30"
                    : "bg-white/[0.03] border-white/[0.08] hover:bg-white/[0.06] hover:border-white/[0.15]"
                  }
                `}
              >
                <span className={`text-lg font-bold tabular-nums ${isSelected ? "text-blue-200" : "text-white/70"}`}>
                  {w}
                </span>
                <span className={`text-[8px] font-semibold uppercase tracking-wider mt-0.5 ${isSelected ? "text-blue-300/80" : "text-white/30"}`}>
                  Week
                </span>
                {isLast && !isSelected && (
                  <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full bg-amber-500/80 flex items-center justify-center">
                    <CheckCircle className="w-2.5 h-2.5 text-white" />
                  </span>
                )}
                {isSelected && (
                  <motion.div
                    layoutId="week-ring"
                    className="absolute inset-0 rounded-xl border-2 border-blue-400/60 pointer-events-none"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Last session indicator + skip link */}
        {lastWeek > 0 && (
          <div className="flex flex-col items-center gap-2 mb-6">
            <p className="text-[11px] text-white/40 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
              Last session: Week {lastWeek}
            </p>
            <button
              onClick={() => navigate("/student", { replace: true })}
              className="flex items-center gap-1.5 text-[11px] font-semibold text-blue-400/70 hover:text-blue-300 transition-colors"
            >
              <FastForward className="w-3 h-3" />
              Continue Week {lastWeek}
            </button>
          </div>
        )}

        {/* Confirm Button */}
        <motion.button
          ref={confirmRef}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleConfirm}
          disabled={picked === null}
          className="w-full max-w-xs h-12 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white text-sm font-bold flex items-center justify-center gap-2.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_30px_rgba(37,99,235,0.25)] hover:shadow-[0_0_40px_rgba(37,99,235,0.4)]"
        >
          <Calendar className="w-4 h-4" />
          Start Week {picked}
          <ArrowRight className="w-4 h-4" />
        </motion.button>
      </motion.div>
    </PageShell>
  );
}
