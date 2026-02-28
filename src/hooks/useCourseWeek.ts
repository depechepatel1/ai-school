import { useState, useEffect, useCallback } from "react";
import { fetchStudentCourseType, fetchSelectedWeek, updateSelectedWeek } from "@/services/db";

/**
 * Hook to determine the student's course type (IELTS or IGCSE)
 * and manage their selected working week.
 */
export function useCourseWeek(userId: string | null) {
  const [courseType, setCourseType] = useState<"ielts" | "igcse" | null>(null);
  const [selectedWeek, setSelectedWeekState] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }

    (async () => {
      try {
        const [ct, week] = await Promise.all([
          fetchStudentCourseType(userId),
          fetchSelectedWeek(userId),
        ]);
        if (ct) setCourseType(ct as "ielts" | "igcse");
        if (week) setSelectedWeekState(week);
      } catch (err) {
        console.error("useCourseWeek error:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [userId]);

  const setSelectedWeek = useCallback(
    async (week: number) => {
      setSelectedWeekState(week);
      if (userId) {
        await updateSelectedWeek(userId, week).catch(console.error);
      }
    },
    [userId]
  );

  // Shadowing uses NEXT week's content
  const shadowingWeek = selectedWeek >= 40 ? 1 : selectedWeek + 1;

  return {
    courseType,
    selectedWeek,
    setSelectedWeek,
    shadowingWeek,
    loading,
  };
}
