import { useState, lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { motion } from "framer-motion";
import { Shield, Users, BookOpen, BarChart3, MessageSquare, LogOut, TrendingUp, ClipboardList, Film, Timer, Upload, Sparkles } from "lucide-react";
import NeuralLogo from "@/components/NeuralLogo";
import PageShell from "@/components/PageShell";
import { LoadingSpinner } from "@/components/admin/admin-shared";

const AdminTimerSettings = lazy(() => import("@/components/admin/AdminTimerSettings"));
const AdminCurriculumUpload = lazy(() => import("@/components/admin/AdminCurriculumUpload"));
const AnalyticsPanel = lazy(() => import("@/components/admin/AdminAnalyticsPanel"));
const UsersPanel = lazy(() => import("@/components/admin/AdminUsersPanel"));
const ClassesPanel = lazy(() => import("@/components/admin/AdminClassesPanel"));
const PracticePanel = lazy(() => import("@/components/admin/AdminPracticePanel"));
const ConversationsPanel = lazy(() => import("@/components/admin/AdminConversationsPanel"));
const AuditPanel = lazy(() => import("@/components/admin/AdminAuditPanel"));

const DASHBOARD_BG = "/images/dashboard-bg.jpg";

type Tab = "analytics" | "users" | "classes" | "practice" | "conversations" | "audit" | "timers" | "curriculum";

const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" as const } },
};

export default function AdminDashboard() {
  const { signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("analytics");

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "analytics", label: "Analytics", icon: <TrendingUp className="w-3.5 h-3.5" /> },
    { id: "users", label: "Users", icon: <Users className="w-3.5 h-3.5" /> },
    { id: "classes", label: "Classes", icon: <BookOpen className="w-3.5 h-3.5" /> },
    { id: "practice", label: "Logs", icon: <BarChart3 className="w-3.5 h-3.5" /> },
    { id: "conversations", label: "Chat", icon: <MessageSquare className="w-3.5 h-3.5" /> },
    { id: "audit", label: "Audit", icon: <ClipboardList className="w-3.5 h-3.5" /> },
    { id: "timers", label: "Timers", icon: <Timer className="w-3.5 h-3.5" /> },
    { id: "curriculum", label: "Curriculum", icon: <Upload className="w-3.5 h-3.5" /> },
  ];

  return (
    <PageShell fullWidth bgImage={DASHBOARD_BG} hideFooter>
      <div className="absolute inset-4 z-10 flex flex-col rounded-[2rem] bg-black/50 backdrop-blur-2xl border border-white/[0.08] shadow-[0_30px_60px_-10px_rgba(0,0,0,0.9)] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-white/[0.03] to-transparent pointer-events-none" />
        <div className="relative z-10 flex-1 flex flex-col p-6 min-h-0 overflow-hidden">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.07 } } }}
            className="flex-1 flex flex-col min-h-0"
          >
            {/* Header */}
            <motion.div variants={fadeUp} className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <NeuralLogo />
                <div>
                  <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-white to-amber-300 tracking-tight leading-tight">
                    Neural Admin
                  </h1>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-400/20 text-[10px] font-semibold text-amber-300">
                    <Shield className="w-3 h-3" /> Administrator
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link to="/admin/upload-videos" className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] text-gray-500 hover:text-gray-300 hover:bg-white/[0.04] transition-all">
                  <Film className="w-3.5 h-3.5" /> Upload Videos
                </Link>
                <button onClick={signOut} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] text-gray-500 hover:text-gray-300 hover:bg-white/[0.04] transition-all">
                  <LogOut className="w-3.5 h-3.5" /> Sign Out
                </button>
              </div>
            </motion.div>

            {/* Tabs — horizontally scrollable */}
            <motion.div variants={fadeUp} className="flex gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/[0.06] mb-5 overflow-x-auto scrollbar-hide">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-shrink-0 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-wider whitespace-nowrap transition-all ${
                    activeTab === tab.id
                      ? "bg-amber-500/15 border border-amber-400/20 text-amber-300"
                      : "text-gray-500 hover:text-gray-300"
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </motion.div>

            {/* Content */}
            <div className="flex-1 min-h-0 overflow-y-auto">
              <Suspense fallback={<LoadingSpinner variant="chart" />}>
                {activeTab === "analytics" && <AnalyticsPanel />}
                {activeTab === "users" && <UsersPanel />}
                {activeTab === "classes" && <ClassesPanel />}
                {activeTab === "practice" && <PracticePanel />}
                {activeTab === "conversations" && <ConversationsPanel />}
                {activeTab === "audit" && <AuditPanel />}
                {activeTab === "timers" && <AdminTimerSettings />}
                {activeTab === "curriculum" && <AdminCurriculumUpload />}
              </Suspense>
            </div>
          </motion.div>
        </div>
      </div>
    </PageShell>
  );
}
