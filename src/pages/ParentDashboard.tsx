import { useAuth } from "@/lib/auth";
import { motion } from "framer-motion";
import { LogOut, Users, BarChart3, Clock } from "lucide-react";
import NeuralLogo from "@/components/NeuralLogo";
import PageShell from "@/components/PageShell";

export default function ParentDashboard() {
  const { signOut } = useAuth();

  return (
    <PageShell>
      <div className="flex-1 flex flex-col justify-between space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <NeuralLogo />
            <h1 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-white">Parent</h1>
          </div>
          <button onClick={signOut} className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-gray-300 transition-colors">
            <LogOut className="w-3 h-3" /> Sign Out
          </button>
        </div>

        {/* Link child */}
        <div className="text-center p-4 rounded-xl bg-white/[0.03] border border-white/5 space-y-2">
          <Users className="w-8 h-8 text-blue-400 mx-auto" />
          <h2 className="text-sm font-semibold text-gray-200">Link to Your Child</h2>
          <p className="text-[10px] text-gray-500 max-w-[220px] mx-auto">
            Enter your child's student code to link their account and track progress. (Coming soon)
          </p>
        </div>

        {/* Cards */}
        {[
          { icon: <BarChart3 className="w-4 h-4" />, title: "Progress Overview", desc: "View learning progress (coming soon)" },
          { icon: <Clock className="w-4 h-4" />, title: "Recent Activity", desc: "Latest practice sessions (coming soon)" },
        ].map((item, i) => (
          <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 shrink-0">{item.icon}</div>
            <div>
              <h3 className="text-xs font-semibold text-gray-300">{item.title}</h3>
              <p className="text-[10px] text-gray-500">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </PageShell>
  );
}
