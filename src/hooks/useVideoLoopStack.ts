import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const STORAGE_BASE = `${SUPABASE_URL}/storage/v1/object/public/videos`;
const CACHE_BUST = "?v=2";

/**
 * Dynamically discovers loop-stack video clips from the storage bucket.
 * Falls back to a hardcoded list if the listing fails.
 * Results are cached for the session lifetime (staleTime: Infinity).
 */
export function useVideoLoopStack() {
  const { data: videoList = FALLBACK_STACK, isLoading } = useQuery({
    queryKey: ["video-loop-stack"],
    staleTime: Infinity,
    gcTime: Infinity,
    queryFn: async () => {
      const { data, error } = await supabase.storage
        .from("videos")
        .list("loop-stack", { sortBy: { column: "name", order: "asc" } });

      if (error || !data || data.length === 0) return FALLBACK_STACK;

      const mp4Files = data
        .filter((f) => f.name.endsWith(".mp4"))
        .sort((a, b) => {
          // Sort numerically: 1.mp4, 2.mp4, ... 10.mp4, 11.mp4
          const numA = parseInt(a.name, 10);
          const numB = parseInt(b.name, 10);
          if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
          return a.name.localeCompare(b.name);
        })
        .map((f) => `${STORAGE_BASE}/loop-stack/${f.name}${CACHE_BUST}`);

      return mp4Files.length > 0 ? mp4Files : FALLBACK_STACK;
    },
  });

  return { videoList, isLoading };
}

/** Static fallback in case bucket listing fails */
const FALLBACK_STACK = Array.from({ length: 13 }, (_, i) =>
  `${STORAGE_BASE}/loop-stack/${i + 1}.mp4${CACHE_BUST}`
);

/** For non-hook contexts (e.g. prefetch), fetch once */
export async function fetchVideoLoopStack(): Promise<string[]> {
  const { data, error } = await supabase.storage
    .from("videos")
    .list("loop-stack", { sortBy: { column: "name", order: "asc" } });

  if (error || !data || data.length === 0) return FALLBACK_STACK;

  const mp4Files = data
    .filter((f) => f.name.endsWith(".mp4"))
    .sort((a, b) => {
      const numA = parseInt(a.name, 10);
      const numB = parseInt(b.name, 10);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.name.localeCompare(b.name);
    })
    .map((f) => `${STORAGE_BASE}/loop-stack/${f.name}${CACHE_BUST}`);

  return mp4Files.length > 0 ? mp4Files : FALLBACK_STACK;
}
