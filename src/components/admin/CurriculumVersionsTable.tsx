/**
 * Active curriculum versions table.
 */
import { CheckCircle } from "lucide-react";
import { format } from "date-fns";
import type { MetadataRow } from "./curriculum-helpers";

interface CurriculumVersionsTableProps {
  metadata: MetadataRow[];
}

export default function CurriculumVersionsTable({ metadata }: CurriculumVersionsTableProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-[10px] font-bold uppercase tracking-wider text-white/40">Active Curriculum Versions</h3>
      {metadata.length === 0 ? (
        <p className="text-xs text-white/30 text-center py-4">No active curriculum files found.</p>
      ) : (
        <div className="rounded-xl border border-white/[0.08] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-white/[0.03]">
                <th className="text-left px-4 py-2 text-[9px] font-bold uppercase tracking-wider text-white/40">Course</th>
                <th className="text-left px-4 py-2 text-[9px] font-bold uppercase tracking-wider text-white/40">Module</th>
                <th className="text-center px-4 py-2 text-[9px] font-bold uppercase tracking-wider text-white/40">Version</th>
                <th className="text-right px-4 py-2 text-[9px] font-bold uppercase tracking-wider text-white/40">Uploaded</th>
              </tr>
            </thead>
            <tbody>
              {metadata.map((m) => (
                <tr key={m.id} className="border-t border-white/[0.05]">
                  <td className="px-4 py-2.5">
                    <span className={`text-[10px] font-bold uppercase ${m.course_type === "ielts" ? "text-blue-300" : m.course_type === "shared" ? "text-amber-300" : "text-emerald-300"}`}>
                      {m.course_type.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-white/60">{m.module_type}</td>
                  <td className="px-4 py-2.5 text-center">
                    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-300">
                      <CheckCircle className="w-3 h-3" /> v{m.version}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right text-[10px] text-white/40">
                    {format(new Date(m.uploaded_at), "MMM d, yyyy")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
