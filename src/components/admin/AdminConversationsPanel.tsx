import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LoadingSpinner } from "./admin-shared";

export default function ConversationsPanel() {
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
