/**
 * Admin Curriculum Upload Panel
 * Upload curriculum files, view active versions, download AI formatting guide.
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "@/hooks/use-toast";
import { Upload, FileText, CheckCircle, Download, Loader2, Timer, XCircle } from "lucide-react";
import { format } from "date-fns";
import { parseCSVToCurriculum } from "@/services/csv-to-curriculum";
import type { CurriculumData } from "@/services/curriculum-storage";
import CurriculumPreviewModal from "./CurriculumPreviewModal";
import {
  generateAndUploadFluencyTimings,
  generateAndUploadPronunciationTimings,
  generateAndUploadFluencyTimingsFromData,
  clearTimingsCache,
} from "@/services/tts-timings-storage";
import { clearTongueTwistersCache } from "@/services/tongue-twisters";

interface MetadataRow {
  id: string;
  course_type: string;
  module_type: string;
  file_path: string;
  version: number;
  is_active: boolean;
  uploaded_at: string;
}

const COURSE_OPTIONS = [
  { value: "ielts", label: "IELTS" },
  { value: "igcse", label: "IGCSE" },
];

const MODULE_OPTIONS = [
  { value: "shadowing-fluency", label: "Shadowing Fluency", path: "shadowing-fluency.json" },
  { value: "shadowing-pronunciation", label: "Shadowing Pronunciation", path: "tongue-twisters.json" },
  { value: "speaking", label: "Speaking Questions", path: "speaking-questions.json" },
];

const FORMATTING_GUIDE = `=== AI CURRICULUM FORMATTING GUIDE ===

Paste this entire prompt into an AI chat tool (ChatGPT, Claude, etc.) along with your raw curriculum content. The AI will reformat it into the JSON format our app needs.

--- START OF PROMPT ---

I need you to convert my curriculum content into a specific JSON format for a language learning app. Please follow these rules precisely:

FORMAT RULES:

1. The output must be valid JSON.

2. The top-level structure is:

{
  "course": "IELTS" or "IGCSE",
  "module": "shadowing-fluency" or "shadowing-pronunciation" or "speaking",
  "weeks": [
    {
      "week_number": 1,
      "content": [ ...see below for content structure per module type... ]
    }
  ]
}

FOR SHADOWING-FLUENCY MODULES:

Each week's "content" is an array of model answers. Each model answer is an array of chunks:

{
  "week_number": 1,
  "content": [
    {
      "question_type": "Part 2",
      "question_number": "Q1",
      "question_text": "Describe a time when you helped someone.",
      "chunks": [
        "I'd like to talk about a time",
        "when I helped my neighbor",
        "move to a new apartment.",
        "It was last summer,",
        "and she was an elderly woman",
        "who lived alone."
      ]
    }
  ]
}

CHUNKING RULES FOR SHADOWING:

- Each chunk should be approximately 8-12 words.
- Break at natural pauses: commas, clause boundaries, or phrase endings.
- Each chunk should be a complete, meaningful phrase that a student can repeat from memory.
- Do NOT break in the middle of a noun phrase or verb phrase.
- Example: "I'd like to talk about a time" (good) vs "I'd like to talk" (too short, incomplete thought)

FOR SPEAKING MODULES:

Each week's "content" is an array of questions:

{
  "week_number": 1,
  "content": [
    {
      "question_type": "Part 2",
      "question_number": "Q1",
      "question_text": "Describe a time when you received good news. You should say: what the news was, when you received it, how you felt about it, and explain why it was good news.",
      "time_limit_minutes": 2
    }
  ]
}

FOR SHADOWING-PRONUNCIATION (TONGUE TWISTERS):

Simple flat array of items to cycle through:

{
  "course": "shared",
  "module": "shadowing-pronunciation",
  "items": [
    {
      "id": 1,
      "text": "She sells seashells by the seashore.",
      "difficulty": "easy"
    }
  ]
}

Now, please convert the following curriculum content into the correct JSON format. If the content is for shadowing, chunk it according to the rules above:

[PASTE YOUR CURRICULUM CONTENT HERE]

--- END OF PROMPT ---
`;

export default function AdminCurriculumUpload() {
  const { user } = useAuth();
  const [metadata, setMetadata] = useState<MetadataRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState("ielts");
  const [selectedModule, setSelectedModule] = useState("shadowing-fluency");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Preview state for CSV files
  const [previewData, setPreviewData] = useState<CurriculumData | null>(null);
  const [previewFileName, setPreviewFileName] = useState("");
  const [pendingContent, setPendingContent] = useState<string | null>(null);

  // TTS Measurement state
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [measureProgress, setMeasureProgress] = useState({ current: 0, total: 0 });
  const [measureLabel, setMeasureLabel] = useState("");
  const cancelRef = useRef(false);

  const cancelMeasurement = () => {
    cancelRef.current = true;
  };

  const loadMetadata = async () => {
    const { data } = await supabase
      .from("curriculum_metadata")
      .select("*")
      .eq("is_active", true)
      .order("uploaded_at", { ascending: false });
    setMetadata((data as MetadataRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { loadMetadata(); }, []);

  const getFilePath = (course: string, module: string) => {
    if (module === "shadowing-pronunciation") return "shared/tongue-twisters.json";
    const moduleInfo = MODULE_OPTIONS.find((m) => m.value === module);
    return `${course}/${moduleInfo?.path ?? `${module}.json`}`;
  };

  /** Map a curriculum file path to its corresponding timing file path. */
  const getTimingPath = (filePath: string): string | null => {
    const map: Record<string, string> = {
      "ielts/shadowing-fluency.json": "ielts/timings-shadowing-fluency.json",
      "igcse/shadowing-fluency.json": "igcse/timings-shadowing-fluency.json",
      "shared/tongue-twisters.json": "shared/timings-shadowing-pronunciation.json",
    };
    return map[filePath] ?? null;
  };

  /** Commit content (JSON string) to storage + metadata. */
  const commitUpload = useCallback(async (fileContent: string) => {
    setUploading(true);
    try {
      const filePath = getFilePath(selectedCourse, selectedModule);
      const effectiveCourse = selectedModule === "shadowing-pronunciation" ? "shared" : selectedCourse;

      const blob = new Blob([fileContent], { type: "application/json" });
      const { error: uploadError } = await supabase.storage
        .from("curriculums")
        .upload(filePath, blob, { upsert: true });
      if (uploadError) throw uploadError;

      await supabase
        .from("curriculum_metadata")
        .update({ is_active: false })
        .eq("course_type", effectiveCourse)
        .eq("module_type", selectedModule)
        .eq("is_active", true);

      const { data: versionData } = await supabase
        .from("curriculum_metadata")
        .select("version")
        .eq("course_type", effectiveCourse)
        .eq("module_type", selectedModule)
        .order("version", { ascending: false })
        .limit(1);

      const nextVersion = (versionData?.[0]?.version ?? 0) + 1;

      await supabase.from("curriculum_metadata").insert({
        course_type: effectiveCourse,
        module_type: selectedModule,
        file_path: filePath,
        version: nextVersion,
        is_active: true,
        uploaded_by: user?.id ?? null,
      });

      // Auto-invalidate the corresponding timing file so "Measure Missing" picks it up
      const timingPath = getTimingPath(filePath);
      if (timingPath) {
        await supabase.storage.from("curriculums").remove([timingPath]);
        console.log(`Deleted stale timing file: ${timingPath}`);
      }

      // Clear in-memory caches so fresh data is fetched
      clearTimingsCache();
      clearTongueTwistersCache();

      toast({ title: "Curriculum uploaded", description: `v${nextVersion} is now active for ${effectiveCourse.toUpperCase()} ${selectedModule}. Timing file invalidated.` });
      await loadMetadata();
    } catch (err) {
      toast({ title: "Upload failed", description: String(err), variant: "destructive" });
    } finally {
      setUploading(false);
    }
  }, [selectedCourse, selectedModule, user?.id]);

  /** Handle file selection — CSV gets previewed, others upload directly. */
  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (fileInputRef.current) fileInputRef.current.value = "";

    try {
      if (file.name.endsWith(".csv")) {
        // Parse and show preview
        const csvText = await file.text();
        const curriculumData = parseCSVToCurriculum(csvText);
        const jsonContent = JSON.stringify(curriculumData, null, 2);
        setPreviewData(curriculumData);
        setPreviewFileName(file.name);
        setPendingContent(jsonContent);
      } else {
        // JSON / txt / docx — upload directly
        let fileContent = await file.text();
        if (file.name.endsWith(".json")) JSON.parse(fileContent); // validate
        await commitUpload(fileContent);
      }
    } catch (err) {
      toast({ title: "File error", description: String(err), variant: "destructive" });
    }
  };

  const handlePreviewConfirm = async () => {
    if (pendingContent) {
      await commitUpload(pendingContent);
    }
    setPreviewData(null);
    setPendingContent(null);
    setPreviewFileName("");
  };

  const handlePreviewCancel = () => {
    setPreviewData(null);
    setPendingContent(null);
    setPreviewFileName("");
  };

  const handleDownloadGuide = () => {
    const blob = new Blob([FORMATTING_GUIDE], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ai-curriculum-formatting-guide.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  const TIMING_JOBS: { label: string; run: () => Promise<void>; path: string }[] = [
    {
      label: "IELTS Fluency",
      path: "ielts/timings-shadowing-fluency.json",
      run: () => generateAndUploadFluencyTimings("ielts", "uk", (c, t) => setMeasureProgress({ current: c, total: t }), cancelRef).then(() => {}),
    },
    {
      label: "IGCSE Fluency",
      path: "igcse/timings-shadowing-fluency.json",
      run: () => generateAndUploadFluencyTimings("igcse", "uk", (c, t) => setMeasureProgress({ current: c, total: t }), cancelRef).then(() => {}),
    },
    {
      label: "Pronunciation",
      path: "shared/timings-shadowing-pronunciation.json",
      run: () => generateAndUploadPronunciationTimings("uk", (c, t) => setMeasureProgress({ current: c, total: t }), cancelRef).then(() => {}),
    },
  ];

  const handleMeasureSingle = async (jobIndex: number) => {
    if (isMeasuring) return;
    const job = TIMING_JOBS[jobIndex];
    if (!job) return;
    setIsMeasuring(true);
    cancelRef.current = false;
    clearTimingsCache();
    setMeasureLabel(job.label);
    try {
      await job.run();
      if (cancelRef.current) {
        toast({ title: "Measurement cancelled", description: `Stopped during ${job.label}.` });
      } else {
        toast({ title: "TTS Timing Complete", description: `Re-measured ${job.label}.` });
      }
    } catch (err) {
      if (!cancelRef.current) {
        toast({ title: "Measurement failed", description: String(err), variant: "destructive" });
      }
    } finally {
      cancelRef.current = false;
      setIsMeasuring(false);
      setMeasureProgress({ current: 0, total: 0 });
      setMeasureLabel("");
    }
  };

  const handleMeasureAll = async (force = false) => {
    if (isMeasuring) return;
    setIsMeasuring(true);
    cancelRef.current = false;
    clearTimingsCache();

    const jobs = TIMING_JOBS;

    try {
      let pending = jobs;

      if (!force) {
        pending = [];
        for (const job of jobs) {
          const { data } = supabase.storage.from("curriculums").getPublicUrl(job.path);
          if (data?.publicUrl) {
            try {
              const res = await fetch(`${data.publicUrl}?t=${Date.now()}`, { method: "HEAD" });
              if (res.ok) continue;
            } catch { /* treat fetch error as missing */ }
          }
          pending.push(job);
        }
      }

      if (pending.length === 0) {
        toast({ title: "All timings already exist", description: "No missing timing files to measure." });
      } else {
        for (const job of pending) {
          if (cancelRef.current) break;
          setMeasureLabel(job.label);
          await job.run();
        }
        if (cancelRef.current) {
          toast({ title: "Measurement cancelled", description: "Stopped by user." });
        } else {
          toast({ title: "TTS Timings Complete", description: `Measured ${pending.length} timing file(s).` });
        }
      }
    } catch (err) {
      if (!cancelRef.current) {
        toast({ title: "Measurement failed", description: String(err), variant: "destructive" });
      }
    } finally {
      cancelRef.current = false;
      setIsMeasuring(false);
      setMeasureProgress({ current: 0, total: 0 });
      setMeasureLabel("");
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
      {/* Upload Section — compact */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Upload className="w-4 h-4 text-amber-400" />
          <h2 className="text-sm font-bold text-white/90">Upload New Curriculum</h2>
        </div>

        {/* Course + Module + Upload button in one row */}
        <div className="flex items-end gap-2">
          {selectedModule !== "shadowing-pronunciation" ? (
            <div className="flex-1">
              <label className="block text-[9px] font-bold uppercase tracking-wider text-white/40 mb-1">Course</label>
              <select
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                className="w-full bg-white/[0.05] border border-white/[0.12] rounded-lg px-2.5 py-1.5 text-xs text-white/80 focus:outline-none focus:border-amber-400/40 transition-all"
              >
                {COURSE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value} className="bg-gray-900">{o.label}</option>
                ))}
              </select>
            </div>
          ) : (
            <div className="flex-1">
              <label className="block text-[9px] font-bold uppercase tracking-wider text-white/40 mb-1">Course</label>
              <div className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-xs text-amber-300/70">
                Shared (IELTS + IGCSE)
              </div>
            </div>
          )}
          <div className="flex-1">
            <label className="block text-[9px] font-bold uppercase tracking-wider text-white/40 mb-1">Module</label>
            <select
              value={selectedModule}
              onChange={(e) => setSelectedModule(e.target.value)}
              className="w-full bg-white/[0.05] border border-white/[0.12] rounded-lg px-2.5 py-1.5 text-xs text-white/80 focus:outline-none focus:border-amber-400/40 transition-all"
            >
              {MODULE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value} className="bg-gray-900">{o.label}</option>
              ))}
            </select>
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 border border-amber-400/30 text-amber-200 text-[11px] font-bold hover:bg-amber-500/30 transition-all whitespace-nowrap disabled:opacity-50"
          >
            {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
            {uploading ? "Uploading…" : "Upload"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.txt,.docx,.csv"
            onChange={handleFileSelected}
            className="hidden"
          />
        </div>
        <p className="text-[9px] text-white/25">
          Target: {getFilePath(selectedCourse, selectedModule)} · Accepts .json, .csv, .txt, .docx
        </p>

        {/* Action buttons — single compact row */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={handleDownloadGuide}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-500/15 border border-indigo-400/20 text-indigo-300 text-[10px] font-bold hover:bg-indigo-500/25 transition-all"
          >
            <Download className="w-3 h-3" />
            AI Guide
          </button>
          <button
            onClick={() => handleMeasureAll(false)}
            disabled={isMeasuring}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-500/15 border border-amber-400/20 text-amber-300 text-[10px] font-bold hover:bg-amber-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isMeasuring ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                {measureLabel} {measureProgress.current}/{measureProgress.total}
              </>
            ) : (
              <>
                <Timer className="w-3 h-3" />
                Measure Missing
              </>
            )}
          </button>
          <button
            onClick={() => handleMeasureAll(true)}
            disabled={isMeasuring}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-500/10 border border-red-400/15 text-red-300 text-[10px] font-bold hover:bg-red-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Timer className="w-3 h-3" />
            Force All
          </button>
          {isMeasuring && (
            <button
              onClick={cancelMeasurement}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-500/20 border border-red-400/30 text-red-300 text-[10px] font-bold hover:bg-red-500/35 transition-all animate-pulse"
            >
              <XCircle className="w-3 h-3" />
              Cancel
            </button>
          )}
          {TIMING_JOBS.map((job, idx) => (
            <button
              key={job.path}
              onClick={() => handleMeasureSingle(idx)}
              disabled={isMeasuring}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-[10px] text-white/50 hover:bg-white/[0.06] hover:text-white/80 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Timer className="w-2.5 h-2.5" />
              Re-time {job.label}
            </button>
          ))}
        </div>
      </div>

      {/* Active Versions Table */}
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

      {/* CSV Preview Modal */}
      {previewData && (
        <CurriculumPreviewModal
          data={previewData}
          fileName={previewFileName}
          onConfirm={handlePreviewConfirm}
          onCancel={handlePreviewCancel}
        />
      )}
    </div>
  );
}
