/**
 * Admin Timer Settings Panel
 * Allows editing countdown durations for all 6 module/course combinations.
 */
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Save, Clock, Loader2 } from "lucide-react";

interface TimerRow {
  id?: string;
  course_type: string;
  module_type: string;
  countdown_minutes: number;
}

const MODULE_LABELS: Record<string, string> = {
  "shadowing-pronunciation": "Pronunciation",
  "shadowing-fluency": "Shadowing Fluency",
  "speaking": "Speaking",
};

const ALL_COMBOS = [
  { course_type: "ielts", module_type: "shadowing-pronunciation", default_minutes: 5 },
  { course_type: "ielts", module_type: "shadowing-fluency", default_minutes: 10 },
  { course_type: "ielts", module_type: "speaking", default_minutes: 12 },
  { course_type: "igcse", module_type: "shadowing-pronunciation", default_minutes: 5 },
  { course_type: "igcse", module_type: "shadowing-fluency", default_minutes: 10 },
  { course_type: "igcse", module_type: "speaking", default_minutes: 10 },
];

export default function AdminTimerSettings() {
  const [rows, setRows] = useState<TimerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("timer_settings")
        .select("id, course_type, module_type, countdown_minutes");

      // Merge existing data with defaults
      const merged = ALL_COMBOS.map((combo) => {
        const existing = data?.find(
          (d) => d.course_type === combo.course_type && d.module_type === combo.module_type
        );
        return {
          id: existing?.id,
          course_type: combo.course_type,
          module_type: combo.module_type,
          countdown_minutes: existing?.countdown_minutes ?? combo.default_minutes,
        };
      });
      setRows(merged);
      setLoading(false);
    })();
  }, []);

  const updateMinutes = (index: number, value: number) => {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, countdown_minutes: Math.max(1, value) } : r)));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const row of rows) {
        if (row.id) {
          await supabase
            .from("timer_settings")
            .update({ countdown_minutes: row.countdown_minutes, updated_at: new Date().toISOString() })
            .eq("id", row.id);
        } else {
          const { data } = await supabase
            .from("timer_settings")
            .insert({
              course_type: row.course_type,
              module_type: row.module_type,
              countdown_minutes: row.countdown_minutes,
            })
            .select("id")
            .single();
          if (data) row.id = data.id;
        }
      }
      toast({ title: "Timer settings saved", description: "Changes take effect for new sessions immediately." });
    } catch (err) {
      toast({ title: "Error saving", description: String(err), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-400" />
          <h2 className="text-sm font-bold text-white/90">Timer Settings</h2>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500/20 border border-amber-400/30 text-amber-200 text-[11px] font-bold hover:bg-amber-500/30 transition-all disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          Save All
        </button>
      </div>

      <div className="rounded-xl border border-white/[0.08] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-white/[0.03]">
              <th className="text-left px-4 py-2.5 text-[9px] font-bold uppercase tracking-wider text-white/40">Course</th>
              <th className="text-left px-4 py-2.5 text-[9px] font-bold uppercase tracking-wider text-white/40">Module</th>
              <th className="text-center px-4 py-2.5 text-[9px] font-bold uppercase tracking-wider text-white/40">Minutes</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={`${row.course_type}-${row.module_type}`} className="border-t border-white/[0.05] hover:bg-white/[0.02] transition-colors">
                <td className="px-4 py-3">
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${row.course_type === "ielts" ? "text-blue-300" : "text-emerald-300"}`}>
                    {row.course_type.toUpperCase()}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs text-white/70">{MODULE_LABELS[row.module_type] ?? row.module_type}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center">
                    <input
                      type="number"
                      min={1}
                      max={120}
                      value={row.countdown_minutes}
                      onChange={(e) => updateMinutes(i, parseInt(e.target.value) || 1)}
                      className="w-16 text-center bg-white/[0.05] border border-white/[0.12] rounded-lg px-2 py-1.5 text-sm font-bold text-white/90 focus:outline-none focus:border-amber-400/40 focus:ring-1 focus:ring-amber-400/20 transition-all"
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[10px] text-white/30 text-center">
        Changes apply immediately to new student sessions. Active sessions are unaffected.
      </p>
    </div>
  );
}
