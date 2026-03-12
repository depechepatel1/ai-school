/**
 * CSV Preview Modal
 * Shows parsed curriculum chunks so admins can verify before committing upload.
 */
import type { CurriculumData } from "@/services/curriculum-storage";
import { X, ChevronDown, ChevronRight, CheckCircle } from "lucide-react";
import { useState } from "react";

interface Props {
  data: CurriculumData;
  fileName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function CurriculumPreviewModal({ data, fileName, onConfirm, onCancel }: Props) {
  const [expandedWeek, setExpandedWeek] = useState<number | null>(data[0]?.week_number ?? null);

  const totalChunks = data.reduce(
    (sum, w) => sum + w.sections.reduce(
      (s2, sec) => s2 + sec.questions.reduce((s3, q) => s3 + q.chunks.length, 0), 0
    ), 0
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl max-h-[85vh] mx-4 rounded-2xl border border-white/[0.12] bg-gray-950 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.08]">
          <div>
            <h2 className="text-sm font-bold text-white/90">Preview Parsed Curriculum</h2>
            <p className="text-[10px] text-white/40 mt-0.5">
              {fileName} → {data.length} weeks, {totalChunks} chunks
            </p>
          </div>
          <button onClick={onCancel} className="p-1.5 rounded-lg hover:bg-white/[0.08] transition-colors">
            <X className="w-4 h-4 text-white/50" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
          {data.map((week) => (
            <div key={week.week_number} className="rounded-xl border border-white/[0.08] overflow-hidden">
              {/* Week header */}
              <button
                onClick={() => setExpandedWeek(expandedWeek === week.week_number ? null : week.week_number)}
                className="w-full flex items-center gap-2 px-4 py-2.5 bg-white/[0.03] hover:bg-white/[0.06] transition-colors text-left"
              >
                {expandedWeek === week.week_number
                  ? <ChevronDown className="w-3.5 h-3.5 text-white/40" />
                  : <ChevronRight className="w-3.5 h-3.5 text-white/40" />
                }
                <span className="text-xs font-bold text-white/80">Week {week.week_number}</span>
                <span className="text-[10px] text-white/30 ml-auto">
                  {week.sections.length} section{week.sections.length !== 1 ? "s" : ""}
                </span>
              </button>

              {/* Expanded content */}
              {expandedWeek === week.week_number && (
                <div className="px-4 py-3 space-y-4">
                  {week.sections.map((section) => (
                    <div key={section.section_id} className="space-y-2">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-amber-400/70">
                        {section.section_id.replace(/_/g, " ")}
                      </p>
                      {section.questions.map((q) => (
                        <div key={q.question_id} className="space-y-1.5">
                          <p className="text-[10px] text-white/50 italic truncate" title={q.question_text}>
                            Q: {q.question_text}
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {q.chunks.map((chunk) => (
                              <span
                                key={chunk.chunk_number}
                                className="inline-block px-2 py-1 rounded-md bg-white/[0.06] border border-white/[0.08] text-[10px] text-white/70"
                              >
                                <span className="text-white/30 mr-1">{chunk.chunk_number}.</span>
                                {chunk.text}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-white/[0.08]">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-white/50 hover:text-white/70 hover:bg-white/[0.06] transition-all"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex items-center gap-2 px-5 py-2 rounded-lg bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold hover:bg-emerald-500/30 transition-all"
          >
            <CheckCircle className="w-3.5 h-3.5" />
            Confirm & Upload
          </button>
        </div>
      </div>
    </div>
  );
}
