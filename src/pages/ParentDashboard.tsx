import { useAuth } from "@/lib/auth";
import { motion } from "framer-motion";
import { LogOut, Users, BarChart3, Clock, ChevronRight, Heart } from "lucide-react";
import NeuralLogo from "@/components/NeuralLogo";
import PageShell from "@/components/PageShell";

const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" as const } },
};

export default function ParentDashboard() {
  const { signOut } = useAuth();

  return (
    <PageShell>
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
              <h1 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-300 via-white to-blue-300 leading-tight">AI School</h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/15 border border-rose-400/20 text-[9px] font-semibold text-rose-300">
                <Heart className="w-3 h-3" /> Parent Portal
              </span>
            </div>
          </div>
          <button onClick={signOut} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] text-gray-500 hover:text-gray-300 hover:bg-white/[0.04] transition-all">
            <LogOut className="w-3 h-3" /> Sign Out
          </button>
        </motion.div>

        {/* Link child — hero card */}
        <motion.div variants={fadeUp} className="text-center p-6 rounded-2xl bg-gradient-to-br from-blue-500/[0.08] to-purple-500/[0.05] border border-blue-400/10 mb-5">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-400/20 flex items-center justify-center mx-auto mb-3">
            <Users className="w-6 h-6 text-blue-400" />
          </div>
          <h2 className="text-sm font-bold text-gray-200 mb-1">Link Your Child's Account</h2>
          <p className="text-[11px] text-gray-500 max-w-[240px] mx-auto leading-relaxed">
            Enter your child's student code to link their account and track their learning progress.
          </p>
          <button className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-500/15 border border-blue-400/20 text-xs font-semibold text-blue-300 hover:bg-blue-500/25 transition-all">
            Link Account
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </motion.div>

        {/* Feature cards */}
        <div className="flex-1 flex flex-col gap-3">
          {[
            { icon: <BarChart3 className="w-5 h-5" />, title: "Progress Overview", desc: "View learning stats, scores, and improvement trends", tag: "Coming Soon" },
            { icon: <Clock className="w-5 h-5" />, title: "Recent Activity", desc: "See latest practice sessions and time spent", tag: "Coming Soon" },
          ].map((item, i) => (
            <motion.div
              key={i}
              variants={fadeUp}
              className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] hover:border-white/10 transition-all group cursor-default"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-500/[0.08] border border-blue-400/10 flex items-center justify-center text-blue-400 shrink-0 group-hover:bg-blue-500/15 transition-colors">
                {item.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-xs font-semibold text-gray-300">{item.title}</h3>
                <p className="text-[10px] text-gray-500 mt-0.5">{item.desc}</p>
              </div>
              <span className="text-[8px] font-bold uppercase tracking-widest text-gray-600 shrink-0">{item.tag}</span>
            </motion.div>
          ))}
        </div>

        {/* Footer */}
        <motion.div variants={fadeUp} className="mt-auto pt-4 text-center">
          <p className="text-[8px] text-gray-600/60">ICP备案号：京ICP备2026XXXXXXXX号</p>
        </motion.div>
      </motion.div>
    </PageShell>
  );
}
