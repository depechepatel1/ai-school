import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { motion } from "framer-motion";
import { Shield, Users, BookOpen, BarChart3, MessageSquare, LogOut, ChevronDown, ChevronRight } from "lucide-react";
import NeuralLogo from "@/components/NeuralLogo";
import PageShell from "@/components/PageShell";
import { supabase } from "@/integrations/supabase/client";

type Tab = "users" | "classes" | "practice" | "conversations";

const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" as const } },
};

export default function AdminDashboard() {
  const { signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("users");

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "users", label: "Users & Roles", icon: <Users className="w-3.5 h-3.5" /> },
    { id: "classes", label: "Classes", icon: <BookOpen className="w-3.5 h-3.5" /> },
    { id: "practice", label: "Practice Logs", icon: <BarChart3 className="w-3.5 h-3.5" /> },
    { id: "conversations", label: "Conversations", icon: <MessageSquare className="w-3.5 h-3.5" /> },
  ];

  return (
    <PageShell>
      <motion.div
        initial="hidden"
        animate="visible"
        variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.07 } } }}
        className="flex-1 flex flex-col"
      >
        {/* Header */}
        <motion.div variants={fadeUp} className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <NeuralLogo />
            <div>
              <h1 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-white to-amber-300 leading-tight">
                Neural Admin
              </h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-400/20 text-[9px] font-semibold text-amber-300">
                <Shield className="w-3 h-3" /> Administrator
              </span>
            </div>
          </div>
          <button onClick={signOut} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] text-gray-500 hover:text-gray-300 hover:bg-white/[0.04] transition-all">
            <LogOut className="w-3 h-3" /> Sign Out
          </button>
        </motion.div>

        {/* Tabs */}
        <motion.div variants={fadeUp} className="flex gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/[0.06] mb-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                activeTab === tab.id
                  ? "bg-amber-500/15 border border-amber-400/20 text-amber-300"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </motion.div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto scrollbar-hide">
          {activeTab === "users" && <UsersPanel />}
          {activeTab === "classes" && <ClassesPanel />}
          {activeTab === "practice" && <PracticePanel />}
          {activeTab === "conversations" && <ConversationsPanel />}
        </div>
      </motion.div>
    </PageShell>
  );
}

/* ── Users Panel ─────────────────────────────────────────── */
function UsersPanel() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: roles } = await supabase.from("user_roles").select("user_id, role");
      const { data: profiles } = await supabase.from("profiles").select("id, display_name, avatar_url, created_at");
      const merged = (profiles ?? []).map((p) => ({
        ...p,
        role: roles?.find((r) => r.user_id === p.id)?.role ?? "unknown",
      }));
      setUsers(merged);
      setLoading(false);
    })();
  }, []);

  if (loading) return <LoadingSpinner />;

  const roleColors: Record<string, string> = {
    student: "bg-blue-500/15 text-blue-300 border-blue-400/20",
    teacher: "bg-emerald-500/15 text-emerald-300 border-emerald-400/20",
    parent: "bg-rose-500/15 text-rose-300 border-rose-400/20",
    admin: "bg-amber-500/15 text-amber-300 border-amber-400/20",
  };

  return (
    <div className="space-y-2">
      <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-2">{users.length} Users</p>
      {users.map((u) => (
        <div key={u.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
          <div className="w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center text-xs font-bold text-gray-400">
            {(u.display_name || "?")[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-gray-200 truncate">{u.display_name || "No Name"}</p>
            <p className="text-[10px] text-gray-500">{new Date(u.created_at).toLocaleDateString()}</p>
          </div>
          <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider border ${roleColors[u.role] || "bg-gray-500/15 text-gray-400 border-gray-400/20"}`}>
            {u.role}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ── Classes Panel ───────────────────────────────────────── */
function ClassesPanel() {
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("classes").select("*").order("created_at", { ascending: false });
      setClasses(data ?? []);
      setLoading(false);
    })();
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-2">
      <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-2">{classes.length} Classes</p>
      {classes.map((c) => (
        <div key={c.id} className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-1.5">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-semibold text-gray-200">{c.name}</h3>
            <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
              c.course_type === "igcse" ? "bg-amber-500/15 text-amber-300 border border-amber-400/20" : "bg-cyan-500/15 text-cyan-300 border border-cyan-400/20"
            }`}>{c.course_type}</span>
          </div>
          <code className="block px-2 py-1 bg-white/[0.04] rounded text-[10px] text-blue-300 font-mono">{c.join_code}</code>
        </div>
      ))}
    </div>
  );
}

/* ── Practice Logs Panel ─────────────────────────────────── */
function PracticePanel() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("student_practice_logs")
        .select("id, user_id, activity_type, course_type, week_number, active_seconds, created_at")
        .order("created_at", { ascending: false })
        .limit(50);
      setLogs(data ?? []);
      setLoading(false);
    })();
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-2">
      <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-2">Recent Practice ({logs.length})</p>
      {logs.length === 0 && <p className="text-xs text-gray-500 text-center py-4">No practice logs yet</p>}
      {logs.map((l) => (
        <div key={l.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-semibold text-gray-300">
              {l.activity_type} · Wk {l.week_number} · {l.course_type}
            </p>
            <p className="text-[10px] text-gray-500">{new Date(l.created_at).toLocaleString()}</p>
          </div>
          <span className="text-xs font-bold text-white/70">{Math.round(l.active_seconds / 60)}m</span>
        </div>
      ))}
    </div>
  );
}

/* ── Conversations Panel ─────────────────────────────────── */
function ConversationsPanel() {
  const [convos, setConvos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("conversations")
        .select("id, user_id, title, created_at")
        .order("updated_at", { ascending: false })
        .limit(50);
      setConvos(data ?? []);
      setLoading(false);
    })();
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-2">
      <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-2">Recent Conversations ({convos.length})</p>
      {convos.length === 0 && <p className="text-xs text-gray-500 text-center py-4">No conversations yet</p>}
      {convos.map((c) => (
        <div key={c.id} className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
          <p className="text-xs font-semibold text-gray-200 truncate">{c.title || "Untitled"}</p>
          <p className="text-[10px] text-gray-500">{new Date(c.created_at).toLocaleString()}</p>
        </div>
      ))}
    </div>
  );
}

/* ── Shared Loading Spinner ──────────────────────────────── */
function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-8">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
    </div>
  );
}
