

## Lossless-Quality Client-Side Transcoding

### Problem
The previous plan used `-crf 23` (moderate compression) which would visibly degrade the AI-generated videos. You need the H.264 output to be indistinguishable from the H.265 source.

### Solution
Use **two-pass constant bitrate matching** in the FFmpeg.wasm transcode step:

1. **Probe the source** — Before transcoding, run `ffprobe` (via FFmpeg.wasm) to extract the original video bitrate.
2. **Transcode at matched bitrate** — Use `-b:v <original_bitrate> -maxrate <original_bitrate> -bufsize <2x_bitrate>` instead of CRF. This ensures the output file uses the same data rate as the input, preserving quality 1:1.
3. **Fallback** — If bitrate detection fails, use `-crf 18 -preset slow` which is considered **visually lossless** (no perceptible difference from the source).

### FFmpeg command
```text
# Quality-matched transcode:
-i input.mp4 -c:v libx264 -b:v {SOURCE_BITRATE} -maxrate {SOURCE_BITRATE} -bufsize {2x} -preset slow -c:a aac -b:a 192k -movflags +faststart output.mp4

# Fallback (visually lossless):
-i input.mp4 -c:v libx264 -crf 18 -preset slow -c:a aac -b:a 192k -movflags +faststart output.mp4
```

### Files to create/edit
- **New: `src/lib/transcode.ts`** — FFmpeg.wasm wrapper that probes source bitrate, then transcodes at matched quality. Reports progress callback for UI.
- **Edit: `src/pages/AdminUploadVideos.tsx`** — Integrate transcode step before upload. Add "Transcoding…" status with progress. Skip transcode if file is already H.264 (check for `avc1` signature in first bytes).
- **Edit: `package.json`** — Add `@ffmpeg/ffmpeg` and `@ffmpeg/util`.

### Key quality guarantees
| Parameter | Value | Why |
|-----------|-------|-----|
| Video bitrate | Matched to source | Same data rate = same quality |
| Audio bitrate | 192k AAC | Higher than previous 128k plan |
| Preset | `slow` | Better compression efficiency at same bitrate |
| movflags | `+faststart` | Enables streaming playback |

### What stays the same from previous plan
- Client-side FFmpeg.wasm (no server needed)
- Lazy WASM loading (~30MB, cached after first use)
- Two-phase progress bar: Transcoding (0–60%) → Uploading (60–100%)
- H.264 detection to skip already-compatible files
- Fallback to upload original if transcoding fails

