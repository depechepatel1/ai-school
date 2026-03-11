import { useState, useEffect } from "react";
import { X, Mic, Headphones, MessageSquare, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const STORAGE_KEY = "welcome_shown";

export default function WelcomeModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      setOpen(true);
    }
  }, []);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setOpen(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[600] flex items-center justify-center bg-black/80 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="relative w-[440px] max-w-[90vw] bg-black/90 border border-white/10 rounded-3xl p-8 shadow-[0_0_60px_-10px_rgba(59,130,246,0.3)]"
          >
            <button
              onClick={dismiss}
              className="absolute top-4 right-4 p-2 rounded-full text-white/40 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-2xl font-bold text-white mb-2">Welcome to Speaking Practice! 🎯</h2>
            <p className="text-white/50 text-sm mb-6">Here's how to get the most out of your practice sessions:</p>

            <div className="space-y-4 mb-6">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Headphones className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-amber-300">1. Pronunciation</h3>
                  <p className="text-xs text-white/50 mt-0.5">Listen to tongue twisters and repeat them. Builds muscle memory for difficult sounds.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Mic className="w-4 h-4 text-cyan-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-cyan-300">2. Fluency (Shadowing)</h3>
                  <p className="text-xs text-white/50 mt-0.5">Shadow model answers to improve your rhythm, intonation, and natural flow.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
                <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <MessageSquare className="w-4 h-4 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-purple-300">3. Speaking Practice</h3>
                  <p className="text-xs text-white/50 mt-0.5">Practice with an AI examiner who gives real-time feedback on your answers.</p>
                </div>
              </div>
            </div>

            <p className="text-[10px] text-white/30 mb-4 text-center">
              Recommended order: Pronunciation → Fluency → Speaking
            </p>

            <button
              onClick={dismiss}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold text-sm hover:from-blue-500 hover:to-cyan-500 transition-all flex items-center justify-center gap-2 shadow-lg"
            >
              Let's Get Started <ArrowRight className="w-4 h-4" />
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
