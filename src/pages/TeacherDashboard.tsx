import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { toast } from "@/hooks/use-toast";
import { getSafeErrorMessage } from "@/lib/safe-error";
import { motion } from "framer-motion";
import { Plus, Copy, Users, BarChart3, MessageSquare, LogOut, ChevronRight, BookOpen } from "lucide-react";
import NeuralLogo from "@/components/NeuralLogo";
import PageShell from "@/components/PageShell";
import { fetchClasses, createClass, getCurrentUserId } from "@/services/db";

interface ClassInfo {
  id: string;
  name: string;
  join_code: string;
  created_at: string;
}

const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" as const } },
};

export default function TeacherDashboard() {
  const { signOut } = useAuth();
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [newClassName, setNewClassName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => { loadClasses(); }, []);

  const loadClasses = async () => {
    try {
      const data = await fetchClasses();
      setClasses(data);
    } catch {}
  };

  const handleCreateClass = async () => {
    if (!newClassName.trim()) return;
    setIsCreating(true);
    try {
      const userId = await getCurrentUserId();
      if (!userId) return;
      await createClass(newClassName.trim(), userId);
      setNewClassName("");
      loadClasses();
      toast({ title: "Class created!" });
    } catch (err: any) {
      toast({ title: "Error", description: getSafeErrorMessage(err), variant: "destructive" });
    }
    setIsCreating(false);
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: "Copied!", description: `Join code ${code} copied.` });
  };

  return (
    <PageShell>
      <motion.div
        initial="hidden"
        animate="visible"
        variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.07 } } }}
        className="flex-1 flex flex-col"
      >
        {/* Header */}
        <motion.div variants={fadeUp} className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <NeuralLogo />
            <div>
              <h1 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-300 via-white to-blue-300 leading-tight">AI School</h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-400/20 text-[9px] font-semibold text-emerald-300">
                <BookOpen className="w-3 h-3" /> Teacher Portal
              </span>
            </div>
          </div>
          <button onClick={signOut} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] text-gray-500 hover:text-gray-300 hover:bg-white/[0.04] transition-all">
            <LogOut className="w-3 h-3" /> Sign Out
          </button>
        </motion.div>

        {/* Create class */}
        <motion.div variants={fadeUp} className="flex gap-2 mb-4">
          <input
            placeholder="New class name..."
            value={newClassName}
            onChange={(e) => setNewClassName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreateClass()}
            className="flex-1 h-9 px-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-400/40 focus:bg-white/[0.06] transition-all"
          />
          <button
            onClick={handleCreateClass}
            disabled={isCreating || !newClassName.trim()}
            className="px-3 h-9 rounded-xl bg-blue-500/15 border border-blue-400/20 text-blue-300 text-[10px] font-semibold hover:bg-blue-500/25 disabled:opacity-40 transition-all flex items-center gap-1.5"
          >
            <Plus className="w-3 h-3" /> Create
          </button>
        </motion.div>

        {/* Classes list */}
        <div className="flex-1 overflow-y-auto scrollbar-hide space-y-2.5 mb-4">
          {classes.length === 0 && (
            <motion.div variants={fadeUp} className="text-center py-8">
              <div className="w-12 h-12 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto mb-3">
                <Users className="w-5 h-5 text-gray-600" />
              </div>
              <p className="text-xs text-gray-500">No classes yet. Create one above!</p>
            </motion.div>
          )}
          {classes.map((c) => (
            <motion.div
              key={c.id}
              variants={fadeUp}
              className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] hover:border-white/10 transition-all space-y-2"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-200">{c.name}</h3>
                <span className="flex items-center gap-1 text-[10px] text-gray-500">
                  <Users className="w-3 h-3" /> 0
                </span>
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-2.5 py-1.5 bg-white/[0.04] rounded-lg text-[10px] text-blue-300 font-mono tracking-wider">{c.join_code}</code>
                <button
                  onClick={() => copyCode(c.join_code)}
                  className="p-1.5 rounded-lg text-gray-500 hover:text-blue-300 hover:bg-blue-500/10 transition-all"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bottom feature cards */}
        <div className="space-y-2 mt-auto">
          {[
            { icon: <BarChart3 className="w-4 h-4" />, title: "Student Analytics", tag: "Soon" },
            { icon: <MessageSquare className="w-4 h-4" />, title: "Conversation Review", tag: "Soon" },
          ].map((item, i) => (
            <motion.div
              key={i}
              variants={fadeUp}
              className="flex items-center gap-3 px-3.5 py-3 rounded-xl bg-white/[0.02] border border-white/[0.06] group cursor-default"
            >
              <div className="w-8 h-8 rounded-lg bg-blue-500/[0.08] border border-blue-400/10 flex items-center justify-center text-blue-400 shrink-0">
                {item.icon}
              </div>
              <h3 className="text-xs font-semibold text-gray-400 flex-1">{item.title}</h3>
              <span className="text-[8px] font-bold uppercase tracking-widest text-gray-600">{item.tag}</span>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </PageShell>
  );
}
