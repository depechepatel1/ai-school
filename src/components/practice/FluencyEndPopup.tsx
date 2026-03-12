/**
 * End-of-answer popup — extracted from FluencyPractice.
 */
import { motion, AnimatePresence } from "framer-motion";
import { RotateCcw, SkipForward, Rewind } from "lucide-react";

interface FluencyEndPopupProps {
  visible: boolean;
  onRepeat: () => void;
  onNext: () => void;
  onStartFromBeginning: () => void;
}

export default function FluencyEndPopup({ visible, onRepeat, onNext, onStartFromBeginning }: FluencyEndPopupProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="absolute inset-0 z-[500] flex items-center justify-center bg-black/60 backdrop-blur-sm"
        >
          <div className="bg-black/80 backdrop-blur-2xl border border-white/[0.12] rounded-3xl p-8 max-w-sm w-full mx-4 shadow-[0_0_60px_rgba(0,0,0,0.5)]">
            <h3 className="text-lg font-bold text-white mb-2">Model Answer Complete</h3>
            <p className="text-sm text-white/50 mb-6">What would you like to do next?</p>
            <div className="flex flex-col gap-2.5">
              <button onClick={onRepeat} className="w-full px-4 py-3 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-200 text-sm font-bold hover:bg-amber-500/30 transition-all flex items-center gap-2 justify-center">
                <RotateCcw className="w-4 h-4" /> Repeat this answer
              </button>
              <button onClick={onNext} className="w-full px-4 py-3 rounded-xl bg-cyan-500/20 border border-cyan-500/30 text-cyan-200 text-sm font-bold hover:bg-cyan-500/30 transition-all flex items-center gap-2 justify-center">
                <SkipForward className="w-4 h-4" /> Next answer
              </button>
              <button onClick={onStartFromBeginning} className="w-full px-4 py-3 rounded-xl bg-white/[0.06] border border-white/[0.08] text-white/60 text-sm font-bold hover:bg-white/10 transition-all flex items-center gap-2 justify-center">
                <Rewind className="w-4 h-4" /> Start from beginning
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
