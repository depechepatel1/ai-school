import { useNavigate, useLocation } from "react-router-dom";
import { Code, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const routes = [
  { path: "/login", label: "Login" },
  { path: "/signup", label: "Signup" },
  { path: "/forgot-password", label: "Forgot PW" },
  { path: "/reset-password", label: "Reset PW" },
  { path: "/student", label: "Student" },
  { path: "/speaking", label: "Speaking Studio" },
  { path: "/analysis", label: "Analysis" },
  { path: "/profile", label: "Profile" },
  { path: "/teacher", label: "Teacher" },
  { path: "/parent", label: "Parent" },
];

export default function DevNav() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="fixed bottom-4 right-4 z-[9999]">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="mb-2 p-2 rounded-xl bg-black/80 backdrop-blur-xl border border-white/10 space-y-1 min-w-[140px] shadow-2xl"
          >
            {routes.map((r) => (
              <button
                key={r.path}
                onClick={() => { navigate(r.path); setOpen(false); }}
                className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  location.pathname === r.path
                    ? "bg-primary/20 text-primary"
                    : "text-gray-400 hover:text-white hover:bg-white/10"
                }`}
              >
                {r.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 text-gray-400 text-[10px] font-bold uppercase tracking-wider hover:bg-black/80 hover:text-white transition-all"
      >
        <Code className="w-3 h-3" />
        Nav
      </button>
    </div>
  );
}
