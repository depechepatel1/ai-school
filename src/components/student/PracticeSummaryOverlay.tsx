/**
 * Post-session summary overlay
 * Shown when practice timer reaches its target
 */
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Clock, X } from "lucide-react";

interface PracticeSummaryOverlayProps {
  visible: boolean;
  activeSeconds: number;
  targetSeconds: number;
  activityLabel: string;
  onDismiss: () => void;
}

function formatTime(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export default function PracticeSummaryOverlay({
  visible,
  activeSeconds,
  targetSeconds,
  activityLabel,
  onDismiss,
}: PracticeSummaryOverlayProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[500] flex items-center justify-center bg-black/70 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="relative w-full max-w-sm mx-4 rounded-3xl bg-black/60 backdrop-blur-3xl border border-white/10 p-8 text-center"
          >
            <button
              onClick={onDismiss}
              className="absolute top-4 right-4 p-1.5 rounded-full text-white/30 hover:text-white/60 hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-emerald-500/30 to-cyan-500/30 border border-emerald-400/20 flex items-center justify-center">
              <Trophy className="w-8 h-8 text-emerald-300" />
            </div>

            <h2 className="text-xl font-bold text-white mb-1">Great job! 🎉</h2>
            <p className="text-sm text-white/50 mb-6">You've completed your practice target</p>

            <div className="flex items-center justify-center gap-6 mb-6">
              <div className="text-center">
                <div className="flex items-center gap-1.5 justify-center text-white/40 mb-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Practiced</span>
                </div>
                <span className="text-2xl font-bold text-white">{formatTime(activeSeconds)}</span>
              </div>
              <div className="w-px h-10 bg-white/10" />
              <div className="text-center">
                <span className="text-[9px] font-bold uppercase tracking-wider text-white/40 block mb-1">Activity</span>
                <span className="text-sm font-semibold text-white/70">{activityLabel}</span>
              </div>
            </div>

            {activeSeconds > targetSeconds && (
              <p className="text-[11px] text-emerald-300/70 mb-4">
                +{formatTime(activeSeconds - targetSeconds)} overtime — impressive! 💪
              </p>
            )}

            <button
              onClick={onDismiss}
              className="w-full h-11 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 text-white text-sm font-bold hover:scale-[1.02] active:scale-[0.98] transition-transform"
            >
              Continue Practicing
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
