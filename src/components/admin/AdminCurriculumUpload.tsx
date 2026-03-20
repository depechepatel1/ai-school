/**
 * Admin Curriculum Upload Panel
 * Upload curriculum files, view active versions, download AI formatting guide.
 * Refactored: helpers/constants in curriculum-helpers.ts, sub-components extracted.
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "@/hooks/use-toast";
import { Upload, Download, Loader2 } from "lucide-react";
import { parseCSVToCurriculum } from "@/services/csv-to-curriculum";
import type { CurriculumData } from "@/services/curriculum-storage";
import CurriculumPreviewModal from "./CurriculumPreviewModal";
import CurriculumTimingControls from "./CurriculumTimingControls";
import CurriculumVersionsTable from "./CurriculumVersionsTable";
import {
  type MetadataRow,
  COURSE_OPTIONS,
  MODULE_OPTIONS,
  TIMING_PATHS,
  normaliseCurriculumText,
  getFilePath,
  getTimingPath,
  FORMATTING_GUIDE,
} from "./curriculum-helpers";
import {
  clearTimingsCache,
  getFluencyChunkTexts,
  getPronunciationChunkTexts,
} from "@/services/tts-timings-storage";
import { clearPronunciationCache } from "@/services/pronunciation-shadowing";
import {
  launchTimingWorker,
  launchTimingWorkerQueue,
  cancelTimingWorker,
  onTimingWorkerMessage,
  type TimingWorkerMessage,
  type TimingWorkerConfig,
} from "@/lib/timing-worker-channel";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export default function AdminCurriculumUpload() {
  const { user } = useAuth();
  const [metadata, setMetadata] = useState<MetadataRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState("ielts");
  const [selectedModule, setSelectedModule] = useState("shadowing-fluency");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [previewData, setPreviewData] = useState<CurriculumData | null>(null);
  const [previewFileName, setPreviewFileName] = useState("");
  const [pendingContent, setPendingContent] = useState<string | null>(null);

  const [isMeasuring, setIsMeasuring] = useState(false);
  const [measureProgress, setMeasureProgress] = useState({ current: 0, total: 0 });
  const [measureLabel, setMeasureLabel] = useState("");
  const cancelRef = useRef(false);
  const [timingStatus, setTimingStatus] = useState<Record<string, boolean | null>>({});

  // Listen for worker messages
  useEffect(() => {
    const cleanup = onTimingWorkerMessage((msg: TimingWorkerMessage) => {
      switch (msg.type) {
        case "PROGRESS":
          setMeasureProgress({ current: msg.current, total: msg.total });
          break;
        case "JOB_STARTED":
          setMeasureLabel(`${msg.jobLabel} (${msg.jobIndex + 1}/${msg.totalJobs})`);
          setMeasureProgress({ current: 0, total: 0 });
          break;
        case "COMPLETE":
          clearTimingsCache();
          checkTimingStatus();
          toast({ title: "Job Complete", description: `Measured ${msg.count} chunks for ${msg.storagePath}.` });
          break;
        case "QUEUE_COMPLETE":
          setIsMeasuring(false);
          setMeasureProgress({ current: 0, total: 0 });
          setMeasureLabel("");
          clearTimingsCache();
          checkTimingStatus();
          if (msg.completedJobs === msg.totalJobs) {
            toast({ title: "All timing jobs complete", description: `${msg.completedJobs} job(s) finished successfully.` });
          }
          break;
        case "CANCELLED":
          setIsMeasuring(false);
          setMeasureProgress({ current: 0, total: 0 });
          setMeasureLabel("");
          checkTimingStatus();
          toast({ title: "Timing cancelled", description: `Partial progress saved (${msg.measured}/${msg.total}).` });
          break;
        case "ERROR":
          setIsMeasuring(false);
          setMeasureProgress({ current: 0, total: 0 });
          setMeasureLabel("");
          toast({ title: "Timing failed", description: msg.error, variant: "destructive" });
          break;
      }
    });
    return cleanup;
  }, []);

  const loadMetadata = async () => {
    const { data } = await supabase
      .from("curriculum_metadata")
      .select("*")
      .eq("is_active", true)
      .order("uploaded_at", { ascending: false });
    setMetadata((data as MetadataRow[]) ?? []);
    setLoading(false);
  };

  const checkTimingStatus = useCallback(async () => {
    const status: Record<string, boolean | null> = {};
    for (const p of TIMING_PATHS) status[p] = null;
    setTimingStatus({ ...status });

    await Promise.all(
      TIMING_PATHS.map(async (path) => {
        const { data } = supabase.storage.from("curriculums").getPublicUrl(path);
        if (!data?.publicUrl) { status[path] = false; return; }
        try {
          const res = await fetch(`${data.publicUrl}?t=${Date.now()}`, { method: "HEAD" });
          status[path] = res.ok;
        } catch { status[path] = false; }
      })
    );
    setTimingStatus({ ...status });
  }, []);

  useEffect(() => { loadMetadata(); checkTimingStatus(); }, []);

  const commitUpload = useCallback(async (fileContent: string) => {
    setUploading(true);
    try {
      const filePath = getFilePath(selectedCourse, selectedModule);
      const effectiveCourse = selectedModule === "shadowing-pronunciation" ? "shared" : selectedCourse;

      const blob = new Blob([fileContent], { type: "application/json" });
      const { error: uploadError } = await supabase.storage.from("curriculums").upload(filePath, blob, { upsert: true });
      if (uploadError) throw uploadError;

      await supabase.from("curriculum_metadata").update({ is_active: false }).eq("course_type", effectiveCourse).eq("module_type", selectedModule).eq("is_active", true);

      const { data: versionData } = await supabase.from("curriculum_metadata").select("version").eq("course_type", effectiveCourse).eq("module_type", selectedModule).order("version", { ascending: false }).limit(1);
      const nextVersion = (versionData?.[0]?.version ?? 0) + 1;

      await supabase.from("curriculum_metadata").insert({
        course_type: effectiveCourse, module_type: selectedModule, file_path: filePath,
        version: nextVersion, is_active: true, uploaded_by: user?.id ?? null,
      });

      const timingPath = getTimingPath(filePath);
      if (timingPath) await supabase.storage.from("curriculums").remove([timingPath]);

      clearTimingsCache();
      clearPronunciationCache();

      toast({ title: "Curriculum uploaded", description: `v${nextVersion} is now active for ${effectiveCourse.toUpperCase()} ${selectedModule}. Timing file invalidated.` });
      await loadMetadata();
      await checkTimingStatus();
    } catch (err) {
      toast({ title: "Upload failed", description: String(err), variant: "destructive" });
    } finally {
      setUploading(false);
    }
  }, [selectedCourse, selectedModule, user?.id]);

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (fileInputRef.current) fileInputRef.current.value = "";
    try {
      if (file.name.endsWith(".csv")) {
        const csvText = await file.text();
        const curriculumData = parseCSVToCurriculum(csvText);
        const jsonContent = JSON.stringify(curriculumData, null, 2);
        setPreviewData(curriculumData);
        setPreviewFileName(file.name);
        setPendingContent(jsonContent);
      } else {
        const fileContent = await file.text();
        const normalised = normaliseCurriculumText(fileContent, selectedModule);
        await commitUpload(normalised);
      }
    } catch (err) {
      toast({ title: "File error", description: String(err), variant: "destructive" });
    }
  };

  const handlePreviewConfirm = async () => {
    if (pendingContent) await commitUpload(pendingContent);
    setPreviewData(null); setPendingContent(null); setPreviewFileName("");
  };

  const handleDownloadGuide = () => {
    const blob = new Blob([FORMATTING_GUIDE], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "ai-curriculum-formatting-guide.txt"; a.click();
    URL.revokeObjectURL(url);
  };

  // --- Timing jobs (now launch popup worker) ---
  const launchTimingJob = async (
    label: string,
    storagePath: string,
    getChunks: () => Promise<string[]>,
    accent = "uk",
    rate = 0.8
  ) => {
    if (isMeasuring) return;
    setIsMeasuring(true);
    setMeasureLabel(label);
    clearTimingsCache();

    try {
      const chunks = await getChunks();
      if (chunks.length === 0) throw new Error("No chunks found");

      launchTimingWorker({
        chunks,
        accent,
        rate,
        storagePath,
        supabaseUrl: SUPABASE_URL,
        anonKey: ANON_KEY,
        jobLabel: label,
      });
    } catch (err) {
      setIsMeasuring(false);
      setMeasureLabel("");
      toast({ title: "Failed to start timing", description: String(err), variant: "destructive" });
    }
  };

  const TIMING_JOBS = [
    {
      label: "Time IELTS Fluency",
      path: "ielts/timings-shadowing-fluency.json",
      run: () => launchTimingJob("Time IELTS Fluency", "ielts/timings-shadowing-fluency.json", () => getFluencyChunkTexts("ielts")),
    },
    {
      label: "Time IGCSE Fluency",
      path: "igcse/timings-shadowing-fluency.json",
      run: () => launchTimingJob("Time IGCSE Fluency", "igcse/timings-shadowing-fluency.json", () => getFluencyChunkTexts("igcse")),
    },
    {
      label: "Time Pronunciation",
      path: "shared/timings-shadowing-pronunciation.json",
      run: () => launchTimingJob("Time Pronunciation", "shared/timings-shadowing-pronunciation.json", () => getPronunciationChunkTexts()),
    },
  ];

  const handleMeasureSingle = async (jobIndex: number) => {
    const job = TIMING_JOBS[jobIndex];
    if (!job) return;
    await job.run();
  };

  const handleMeasureAll = async (force: boolean) => {
    if (isMeasuring) return;
    clearTimingsCache();

    let pending = TIMING_JOBS;
    if (!force) {
      pending = [];
      for (const job of TIMING_JOBS) {
        const { data } = supabase.storage.from("curriculums").getPublicUrl(job.path);
        if (data?.publicUrl) {
          try { const res = await fetch(`${data.publicUrl}?t=${Date.now()}`, { method: "HEAD" }); if (res.ok) continue; } catch {}
        }
        pending.push(job);
      }
    }

    if (pending.length === 0) {
      toast({ title: "All timings already exist", description: "No missing timing files to measure." });
      return;
    }

    // Launch the first pending job — subsequent ones need manual trigger
    // (popup can only run one job at a time)
    await pending[0].run();
    if (pending.length > 1) {
      toast({ title: `${pending.length} jobs need timing`, description: `Started "${pending[0].label}". Run remaining jobs after this completes.` });
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
      {/* Upload Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Upload className="w-4 h-4 text-amber-400" />
          <h2 className="text-sm font-bold text-white/90">Upload New Curriculum</h2>
        </div>

        <div className="flex items-end gap-2">
          {selectedModule !== "shadowing-pronunciation" ? (
            <div className="flex-1">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1">Course</label>
              <select value={selectedCourse} onChange={(e) => setSelectedCourse(e.target.value)} className="w-full bg-white/[0.05] border border-white/[0.12] rounded-lg px-2.5 py-1.5 text-xs text-white/80 focus:outline-none focus:border-amber-400/40 transition-all">
                {COURSE_OPTIONS.map((o) => <option key={o.value} value={o.value} className="bg-gray-900">{o.label}</option>)}
              </select>
            </div>
          ) : (
            <div className="flex-1">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1">Course</label>
              <div className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-xs text-amber-300/70">Shared (IELTS + IGCSE)</div>
            </div>
          )}
          <div className="flex-1">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1">Module</label>
            <select value={selectedModule} onChange={(e) => setSelectedModule(e.target.value)} className="w-full bg-white/[0.05] border border-white/[0.12] rounded-lg px-2.5 py-1.5 text-xs text-white/80 focus:outline-none focus:border-amber-400/40 transition-all">
              {MODULE_OPTIONS.map((o) => <option key={o.value} value={o.value} className="bg-gray-900">{o.label}</option>)}
            </select>
          </div>
          <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 border border-amber-400/30 text-amber-200 text-[11px] font-bold hover:bg-amber-500/30 transition-all whitespace-nowrap disabled:opacity-50">
            {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
            {uploading ? "Uploading…" : "Upload"}
          </button>
          <input ref={fileInputRef} type="file" accept=".json,.txt,.docx,.csv" onChange={handleFileSelected} className="hidden" />
        </div>
        <p className="text-[10px] text-white/35">Target: {getFilePath(selectedCourse, selectedModule)} · Accepts .json, .csv, .txt, .docx</p>

        <div className="flex items-center gap-1.5 flex-wrap">
          <button onClick={handleDownloadGuide} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-teal-500/15 border border-teal-400/20 text-teal-300 text-[10px] font-bold hover:bg-teal-500/25 transition-all">
            <Download className="w-3 h-3" /> AI Guide
          </button>
          <CurriculumTimingControls
            isMeasuring={isMeasuring}
            measureLabel={measureLabel}
            measureProgress={measureProgress}
            timingStatus={timingStatus}
            timingJobs={TIMING_JOBS}
            onMeasureAll={handleMeasureAll}
            onMeasureSingle={handleMeasureSingle}
            onCancel={() => { cancelTimingWorker(); }}
          />
        </div>

        {isMeasuring && (
          <p className="text-[10px] text-amber-300/60 animate-pulse">
            ⏳ Running in background popup — you can continue working here
          </p>
        )}
      </div>

      <CurriculumVersionsTable metadata={metadata} />

      {previewData && (
        <CurriculumPreviewModal
          data={previewData}
          fileName={previewFileName}
          onConfirm={handlePreviewConfirm}
          onCancel={() => { setPreviewData(null); setPendingContent(null); setPreviewFileName(""); }}
        />
      )}
    </div>
  );
}
