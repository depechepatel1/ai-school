import { useNavigate, useLocation } from "react-router-dom";
import { Code } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

const DEV_CREDENTIALS: Record<string, { email: string; password: string }> = {
  student: { email: "dev-igcse@test.com", password: "devtest123" },
  teacher: { email: "dev-teacher@test.com", password: "devtest123" },
  parent: { email: "dev-parent@test.com", password: "devtest123" },
  admin: { email: "dev-admin@test.com", password: "devtest123" },
};

const routes = [
  { path: "/login", label: "Login", role: null },
  { path: "/signup", label: "Signup", role: null },
  { path: "/forgot-password", label: "Forgot PW", role: null },
  { path: "/reset-password", label: "Reset PW", role: null },
  { path: "/student", label: "Student", role: "student" },
  { path: "/speaking", label: "Speaking Studio", role: "student" },
  { path: "/analysis", label: "Analysis", role: "student" },
  { path: "/profile", label: "Profile", role: "student" },
  { path: "/teacher", label: "Teacher", role: "teacher" },
  { path: "/parent", label: "Parent", role: "parent" },
  { path: "/admin", label: "Admin", role: "admin" },
];

export default function DevNav() {
  // Only render in development builds — Vite tree-shakes this out of production
  if (!import.meta.env.DEV) return null;

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleNav = async (route: typeof routes[0]) => {
    if (!route.role) {
      navigate(route.path);
      setOpen(false);
      return;
    }

    setLoading(true);
    try {
      const creds = DEV_CREDENTIALS[route.role];
      if (creds) {
        await supabase.auth.signInWithPassword({
          email: creds.email,
          password: creds.password,
        });
      }
      navigate(route.path);
    } catch {
      // navigate anyway
      navigate(route.path);
    } finally {
      setLoading(false);
      setOpen(false);
    }
  };

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
                onClick={() => handleNav(r)}
                disabled={loading}
                className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  location.pathname === r.path
                    ? "bg-primary/20 text-primary"
                    : "text-gray-400 hover:text-white hover:bg-white/10"
                } ${loading ? "opacity-50 cursor-wait" : ""}`}
              >
                {r.label}
                {r.role && <span className="ml-1 text-[9px] text-gray-600">({r.role})</span>}
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
