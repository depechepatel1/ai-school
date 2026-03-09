/**
 * Hooks for loading pre-measured TTS timing data.
 */
import { useState, useEffect, useCallback } from "react";
import { fetchFluencyTimings, fetchPronunciationTimings } from "@/services/tts-timings-storage";

interface TimingsHook {
  /** Get the measured duration for a text chunk, or null if not available */
  getDuration: (text: string) => number | null;
  loading: boolean;
}

/**
 * Load fluency timings for a course type (ielts/igcse).
 */
export function useFluencyTimings(courseType: "ielts" | "igcse" | null): TimingsHook {
  const [timings, setTimings] = useState<Record<string, number> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!courseType) {
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchFluencyTimings(courseType)
      .then((data) => setTimings(data))
      .catch(() => setTimings(null))
      .finally(() => setLoading(false));
  }, [courseType]);

  const getDuration = useCallback(
    (text: string): number | null => {
      if (!timings) return null;
      return timings[text] ?? null;
    },
    [timings]
  );

  return { getDuration, loading };
}

/**
 * Load pronunciation (tongue twister) timings.
 */
export function usePronunciationTimings(): TimingsHook {
  const [timings, setTimings] = useState<Record<string, number> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPronunciationTimings()
      .then((data) => setTimings(data))
      .catch(() => setTimings(null))
      .finally(() => setLoading(false));
  }, []);

  const getDuration = useCallback(
    (text: string): number | null => {
      if (!timings) return null;
      return timings[text] ?? null;
    },
    [timings]
  );

  return { getDuration, loading };
}
