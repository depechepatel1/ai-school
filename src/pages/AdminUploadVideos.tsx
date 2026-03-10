import { useState, useCallback, useRef } from "react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Check, Upload, Film, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

interface VideoSlot {
  label: string;
  path: string;
}

const VIDEO_SLOTS: VideoSlot[] = [
  { label: "Intro", path: "intro.mp4" },
  ...Array.from({ length: 10 }, (_, i) => ({
    label: `Loop ${i + 1}`,
    path: `loop-stack/${i + 1}.mp4`,
  })),
  { label: "Analysis Background", path: "analysis-bg.mp4" },
];

type UploadStatus = "idle" | "uploading" | "done" | "error";

export default function AdminUploadVideos() {
  usePageTitle("Upload Videos");
  const [statuses, setStatuses] = useState<Record<string, UploadStatus>>(
    Object.fromEntries(VIDEO_SLOTS.map((s) => [s.path, "idle"]))
  );
  const [progress, setProgress] = useState<Record<string, number>>(
    Object.fromEntries(VIDEO_SLOTS.map((s) => [s.path, 0]))
  );
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

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

  return (
    <div className="min-h-screen bg-background p-6 md:p-10">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Upload Videos</h1>
          <p className="text-muted-foreground">
            Drop your re-encoded H.264 .mp4 files into each slot below. {doneCount}/{VIDEO_SLOTS.length} complete.
          </p>
          <Progress value={(doneCount / VIDEO_SLOTS.length) * 100} className="h-2" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {VIDEO_SLOTS.map((slot) => {
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
                        Choose or drop .mp4
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
