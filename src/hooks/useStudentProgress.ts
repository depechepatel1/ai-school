/**
 * Hook for persistent student progress using the student_progress table.
 * Used for tracking position across sessions (e.g. tongue twister index).
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

interface UseStudentProgressOptions {
  userId: string | null;
  courseType: string;
  moduleType: string;
}

interface ProgressPosition {
  index: number;
  [key: string]: Json | undefined;
}

export function useStudentProgress({ userId, courseType, moduleType }: UseStudentProgressOptions) {
  const [position, setPosition] = useState<ProgressPosition>({ index: 0 });
  const [loading, setLoading] = useState(true);
  const positionRef = useRef(position);
  const savingRef = useRef(false);
  const pendingRef = useRef<ProgressPosition | null>(null);

  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  // Load saved position
  useEffect(() => {
    if (!userId) { setLoading(false); return; }

    (async () => {
      try {
        const { data } = await supabase
          .from("student_progress")
          .select("current_position")
          .eq("student_id", userId)
          .eq("course_type", courseType)
          .eq("module_type", moduleType)
          .maybeSingle();

        if (data?.current_position) {
          const pos = data.current_position as Record<string, unknown>;
          const index = typeof pos.index === "number" ? pos.index : 0;
          setPosition({ ...pos, index } as ProgressPosition);
        }
      } catch (err) {
        console.error("useStudentProgress load error:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [userId, courseType, moduleType]);

  const savePosition = useCallback(async (newPosition: ProgressPosition) => {
    setPosition(newPosition);
    if (!userId) return;

    // Queue if a save is already in flight
    if (savingRef.current) {
      pendingRef.current = newPosition;
      return;
    }

    savingRef.current = true;
    try {
      const { data: existing } = await supabase
        .from("student_progress")
        .select("id")
        .eq("student_id", userId)
        .eq("course_type", courseType)
        .eq("module_type", moduleType)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("student_progress")
          .update({
            current_position: newPosition as unknown as Json,
            last_accessed: new Date().toISOString(),
          })
          .eq("id", existing.id);
      } else {
        await supabase
          .from("student_progress")
          .insert({
            student_id: userId,
            course_type: courseType,
            module_type: moduleType,
            current_position: newPosition as unknown as Json,
          });
      }
    } catch (err) {
      console.error("useStudentProgress save error:", err);
    } finally {
      savingRef.current = false;
      // Process queued save if any
      const pending = pendingRef.current;
      if (pending) {
        pendingRef.current = null;
        savePosition(pending);
      }
    }
  }, [userId, courseType, moduleType]);

  return { position, loading, savePosition };
}
