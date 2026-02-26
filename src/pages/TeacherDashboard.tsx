import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { getSafeErrorMessage } from "@/lib/safe-error";
import { motion } from "framer-motion";
import { Plus, Copy, Users, BarChart3, MessageSquare, LogOut } from "lucide-react";
import NeuralLogo from "@/components/NeuralLogo";
import PageShell from "@/components/PageShell";

interface ClassInfo {
  id: string;
  name: string;
  join_code: string;
  created_at: string;
}

export default function TeacherDashboard() {
  const { signOut } = useAuth();
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [newClassName, setNewClassName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => { loadClasses(); }, []);

  const loadClasses = async () => {
    const { data } = await supabase.from("classes").select("*").order("created_at", { ascending: false });
    if (data) setClasses(data);
  };

  const createClass = async () => {
    if (!newClassName.trim()) return;
    setIsCreating(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("classes").insert({ name: newClassName.trim(), created_by: user.id });
    if (error) {
      toast({ title: "Error", description: getSafeErrorMessage(error), variant: "destructive" });
    } else {
      setNewClassName("");
      loadClasses();
      toast({ title: "Class created!" });
    }
    setIsCreating(false);
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: "Copied!", description: `Join code ${code} copied.` });
  };

  return (
    <PageShell>
      <div className="space-y-4 max-h-[540px] overflow-y-auto scrollbar-hide">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <NeuralLogo />
            <h1 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-white">Teacher</h1>
          </div>
          <button onClick={signOut} className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-gray-300 transition-colors">
            <LogOut className="w-3 h-3" /> Sign Out
          </button>
        </div>

        {/* Create class */}
        <div className="flex gap-2">
          <input
            placeholder="New class name..."
            value={newClassName}
            onChange={(e) => setNewClassName(e.target.value)}
            className="flex-1 h-8 px-3 rounded-lg bg-white/5 border border-white/10 text-xs text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-400/40"
          />
          <button
            onClick={createClass}
            disabled={isCreating || !newClassName.trim()}
            className="px-3 h-8 rounded-lg bg-blue-500/20 text-blue-300 text-[10px] font-semibold hover:bg-blue-500/30 disabled:opacity-40 transition-colors flex items-center gap-1"
          >
            <Plus className="w-3 h-3" /> Create
          </button>
        </div>

        {/* Classes */}
        <div className="space-y-2">
          {classes.map((c) => (
            <div key={c.id} className="p-3 rounded-xl bg-white/[0.03] border border-white/5 space-y-2">
              <h3 className="text-sm font-semibold text-gray-200">{c.name}</h3>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-2 py-1 bg-white/5 rounded text-[10px] text-blue-300 font-mono">{c.join_code}</code>
                <button onClick={() => copyCode(c.join_code)} className="text-gray-500 hover:text-gray-300 transition-colors">
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
              <span className="flex items-center gap-1 text-[10px] text-gray-500">
                <Users className="w-3 h-3" /> 0 students
              </span>
            </div>
          ))}
        </div>

        {/* Placeholder sections */}
        {[
          { icon: <BarChart3 className="w-4 h-4" />, title: "Student Analytics", desc: "Coming soon" },
          { icon: <MessageSquare className="w-4 h-4" />, title: "Conversation Review", desc: "Coming soon" },
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
