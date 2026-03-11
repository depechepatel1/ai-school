import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { usePageTitle } from "@/hooks/usePageTitle";
import { motion } from "framer-motion";
import { LogOut, Users, ChevronRight, Heart, Clock, Trash2, Loader2, UserPlus, BookOpen, Mic, Volume2 } from "lucide-react";
import NeuralLogo from "@/components/NeuralLogo";
import PageShell from "@/components/PageShell";
import LanguageToggle from "@/components/LanguageToggle";
import { useLanguage } from "@/lib/i18n";
import { toast } from "@/hooks/use-toast";
import {
  fetchLinkedChildren,
  fetchChildPracticeSummary,
  linkChildByEmail,
  unlinkChild,
  type LinkedChild,
  type ChildPracticeSummary,
} from "@/services/parent-db";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" as const } },
};

function formatMinutes(seconds: number) {
  const m = Math.round(seconds / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

const ACTIVITY_ICONS: Record<string, React.ReactNode> = {
  shadowing: <Volume2 className="w-3 h-3" />,
  pronunciation: <Mic className="w-3 h-3" />,
  speaking: <BookOpen className="w-3 h-3" />,
};

const ACTIVITY_COLORS: Record<string, string> = {
  shadowing: "text-cyan-300 bg-cyan-500/20",
  pronunciation: "text-amber-300 bg-amber-500/20",
  speaking: "text-purple-300 bg-purple-500/20",
};

export default function ParentDashboard() {
  usePageTitle("Parent Dashboard");
  const { user, signOut } = useAuth();
  const { t } = useLanguage();

  const [children, setChildren] = useState<(LinkedChild & { summary?: ChildPracticeSummary })[]>([]);
  const [loading, setLoading] = useState(true);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkEmail, setLinkEmail] = useState("");
  const [linking, setLinking] = useState(false);

  const loadChildren = useCallback(async () => {
    if (!user?.id) return;
    try {
      const linked = await fetchLinkedChildren(user.id);
      // Fetch summaries in parallel
      const withSummaries = await Promise.all(
        linked.map(async (child) => {
          try {
            const summary = await fetchChildPracticeSummary(child.id);
            return { ...child, summary };
          } catch {
            return child;
          }
        })
      );
      setChildren(withSummaries);
    } catch (e) {
      console.error("Failed to load children:", e);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { loadChildren(); }, [loadChildren]);

  const handleLink = async () => {
    if (!linkEmail.trim()) return;
    setLinking(true);
    try {
      await linkChildByEmail(linkEmail.trim());
      toast({ title: t("parent.linked") });
      setLinkEmail("");
      setLinkOpen(false);
      await loadChildren();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setLinking(false);
    }
  };

  const handleUnlink = async (childId: string) => {
    if (!user?.id || !confirm(t("parent.unlinkConfirm"))) return;
    try {
      await unlinkChild(user.id, childId);
      setChildren((prev) => prev.filter((c) => c.id !== childId));
      toast({ title: "Child unlinked" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  return (
    <PageShell hideFooter>
      <motion.div
        initial="hidden"
        animate="visible"
        variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.08 } } }}
        className="flex-1 flex flex-col"
      >
        {/* Header */}
        <motion.div variants={fadeUp} className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <NeuralLogo />
            <div>
              <h1 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-300 via-white to-blue-300 leading-tight">{t("brand.title")}</h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/15 border border-rose-400/20 text-[9px] font-semibold text-rose-300">
                <Heart className="w-3 h-3" /> {t("portal.parent")}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <button onClick={signOut} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] text-gray-500 hover:text-gray-300 hover:bg-white/[0.04] transition-all">
              <LogOut className="w-3 h-3" /> {t("common.signOut")}
            </button>
          </div>
        </motion.div>

        {/* Link child button */}
        <motion.div variants={fadeUp} className="mb-5">
          <button
            onClick={() => setLinkOpen(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-blue-500/15 to-purple-500/10 border border-blue-400/20 text-sm font-semibold text-blue-300 hover:from-blue-500/25 hover:to-purple-500/20 transition-all"
          >
            <UserPlus className="w-4 h-4" />
            {t("parent.linkButton")}
          </button>
        </motion.div>

        {/* Children list */}
        <div className="flex-1 flex flex-col gap-3">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
            </div>
          ) : children.length === 0 ? (
            <motion.div variants={fadeUp} className="text-center py-12">
              <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-400/20 flex items-center justify-center mx-auto mb-4">
                <Users className="w-7 h-7 text-blue-400/60" />
              </div>
              <h3 className="text-sm font-semibold text-gray-400 mb-1">{t("parent.noChildren")}</h3>
              <p className="text-[11px] text-gray-500 max-w-[260px] mx-auto">{t("parent.noChildrenDesc")}</p>
            </motion.div>
          ) : (
            children.map((child) => (
              <motion.div
                key={child.id}
                variants={fadeUp}
                className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.05] transition-all"
              >
                {/* Child header */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-400/20 flex items-center justify-center text-sm font-bold text-blue-300">
                    {child.display_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xs font-semibold text-gray-200 truncate">{child.display_name}</h3>
                    {child.summary?.lastActive && (
                      <p className="text-[10px] text-gray-500 flex items-center gap-1 mt-0.5">
                        <Clock className="w-2.5 h-2.5" />
                        {t("parent.lastActive")}: {timeAgo(child.summary.lastActive)}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleUnlink(child.id)}
                    className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
                    title={t("parent.unlink")}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Practice summary */}
                {child.summary && (
                  <div className="flex gap-2">
                    {Object.entries(child.summary.byActivity).map(([act, secs]) => (
                      <div
                        key={act}
                        className="flex-1 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.04]"
                      >
                        <span className={`w-5 h-5 rounded-md flex items-center justify-center ${ACTIVITY_COLORS[act] ?? "text-gray-400 bg-gray-500/20"}`}>
                          {ACTIVITY_ICONS[act] ?? <BookOpen className="w-3 h-3" />}
                        </span>
                        <div>
                          <p className="text-[10px] text-gray-400 capitalize">{act}</p>
                          <p className="text-[11px] font-semibold text-gray-200">{formatMinutes(secs)}</p>
                        </div>
                      </div>
                    ))}
                    {Object.keys(child.summary.byActivity).length === 0 && (
                      <p className="text-[10px] text-gray-500 py-1">No practice this week</p>
                    )}
                  </div>
                )}
              </motion.div>
            ))
          )}
        </div>

        {/* Footer */}
        <motion.div variants={fadeUp} className="mt-auto pt-4 text-center">
          <p className="text-[8px] text-gray-600/60">ICP备案号：京ICP备2026000001号</p>
        </motion.div>
      </motion.div>

      {/* Link Child Dialog */}
      <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
        <DialogContent className="bg-gray-900 border-white/10 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-gray-200">{t("parent.linkTitle")}</DialogTitle>
            <DialogDescription className="text-gray-500 text-xs">
              {t("parent.linkDesc")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <input
              type="email"
              value={linkEmail}
              onChange={(e) => setLinkEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLink()}
              placeholder={t("parent.linkPlaceholder")}
              className="w-full px-3 py-2 rounded-lg bg-white/[0.05] border border-white/10 text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500/40"
              autoFocus
            />
            <button
              onClick={handleLink}
              disabled={linking || !linkEmail.trim()}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-500/20 border border-blue-400/30 text-sm font-semibold text-blue-300 hover:bg-blue-500/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {linking ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  {t("parent.linking")}
                </>
              ) : (
                <>
                  <ChevronRight className="w-3.5 h-3.5" />
                  {t("parent.linkButton")}
                </>
              )}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
