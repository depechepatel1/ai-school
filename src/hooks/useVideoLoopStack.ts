const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const STORAGE_BASE = `${SUPABASE_URL}/storage/v1/object/public/videos`;
const CACHE_BUST = "?v=2";

/** Hardcoded list of loop-stack clips — no network request needed */
const VIDEO_STACK = Array.from({ length: 13 }, (_, i) =>
  `${STORAGE_BASE}/loop-stack/${i + 1}.mp4${CACHE_BUST}`
);

/**
 * Returns the hardcoded video loop stack immediately.
 * Videos are cached by the service worker after first play (CacheFirst strategy).
 */
export function useVideoLoopStack() {
  return { videoList: VIDEO_STACK, isLoading: false };
}

/** For non-hook contexts (e.g. prefetch) */
export function fetchVideoLoopStack(): string[] {
  return VIDEO_STACK;
}
