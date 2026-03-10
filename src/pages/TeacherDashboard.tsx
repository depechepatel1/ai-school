import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { toast } from "@/hooks/use-toast";
import { getSafeErrorMessage } from "@/lib/safe-error";
import { motion } from "framer-motion";
import { Plus, Copy, Users, BarChart3, MessageSquare, LogOut, ChevronRight, BookOpen } from "lucide-react";
import NeuralLogo from "@/components/NeuralLogo";
import PageShell from "@/components/PageShell";
import LanguageToggle from "@/components/LanguageToggle";
import { useLanguage } from "@/lib/i18n";
import { fetchClasses, createClassWithCourse, getCurrentUserId } from "@/services/db";
import ClassDetailPanel from "@/components/teacher/ClassDetailPanel";

const DASHBOARD_BG = "/images/dashboard-bg.jpg";

interface ClassInfo {
  id: string;
  name: string;
  join_code: string;
  created_at: string;
  course_type: string;
  student_count: number;
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
  const [newCourseType, setNewCourseType] = useState<"ielts" | "igcse">("ielts");
  const [selectedClass, setSelectedClass] = useState<ClassInfo | null>(null);
  const { t } = useLanguage();

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
      if (!userId) {
        setIsCreating(false);
        return;
      }
      await createClassWithCourse(newClassName.trim(), userId, newCourseType);
      setNewClassName("");
      loadClasses();
      toast({ title: t("teacher.classCreated") });
    } catch (err: any) {
      toast({ title: t("common.error"), description: getSafeErrorMessage(err), variant: "destructive" });
    } finally {
      setIsCreating(false);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: t("teacher.copied"), description: t("teacher.joinCodeCopied") });
  };

  return (
    <PageShell fullWidth bgImage={DASHBOARD_BG} hideFooter>
      {/* Full-width glassmorphic overlay */}
      <div className="absolute inset-4 z-10 flex flex-col rounded-[2rem] bg-black/50 backdrop-blur-2xl border border-white/[0.08] shadow-[0_30px_60px_-10px_rgba(0,0,0,0.9)] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-white/[0.03] to-transparent pointer-events-none" />
        <div className="relative z-10 flex-1 flex flex-col p-6 overflow-hidden">
          {selectedClass ? (
            <ClassDetailPanel
              classId={selectedClass.id}
              className={selectedClass.name}
              courseType={selectedClass.course_type}
              onBack={() => setSelectedClass(null)}
            />
          ) : (
            <motion.div
              animate="visible"
              variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.07 } } }}
              className="flex-1 flex flex-col"
            >
              {/* Header */}
              <motion.div variants={fadeUp} className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <NeuralLogo />
                  <div>
                    <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-300 via-white to-blue-300 leading-tight">{t("brand.title")}</h1>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-400/20 text-[9px] font-semibold text-emerald-300">
                      <BookOpen className="w-3 h-3" /> {t("portal.teacher")}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <LanguageToggle />
                  <button onClick={signOut} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] text-gray-500 hover:text-gray-300 hover:bg-white/[0.04] transition-all">
                    <LogOut className="w-3.5 h-3.5" /> {t("common.signOut")}
                  </button>
                </div>
              </motion.div>

              {/* Create class — horizontal row */}
              <motion.div variants={fadeUp} className="flex items-center gap-3 mb-5">
                <input
                  placeholder={t("teacher.newClassPlaceholder")}
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreateClass()}
                  className="flex-1 h-10 px-4 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-400/40 focus:bg-white/[0.06] transition-all"
                />
                <div className="flex gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  {(["ielts", "igcse"] as const).map((ct) => (
                    <button
                      key={ct}
                      onClick={() => setNewCourseType(ct)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                        newCourseType === ct
                          ? "bg-blue-500/15 border border-blue-400/20 text-blue-300"
                          : "text-gray-500 hover:text-gray-300"
                      }`}
                    >
                      {ct}
                    </button>
                  ))}
                </div>
                <button
                  onClick={handleCreateClass}
                  disabled={isCreating || !newClassName.trim()}
                  className="px-4 h-10 rounded-xl bg-blue-500/15 border border-blue-400/20 text-blue-300 text-xs font-semibold hover:bg-blue-500/25 disabled:opacity-40 transition-all flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> {t("teacher.create")}
                </button>
              </motion.div>

              {/* Classes grid — 2 or 3 columns */}
              <div className="flex-1 overflow-y-auto scrollbar-hide mb-5">
                {classes.length === 0 ? (
                  <motion.div variants={fadeUp} className="text-center py-12">
                    <div className="w-14 h-14 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto mb-3">
                      <Users className="w-6 h-6 text-gray-600" />
                    </div>
                    <p className="text-sm text-gray-500">{t("teacher.noClasses")}</p>
                  </motion.div>
                ) : (
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                    {classes.map((c) => (
                      <motion.div
                        key={c.id}
                        variants={fadeUp}
                        onClick={() => setSelectedClass(c)}
                        className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] hover:border-white/10 transition-all space-y-2.5 cursor-pointer group"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-semibold text-gray-200">{c.name}</h3>
                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                              c.course_type === "igcse" ? "bg-amber-500/15 text-amber-300 border border-amber-400/20" : "bg-cyan-500/15 text-cyan-300 border border-cyan-400/20"
                            }`}>{c.course_type}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.06] text-[9px] font-semibold text-gray-400">
                              <Users className="w-3 h-3" /> {c.student_count}
                            </span>
                            <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors" />
                          </div>
                        </div>
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
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
                )}
              </div>

              {/* Bottom feature cards — horizontal row */}
              <div className="flex gap-3 mt-auto">
                {[
                  { icon: <BarChart3 className="w-4 h-4" />, title: t("teacher.studentAnalytics"), tag: "✓ Live" },
                  { icon: <MessageSquare className="w-4 h-4" />, title: t("teacher.conversationReview"), tag: "✓ Live" },
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    variants={fadeUp}
                    className="flex-1 flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.02] border border-white/[0.06] group cursor-default"
                  >
                    <div className="w-9 h-9 rounded-lg bg-blue-500/[0.08] border border-blue-400/10 flex items-center justify-center text-blue-400 shrink-0">
                      {item.icon}
                    </div>
                    <h3 className="text-xs font-semibold text-gray-400 flex-1">{item.title}</h3>
                    <span className="text-[8px] font-bold uppercase tracking-widest text-gray-600">{item.tag}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </PageShell>
  );
}
