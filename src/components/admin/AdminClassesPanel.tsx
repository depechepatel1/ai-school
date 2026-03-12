import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, UserMinus } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { getSafeErrorMessage } from "@/lib/safe-error";
import { adminAction, LoadingSpinner } from "./admin-shared";

export default function ClassesPanel() {
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedClass, setExpandedClass] = useState<string | null>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("classes").select("*").order("created_at", { ascending: false });
      setClasses(data ?? []);
      setLoading(false);
    })();
  }, []);

  const toggleExpand = async (classId: string) => {
    if (expandedClass === classId) { setExpandedClass(null); return; }
    setExpandedClass(classId);
    setMembersLoading(true);
    try {
      const data = await adminAction("list_members", { class_id: classId });
      setMembers(data.members ?? []);
    } catch { setMembers([]); }
    setMembersLoading(false);
  };

  const removeMember = async (classId: string, userId: string) => {
    setBusy(true);
    try {
      await adminAction("remove_member", { class_id: classId, user_id: userId });
      toast({ title: "Member removed" });
      setMembers((prev) => prev.filter((m) => m.user_id !== userId));
    } catch (err: any) {
      toast({ title: "Error", description: getSafeErrorMessage(err), variant: "destructive" });
    }
    setBusy(false);
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-2">
      <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-2">{classes.length} Classes</p>
      {classes.map((c) => (
        <div key={c.id} className="rounded-xl bg-white/[0.02] border border-white/[0.06] overflow-hidden">
          <button onClick={() => toggleExpand(c.id)} className="w-full p-3 flex items-center gap-2 hover:bg-white/[0.02] transition-all text-left">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-semibold text-gray-200">{c.name}</h3>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${c.course_type === "igcse" ? "bg-amber-500/15 text-amber-300 border border-amber-400/20" : "bg-cyan-500/15 text-cyan-300 border border-cyan-400/20"}`}>{c.course_type}</span>
              </div>
              <code className="text-[10px] text-blue-300/60 font-mono">{c.join_code}</code>
            </div>
            {expandedClass === c.id ? <ChevronUp className="w-3.5 h-3.5 text-gray-500" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-500" />}
          </button>
          <AnimatePresence>
            {expandedClass === c.id && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="border-t border-white/[0.06]">
                <div className="p-3 space-y-1.5">
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Members</p>
                  {membersLoading ? (
                    <div className="py-2 flex justify-center"><div className="h-4 w-4 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" /></div>
                  ) : members.length === 0 ? (
                    <p className="text-[10px] text-gray-500 py-2">No members</p>
                  ) : (
                    members.map((m) => (
                      <div key={m.user_id} className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.02]">
                        <div className="w-6 h-6 rounded-full bg-white/[0.06] flex items-center justify-center text-[10px] font-bold text-gray-400 shrink-0">{(m.display_name || "?")[0].toUpperCase()}</div>
                        <p className="text-[10px] text-gray-300 flex-1 truncate">{m.display_name}</p>
                        <p className="text-[10px] text-gray-500">{new Date(m.joined_at).toLocaleDateString()}</p>
                        <button disabled={busy} onClick={() => removeMember(c.id, m.user_id)} className="p-1 rounded text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-50" title="Remove from class">
                          <UserMinus className="w-3 h-3" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}
