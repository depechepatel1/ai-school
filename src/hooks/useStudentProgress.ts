/**
 * Hook for persistent student progress using the student_progress table.
 * Used for tracking position across sessions (e.g. tongue twister index).
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

interface UseStudentProgressOptions {
  userId: string | null;
  courseType: string;
  moduleType: string;
}

interface ProgressPosition {
  index: number;
  [key: string]: any;
}

export function useStudentProgress({ userId, courseType, moduleType }: UseStudentProgressOptions) {
  const [position, setPosition] = useState<ProgressPosition>({ index: 0 });
  const [loading, setLoading] = useState(true);
  const positionRef = useRef(position);

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
          const pos = data.current_position as any;
          setPosition({ index: pos.index ?? 0, ...pos });
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

    try {
      await supabase
        .from("student_progress")
        .upsert({
          student_id: userId,
          course_type: courseType,
          module_type: moduleType,
          current_position: newPosition as any,
          last_accessed: new Date().toISOString(),
        }, {
          onConflict: "student_id,course_type,module_type",
        });
    } catch (err) {
      console.error("useStudentProgress save error:", err);
    }
  }, [userId, courseType, moduleType]);

  return { position, loading, savePosition };
}
