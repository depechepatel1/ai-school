import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchStudentCourseType, fetchSelectedWeek, updateSelectedWeek } from "@/services/db";

/**
 * Hook to determine the student's course type (IELTS or IGCSE)
 * and manage their selected working week.
 */
export function useCourseWeek(userId: string | null) {
  const [selectedWeekOverride, setSelectedWeekOverride] = useState<number | null>(null);

  const { data: courseType = null, isLoading: ctLoading } = useQuery({
    queryKey: ["course-type", userId],
    enabled: !!userId,
    staleTime: 300_000,
    queryFn: async () => {
      const ct = await fetchStudentCourseType(userId!);
      return (ct as "ielts" | "igcse") ?? null;
    },
  });

  const { data: fetchedWeek = 1, isLoading: weekLoading } = useQuery({
    queryKey: ["selected-week", userId],
    enabled: !!userId,
    staleTime: 300_000,
    queryFn: async () => {
      const week = await fetchSelectedWeek(userId!);
      return week ?? 1;
    },
  });

  const selectedWeek = selectedWeekOverride ?? fetchedWeek;
  const loading = ctLoading || weekLoading;

  const setSelectedWeek = useCallback(
    async (week: number) => {
      setSelectedWeekOverride(week);
      if (userId) {
        await updateSelectedWeek(userId, week).catch(console.error);
      }
    },
    [userId]
  );

  // Shadowing uses NEXT week's content
  const shadowingWeek = selectedWeek >= 20 ? 1 : selectedWeek + 1;

  return {
    courseType,
    selectedWeek,
    setSelectedWeek,
    shadowingWeek,
    loading,
  };
}
