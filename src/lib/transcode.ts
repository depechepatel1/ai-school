import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

let ffmpeg: FFmpeg | null = null;

async function getFFmpeg(): Promise<FFmpeg> {
  if (ffmpeg && ffmpeg.loaded) return ffmpeg;

  ffmpeg = new FFmpeg();

  const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";
  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
  });

  return ffmpeg;
}

/** Check first 64KB for avc1/avc3 signatures indicating H.264 */
async function isAlreadyH264(file: File): Promise<boolean> {
  const chunk = await file.slice(0, 65536).arrayBuffer();
  const text = new TextDecoder("ascii", { fatal: false }).decode(new Uint8Array(chunk));
  return text.includes("avc1") || text.includes("avc3");
}

/** Try to extract video bitrate from file using ffprobe-like approach */
async function probeVideoBitrate(ff: FFmpeg): Promise<number | null> {
  try {
    let logOutput = "";
    const logHandler = ({ message }: { message: string }) => {
      logOutput += message + "\n";
    };
    ff.on("log", logHandler);

    // Run a quick pass to get stream info
    await ff.exec(["-i", "input.mp4", "-f", "null", "-t", "0.1", "-"]).catch(() => {});

    ff.off("log", logHandler);

    // Parse bitrate from "bitrate: 1234 kb/s" or "Video: ... 1234 kb/s"
    const bitrateMatch = logOutput.match(/bitrate:\s*(\d+)\s*kb\/s/i);
    if (bitrateMatch) {
      return parseInt(bitrateMatch[1], 10);
    }

    // Try stream-level bitrate
    const streamMatch = logOutput.match(/Video:.*?(\d+)\s*kb\/s/i);
    if (streamMatch) {
      return parseInt(streamMatch[1], 10);
    }

    return null;
  } catch {
    return null;
  }
}

export type TranscodeProgress = {
  phase: "loading" | "probing" | "transcoding" | "done";
  percent: number; // 0-100
};

/**
 * Transcode a video file to H.264/AAC at source-matched quality.
 * Returns the original file if already H.264 or if transcoding fails.
 */
export async function transcodeToH264(
  file: File,
  onProgress?: (p: TranscodeProgress) => void,
): Promise<{ file: File; wasTranscoded: boolean }> {
  // Skip if already H.264
  if (await isAlreadyH264(file)) {
    onProgress?.({ phase: "done", percent: 100 });
    return { file, wasTranscoded: false };
  }

  try {
    onProgress?.({ phase: "loading", percent: 5 });
    const ff = await getFFmpeg();

    // Write input file
    onProgress?.({ phase: "probing", percent: 15 });
    await ff.writeFile("input.mp4", await fetchFile(file));

    // Probe bitrate
    const bitrateKbps = await probeVideoBitrate(ff);

    // Set up progress tracking during transcode
    ff.on("progress", ({ progress }) => {
      // Map ffmpeg progress (0-1) to our 20-95 range
      const pct = 20 + Math.round(progress * 75);
      onProgress?.({ phase: "transcoding", percent: Math.min(pct, 95) });
    });

    onProgress?.({ phase: "transcoding", percent: 20 });

    // Build ffmpeg args based on whether we got bitrate info
    const args: string[] = ["-i", "input.mp4", "-c:v", "libx264"];

    if (bitrateKbps && bitrateKbps > 0) {
      // Bitrate-matched mode
      const br = `${bitrateKbps}k`;
      const bufsize = `${bitrateKbps * 2}k`;
      args.push("-b:v", br, "-maxrate", br, "-bufsize", bufsize);
    } else {
      // Visually lossless fallback
      args.push("-crf", "18");
    }

    args.push(
      "-preset", "slow",
      "-c:a", "aac",
      "-b:a", "192k",
      "-movflags", "+faststart",
      "-y",
      "output.mp4",
    );

    await ff.exec(args);

    const outputData = await ff.readFile("output.mp4");

    // Clean up
    await ff.deleteFile("input.mp4").catch(() => {});
    await ff.deleteFile("output.mp4").catch(() => {});

    const raw = outputData as unknown as Uint8Array;
    const outputBlob = new Blob([raw.slice().buffer], { type: "video/mp4" });
    const outputFile = new File([outputBlob], file.name, { type: "video/mp4" });

    onProgress?.({ phase: "done", percent: 100 });
    return { file: outputFile, wasTranscoded: true };
  } catch (err) {
    console.error("[transcode] Failed, using original file:", err);
    onProgress?.({ phase: "done", percent: 100 });
    return { file, wasTranscoded: false };
  }
}
