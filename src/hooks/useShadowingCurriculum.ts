import { useState, useEffect, useCallback } from "react";
import {
  fetchCurriculumJSON,
  getWeekShadowingChunks,
  type CurriculumChunkWithQuestion,
  type CurriculumData,
} from "@/services/curriculum-storage";

/**
 * Hook for shadowing curriculum: loads chunks for the target week,
 * provides infinite looping through chunks.
 */
export function useShadowingCurriculum(
  courseType: "ielts" | "igcse" | null,
  weekNumber: number
) {
  const [chunks, setChunks] = useState<CurriculumChunkWithQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [curriculumData, setCurriculumData] = useState<CurriculumData | null>(null);

  // Fetch curriculum data when course type changes
  useEffect(() => {
    if (!courseType) return;
    setLoading(true);
    fetchCurriculumJSON(courseType)
      .then((data) => {
        setCurriculumData(data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [courseType]);

  // Extract chunks when week or data changes
  useEffect(() => {
    if (!curriculumData || !courseType) return;
    const weekChunks = getWeekShadowingChunks(curriculumData, weekNumber, courseType);
    setChunks(weekChunks);
    setCurrentIndex(0);
  }, [curriculumData, weekNumber, courseType]);

  const currentChunk = chunks[currentIndex] ?? null;

  const nextChunk = useCallback(() => {
    if (chunks.length === 0) return;
    setCurrentIndex((prev) => (prev + 1) % chunks.length);
  }, [chunks.length]);

  const prevChunk = useCallback(() => {
    if (chunks.length === 0) return;
    setCurrentIndex((prev) => (prev - 1 + chunks.length) % chunks.length);
  }, [chunks.length]);

  const resetToFirst = useCallback(() => {
    setCurrentIndex(0);
  }, []);

  return {
    chunks,
    currentChunk,
    currentIndex,
    totalChunks: chunks.length,
    loading,
    nextChunk,
    prevChunk,
    resetToFirst,
    curriculumData,
    currentQuestionText: currentChunk?.question_text ?? null,
    currentSectionId: currentChunk?.section_id ?? null,
    currentQuestionId: currentChunk?.question_id ?? null,
  };
}
