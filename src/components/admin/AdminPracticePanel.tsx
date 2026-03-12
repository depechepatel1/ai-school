import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LoadingSpinner } from "./admin-shared";

export default function PracticePanel() {
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
            <p className="text-[10px] font-semibold text-gray-300">{l.activity_type} · Wk {l.week_number} · {l.course_type}</p>
            <p className="text-[10px] text-gray-500">{new Date(l.created_at).toLocaleString()}</p>
          </div>
          <span className="text-xs font-bold text-white/70">{Math.round(l.active_seconds / 60)}m</span>
        </div>
      ))}
    </div>
  );
}
