import { useNavigate, useLocation } from "react-router-dom";
import type { Database } from "@/integrations/supabase/types";
import { Code, UserPlus, AlertCircle, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { prefetchRoute } from "@/hooks/usePrefetch";
import { useAuth } from "@/lib/auth";
import { toast } from "@/hooks/use-toast";

const DEV_CREDENTIALS: Record<string, { email: string; password: string }> = {
  student: { email: "dev-igcse@test.com", password: "devtest123" },
  "student-ielts": { email: "dev-ielts@test.com", password: "devtest123" },
  teacher: { email: "dev-teacher@test.com", password: "devtest123" },
  parent: { email: "dev-parent@test.com", password: "devtest123" },
  admin: { email: "dev-admin@test.com", password: "devtest123" },
};

const routes = [
  { path: "/login", label: "Login", role: null },
  { path: "/signup", label: "Signup", role: null },
  { path: "/forgot-password", label: "Forgot PW", role: null },
  { path: "/select-week", label: "Week Select", role: "student" },
  { path: "/student", label: "Student (IGCSE)", role: "student" },
  { path: "/student", label: "Student (IELTS)", role: "student-ielts" },
  
  { path: "/igcse/fluency", label: "IGCSE Fluency", role: "student" },
  { path: "/igcse/pronunciation", label: "IGCSE Pronun.", role: "student" },
  { path: "/igcse/speaking", label: "IGCSE Speaking", role: "student" },
  { path: "/ielts/fluency", label: "IELTS Fluency", role: "student-ielts" },
  { path: "/ielts/pronunciation", label: "IELTS Pronun.", role: "student-ielts" },
  { path: "/ielts/speaking", label: "IELTS Speaking", role: "student-ielts" },
  { path: "/analysis", label: "Analysis", role: "student" },
  { path: "/profile", label: "Profile", role: "student" },
  { path: "/teacher", label: "Teacher", role: "teacher" },
  { path: "/parent", label: "Parent", role: "parent" },
  { path: "/admin", label: "Admin", role: "admin" },
];

export default function DevNav() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [accountsReady, setAccountsReady] = useState(() => localStorage.getItem("dev-accounts-created") === "1");
  const navigate = useNavigate();
  const location = useLocation();
  const { user, role: currentRole } = useAuth();

  const isDevEnv = import.meta.env.DEV || window.location.hostname.includes("lovable.app");
  if (!isDevEnv) return null;

  const handleNav = async (route: typeof routes[0]) => {
    setLastError(null);

    if (!route.role) {
      navigate(route.path);
      setOpen(false);
      return;
    }

    // Resolve the correct credential key: "student-ielts" uses its own account, others map directly
    const credKey = route.role;
    const creds = credKey ? DEV_CREDENTIALS[credKey] : null;
    if (!creds) {
      navigate(route.path);
      setOpen(false);
      return;
    }

    setLoading(true);
    try {
      // Sign out first for a clean switch between roles
      await supabase.auth.signOut();

      const { data, error } = await supabase.auth.signInWithPassword({
        email: creds.email,
        password: creds.password,
      });

      if (error) {
        setLastError(`${route.role}: ${error.message}`);
        toast({
          title: `Login failed (${route.role})`,
          description: error.message + ". Click 'Setup Dev Accounts' first.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      if (!data.session) {
        setLastError("No session — email may need confirmation");
        setLoading(false);
        return;
      }

      // Wait for onAuthStateChange + setTimeout role loading to complete
      await new Promise((r) => setTimeout(r, 600));

      navigate(route.path);
      setOpen(false);
    } catch (err: any) {
      setLastError(err.message);
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSetupAccounts = async () => {
    setLoading(true);
    setLastError(null);
    const results: string[] = [];

    for (const [role, creds] of Object.entries(DEV_CREDENTIALS)) {
      try {
        const { data, error } = await supabase.auth.signUp({
          email: creds.email,
          password: creds.password,
          options: { data: { display_name: `Dev ${role}`, role } },
        });

        if (error) {
          if (error.message?.toLowerCase().includes("already")) {
            results.push(`${role}: exists`);
          } else {
            results.push(`${role}: FAILED — ${error.message}`);
          }
          continue;
        }

        if (data.user) {
          const { error: re } = await supabase
            .from("user_roles")
            .upsert({ user_id: data.user.id, role: role as any }, { onConflict: "user_id" });
          if (re) results.push(`${role}: created, role FAILED — ${re.message}`);
          else results.push(`${role}: CREATED`);

          await supabase
            .from("profiles")
            .upsert({ id: data.user.id, display_name: `Dev ${role.charAt(0).toUpperCase() + role.slice(1)}` }, { onConflict: "id" });
        }
      } catch (err: any) {
        results.push(`${role}: ERROR — ${err.message}`);
      }
    }

    await supabase.auth.signOut();
    localStorage.setItem("dev-accounts-created", "1");
    setAccountsReady(true);
    toast({ title: "Dev accounts", description: results.join(", ") });
    setLoading(false);
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
            className="mb-2 p-2 rounded-xl bg-black/80 backdrop-blur-xl border border-white/10 space-y-1 w-[200px] shadow-2xl"
          >
            {/* Status bar */}
            <div className="px-3 py-1 text-[10px] font-mono text-gray-500 border-b border-white/5 mb-1">
              {user ? (
                <span className="text-green-400">{user.email} ({currentRole ?? "no role"})</span>
              ) : (
                <span className="text-red-400">Not signed in</span>
              )}
            </div>

            {lastError && (
              <div className="px-2 py-1 text-[10px] text-red-400 flex items-center gap-1">
                <AlertCircle className="w-3 h-3 flex-shrink-0" />
                {lastError}
              </div>
            )}

            {routes.map((r) => (
              <button
                key={r.path}
                onClick={() => handleNav(r)}
                onMouseEnter={() => prefetchRoute(r.path)}
                disabled={loading}
                className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  location.pathname === r.path
                    ? "bg-primary/20 text-primary"
                    : "text-gray-400 hover:text-white hover:bg-white/10"
                } ${loading ? "opacity-50 cursor-wait" : ""}`}
              >
                {r.label}
                {r.role && <span className="ml-1 text-[10px] text-gray-500">({r.role})</span>}
              </button>
            ))}

            <div className="border-t border-white/5 mt-1 pt-1" />

            {accountsReady ? (
              <div className="w-full px-3 py-1.5 text-[10px] text-green-500/60 flex items-center gap-1.5">
                <CheckCircle2 className="w-3 h-3" />
                Dev accounts ready
              </div>
            ) : (
              <button
                onClick={handleSetupAccounts}
                disabled={loading}
                className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium text-amber-400 hover:bg-amber-500/10 transition-colors flex items-center gap-1.5 ${loading ? "opacity-50 cursor-wait" : ""}`}
              >
                <UserPlus className="w-3 h-3" />
                {loading ? "Working..." : "Setup Dev Accounts"}
              </button>
            )}
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
