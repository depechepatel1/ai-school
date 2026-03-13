/**
 * CMU Pronouncing Dictionary — stress lookup
 * Loaded lazily on first use, cached in memory.
 * Format: word → [syllableCount, primaryStressIndex]
 */

let cache: Record<string, [number, number]> | null = null;
let loading: Promise<void> | null = null;

async function load() {
  if (cache) return;
  try {
    const res = await fetch("/data/stress-dict.json");
    cache = await res.json();
  } catch (e) {
    console.warn("[StressDict] Failed to load, falling back to heuristics:", e);
    cache = {};
  }
}

/** Preload the dictionary — call this early on pronunciation/fluency screens */
export function preloadStressDict(): void {
  if (!loading) loading = load();
}

/** Look up a word. Returns [syllableCount, stressIndex] or null if unknown. */
export function lookupStress(word: string): [number, number] | null {
  if (!cache) return null;
  return cache[word.toLowerCase().replace(/[^a-z]/g, "")] ?? null;
}

/** Whether the dictionary is loaded and ready */
export function isStressDictReady(): boolean {
  return cache !== null;
}
