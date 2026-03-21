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

  const tips = [
    { icon: Headphones, label: "1. Pronunciation", desc: "Repeat tongue twisters to build muscle memory.", bg: "bg-amber-500/10", border: "border-amber-500/20", iconColor: "text-amber-400", labelColor: "text-amber-300" },
    { icon: Mic, label: "2. Fluency", desc: "Shadow model answers for rhythm & flow.", bg: "bg-cyan-500/10", border: "border-cyan-500/20", iconColor: "text-cyan-400", labelColor: "text-cyan-300" },
    { icon: MessageSquare, label: "3. Speaking", desc: "Practice with an AI examiner for feedback.", bg: "bg-purple-500/10", border: "border-purple-500/20", iconColor: "text-purple-400", labelColor: "text-purple-300" },
  ];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-x-0 bottom-0 z-[600] pointer-events-none"
        >
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            className="relative w-full bg-black/80 backdrop-blur-xl border-t border-white/10 px-6 py-4 shadow-[0_-4px_40px_-10px_rgba(59,130,246,0.3)] pointer-events-auto"
          >
            <button
              onClick={dismiss}
              className="absolute top-3 right-4 p-1.5 rounded-full text-white/40 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-6 max-w-6xl mx-auto">
              <div className="flex-shrink-0">
                <h2 className="text-base font-bold text-white whitespace-nowrap">Welcome! 🎯</h2>
                <p className="text-[10px] text-white/40">Pronunciation → Fluency → Speaking</p>
              </div>

              <div className="flex flex-1 gap-3 min-w-0">
                {tips.map((tip) => {
                  const Icon = tip.icon;
                  return (
                    <div key={tip.label} className={`flex items-center gap-2.5 flex-1 min-w-0 p-2.5 rounded-xl ${tip.bg} border ${tip.border}`}>
                      <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
                        <Icon className={`w-3.5 h-3.5 ${tip.iconColor}`} />
                      </div>
                      <div className="min-w-0">
                        <h3 className={`text-[11px] font-bold ${tip.labelColor}`}>{tip.label}</h3>
                        <p className="text-[10px] text-white/45 truncate">{tip.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                onClick={dismiss}
                className="flex-shrink-0 px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 text-white font-bold text-xs hover:from-teal-500 hover:to-cyan-500 transition-all flex items-center gap-1.5 shadow-lg whitespace-nowrap"
              >
                Let's Go <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
