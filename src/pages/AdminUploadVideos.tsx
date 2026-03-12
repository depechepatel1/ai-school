import { useState, useCallback, useRef, useEffect } from "react";
import { Check, Upload, Film, Loader2, Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

interface VideoSlot {
  label: string;
  path: string;
  existsInStorage: boolean;
}

type UploadStatus = "idle" | "uploading" | "done" | "error";

const FIXED_SLOTS: Omit<VideoSlot, "existsInStorage">[] = [
  { label: "Intro", path: "intro.mp4" },
  { label: "Analysis Background", path: "analysis-bg.mp4" },
];

export default function AdminUploadVideos() {
  const [slots, setSlots] = useState<VideoSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [statuses, setStatuses] = useState<Record<string, UploadStatus>>({});
  const [progress, setProgress] = useState<Record<string, number>>({});
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Discover existing loop-stack files from storage
  useEffect(() => {
    (async () => {
      const { data: loopFiles } = await supabase.storage
        .from("videos")
        .list("loop-stack", { sortBy: { column: "name", order: "asc" } });

      const loopSlots: VideoSlot[] = (loopFiles ?? [])
        .filter((f) => f.name.endsWith(".mp4"))
        .sort((a, b) => {
          const numA = parseInt(a.name, 10);
          const numB = parseInt(b.name, 10);
          if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
          return a.name.localeCompare(b.name);
        })
        .map((f) => ({
          label: `Loop ${f.name.replace(".mp4", "")}`,
          path: `loop-stack/${f.name}`,
          existsInStorage: true,
        }));

      // If no loop files exist yet, show slots 1-13 as placeholders
      if (loopSlots.length === 0) {
        for (let i = 1; i <= 13; i++) {
          loopSlots.push({
            label: `Loop ${i}`,
            path: `loop-stack/${i}.mp4`,
            existsInStorage: false,
          });
        }
      }

      const fixedWithStatus = FIXED_SLOTS.map((s) => ({ ...s, existsInStorage: true }));
      const allSlots = [...fixedWithStatus.slice(0, 1), ...loopSlots, ...fixedWithStatus.slice(1)];

      setSlots(allSlots);
      setStatuses(Object.fromEntries(allSlots.map((s) => [s.path, "idle"])));
      setProgress(Object.fromEntries(allSlots.map((s) => [s.path, 0])));
      setLoading(false);
    })();
  }, []);

  const uploadFile = useCallback(async (file: File, slot: VideoSlot) => {
    setStatuses((s) => ({ ...s, [slot.path]: "uploading" }));
    setProgress((p) => ({ ...p, [slot.path]: 10 }));

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("path", slot.path);

      setProgress((p) => ({ ...p, [slot.path]: 30 }));

      const res = await fetch(`${SUPABASE_URL}/functions/v1/upload-video-file`, {
        method: "POST",
        headers: { apikey: SUPABASE_KEY },
        body: formData,
      });

      setProgress((p) => ({ ...p, [slot.path]: 80 }));

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");

      setProgress((p) => ({ ...p, [slot.path]: 100 }));
      setStatuses((s) => ({ ...s, [slot.path]: "done" }));
      toast({ title: `✅ ${slot.label} uploaded successfully` });
    } catch (err: any) {
      setStatuses((s) => ({ ...s, [slot.path]: "error" }));
      setProgress((p) => ({ ...p, [slot.path]: 0 }));
      toast({ title: `❌ ${slot.label} failed`, description: err.message, variant: "destructive" });
    }
  }, []);

  const deleteLoopClip = useCallback(async (slot: VideoSlot) => {
    if (!slot.path.startsWith("loop-stack/")) return;
    if (!confirm(`Delete ${slot.label} from storage? This cannot be undone.`)) return;

    try {
      const { error } = await supabase.storage.from("videos").remove([slot.path]);
      if (error) throw error;

      setSlots((prev) => prev.filter((s) => s.path !== slot.path));
      setStatuses((s) => { const copy = { ...s }; delete copy[slot.path]; return copy; });
      setProgress((p) => { const copy = { ...p }; delete copy[slot.path]; return copy; });
      toast({ title: `🗑️ ${slot.label} deleted` });
    } catch (err: any) {
      toast({ title: `❌ Delete failed`, description: err.message, variant: "destructive" });
    }
  }, []);

  const addLoopSlot = () => {
    // Find next available number
    const loopNumbers = slots
      .filter((s) => s.path.startsWith("loop-stack/"))
      .map((s) => parseInt(s.path.replace("loop-stack/", "").replace(".mp4", ""), 10))
      .filter((n) => !isNaN(n));
    const nextNum = loopNumbers.length > 0 ? Math.max(...loopNumbers) + 1 : 1;
    const newSlot: VideoSlot = {
      label: `Loop ${nextNum}`,
      path: `loop-stack/${nextNum}.mp4`,
      existsInStorage: false,
    };

    setSlots((prev) => {
      // Insert before the last fixed slot (Analysis Background)
      const analysisIdx = prev.findIndex((s) => s.path === "analysis-bg.mp4");
      if (analysisIdx === -1) return [...prev, newSlot];
      const copy = [...prev];
      copy.splice(analysisIdx, 0, newSlot);
      return copy;
    });
    setStatuses((s) => ({ ...s, [newSlot.path]: "idle" }));
    setProgress((p) => ({ ...p, [newSlot.path]: 0 }));
  };

  const handleFileSelect = (slot: VideoSlot, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file, slot);
  };

  const handleDrop = (slot: VideoSlot, e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type === "video/mp4") {
      uploadFile(file, slot);
    } else {
      toast({ title: "Please drop an .mp4 file", variant: "destructive" });
    }
  };

  const doneCount = Object.values(statuses).filter((s) => s === "done").length;
  const loopCount = slots.filter((s) => s.path.startsWith("loop-stack/")).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6 md:p-10">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Upload Videos</h1>
          <p className="text-muted-foreground">
            Drop your re-encoded H.264 .mp4 files into each slot. {loopCount} loop clips detected. {doneCount} uploaded this session.
          </p>
          <Progress value={slots.length > 0 ? (doneCount / slots.length) * 100 : 0} className="h-2" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {slots.map((slot) => {
            const status = statuses[slot.path];
            const prog = progress[slot.path];

            return (
              <Card
                key={slot.path}
                className={`transition-colors ${
                  status === "done"
                    ? "border-green-500/50 bg-green-500/5"
                    : status === "error"
                    ? "border-destructive/50 bg-destructive/5"
                    : slot.existsInStorage
                    ? "border-emerald-500/20"
                    : "hover:border-primary/30"
                }`}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(slot, e)}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Film className="h-4 w-4 text-muted-foreground" />
                    {slot.label}
                    {status === "done" && <Check className="ml-auto h-5 w-5 text-green-500" />}
                    {status !== "done" && slot.existsInStorage && slot.path.startsWith("loop-stack/") && (
                      <div className="ml-auto flex items-center gap-1.5">
                        <span className="text-[9px] uppercase tracking-wider text-emerald-400 font-bold">In Storage</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteLoopClip(slot); }}
                          className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          title={`Delete ${slot.label}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                    {status !== "done" && slot.existsInStorage && !slot.path.startsWith("loop-stack/") && (
                      <span className="ml-auto text-[9px] uppercase tracking-wider text-emerald-400 font-bold">In Storage</span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-xs text-muted-foreground font-mono">{slot.path}</p>

                  {status === "uploading" ? (
                    <div className="space-y-2">
                      <Progress value={prog} className="h-1.5" />
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Loader2 className="h-3 w-3 animate-spin" /> Uploading…
                      </div>
                    </div>
                  ) : status === "done" ? (
                    <p className="text-sm text-green-600 font-medium">Uploaded ✓</p>
                  ) : (
                    <>
                      <input
                        type="file"
                        accept="video/mp4"
                        className="hidden"
                        ref={(el) => (fileInputRefs.current[slot.path] = el)}
                        onChange={(e) => handleFileSelect(slot, e)}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => fileInputRefs.current[slot.path]?.click()}
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        {slot.existsInStorage ? "Replace .mp4" : "Choose or drop .mp4"}
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            );
          })}

          {/* Add new loop clip card */}
          <Card
            className="border-dashed border-2 border-muted-foreground/20 hover:border-primary/40 transition-colors cursor-pointer flex items-center justify-center min-h-[140px]"
            onClick={addLoopSlot}
          >
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <Plus className="h-8 w-8" />
              <span className="text-sm font-medium">Add Loop Clip</span>
              <span className="text-xs">Will be loop-stack/{loopCount + 1}.mp4</span>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
