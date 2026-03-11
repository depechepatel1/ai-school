import { useState } from "react";
import { Code, LogOut, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const ACCOUNTS = [
  { label: "IGCSE Student", email: "dev-igcse@test.com", password: "devtest123", color: "bg-blue-600" },
  { label: "IELTS Student", email: "dev-ielts@test.com", password: "devtest123", color: "bg-indigo-600" },
  { label: "Teacher", email: "dev-teacher@test.com", password: "devtest123", color: "bg-emerald-600" },
  { label: "Parent", email: "dev-parent@test.com", password: "devtest123", color: "bg-rose-600" },
  { label: "Admin", email: "dev-admin@test.com", password: "devtest123", color: "bg-amber-600" },
];

const PAGES = [
  { path: "/", label: "Home" },
  { path: "/student", label: "Student Dashboard" },
  { path: "/speaking", label: "Speaking Studio" },
  { path: "/ielts/pronunciation", label: "IELTS Pronunciation" },
  { path: "/ielts/fluency", label: "IELTS Fluency" },
  { path: "/ielts/speaking", label: "IELTS Speaking" },
  { path: "/igcse/pronunciation", label: "IGCSE Pronunciation" },
  { path: "/igcse/fluency", label: "IGCSE Fluency" },
  { path: "/igcse/speaking", label: "IGCSE Speaking" },
  { path: "/analysis", label: "Analytics" },
  { path: "/profile", label: "Profile" },
  { path: "/select-week", label: "Week Selection" },
  { path: "/teacher", label: "Teacher Dashboard" },
  { path: "/admin", label: "Admin Dashboard" },
  { path: "/admin/upload-videos", label: "Upload Videos" },
  { path: "/parent", label: "Parent Dashboard" },
];

export default function DevToolbar() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);

  const handleSignIn = async (account: typeof ACCOUNTS[0]) => {
    setLoading(account.email);
    try {
      await supabase.auth.signInWithPassword({
        email: account.email,
        password: account.password,
      });
    } catch (e) {
      console.error("Dev sign-in failed:", e);
    } finally {
      setLoading(null);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const handleNav = (path: string) => {
    window.location.href = path;
  };

  return (
    <div className="fixed bottom-4 left-4 z-[9999]">
      {open && (
        <div className="mb-2 w-56 max-h-[70vh] overflow-y-auto rounded-xl bg-gray-950 border border-gray-800 shadow-2xl text-xs">
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-800">
            <span className="text-gray-400 font-bold uppercase tracking-widest text-[9px]">Dev Toolbar</span>
            <button onClick={() => setOpen(false)} className="text-gray-500 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Quick Sign-In */}
          <div className="p-2 border-b border-gray-800">
            <p className="text-gray-500 font-semibold uppercase tracking-wider text-[8px] mb-1.5 px-1">Quick Sign-In</p>
            <div className="space-y-1">
              {ACCOUNTS.map((a) => (
                <button
                  key={a.email}
                  onClick={() => handleSignIn(a)}
                  disabled={loading !== null}
                  className={`w-full text-left px-2.5 py-1.5 rounded-md text-white font-medium ${a.color} hover:brightness-110 transition disabled:opacity-50 disabled:cursor-wait`}
                >
                  {loading === a.email ? "Signing in…" : a.label}
                </button>
              ))}
            </div>
          </div>

          {/* Page Links */}
          <div className="p-2 border-b border-gray-800">
            <p className="text-gray-500 font-semibold uppercase tracking-wider text-[8px] mb-1.5 px-1">Pages</p>
            <div className="space-y-0.5">
              {PAGES.map((p) => (
                <button
                  key={p.path}
                  onClick={() => handleNav(p.path)}
                  className={`w-full text-left px-2.5 py-1 rounded-md font-medium transition ${
                    window.location.pathname === p.path
                      ? "bg-gray-700 text-white"
                      : "text-gray-400 hover:text-white hover:bg-gray-800"
                  }`}
                >
                  {p.label}
                  <span className="ml-1 text-gray-600 text-[9px]">{p.path}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Sign Out */}
          <div className="p-2">
            <button
              onClick={handleSignOut}
              className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md bg-red-900/50 text-red-400 font-medium hover:bg-red-900 hover:text-red-300 transition"
            >
              <LogOut className="w-3 h-3" />
              Sign Out
            </button>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gray-950/90 backdrop-blur border border-gray-800 text-gray-500 text-[10px] font-bold uppercase tracking-wider hover:bg-gray-900 hover:text-white transition-all shadow-lg"
      >
        <Code className="w-3 h-3" />
        Dev
      </button>
    </div>
  );
}
