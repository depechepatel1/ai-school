import { useState, useCallback, useEffect } from "react";
import { fetchCurriculumPage, fetchNextSentence, fetchCurriculumProgress, saveCurriculumProgress, fetchCurriculumCount } from "@/services/db";
import type { CurriculumItem } from "@/types/speaking";

export function useCurriculum(userId: string | null, practiceType: "pronunciation" | "fluency") {
  const [curriculumItems, setCurriculumItems] = useState<CurriculumItem[]>([]);
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [curriculumOffset, setCurriculumOffset] = useState(0);
  const [curriculumLoading, setCurriculumLoading] = useState(false);
  const [currentTopic, setCurrentTopic] = useState("");
  const [curriculumTotal, setCurriculumTotal] = useState(0);
  const [globalSentenceIndex, setGlobalSentenceIndex] = useState(0);

  const loadCurriculumPage = useCallback(async (offset: number, resumeSortOrder?: number) => {
    setCurriculumLoading(true);
    try {
      const items = await fetchCurriculumPage("pronunciation", offset, 5);
      if (items.length > 0) {
        setCurriculumItems(items);
        setCurriculumOffset(offset);
        let startIdx = 0;
        if (resumeSortOrder !== undefined) {
          const idx = items.findIndex((i) => i.sort_order > resumeSortOrder);
          if (idx !== -1) startIdx = idx;
        }
        setCurrentItemIndex(startIdx);
        setGlobalSentenceIndex(offset + startIdx);
        setCurrentTopic(items[startIdx].topic);
        return items[startIdx].sentence;
      } else if (offset > 0) {
        // End of curriculum reached — wrap around to beginning (non-recursive)
        const firstItems = await fetchCurriculumPage("pronunciation", 0, 5);
        if (firstItems.length > 0) {
          setCurriculumItems(firstItems);
          setCurriculumOffset(0);
          setCurrentItemIndex(0);
          setGlobalSentenceIndex(0);
          setCurrentTopic(firstItems[0].topic);
          return firstItems[0].sentence;
        }
      }
    } catch (err) {
      console.error("Failed to load curriculum:", err);
    } finally {
      setCurriculumLoading(false);
    }
    return null;
  }, []);

  // Load on mount with progress resume
  useEffect(() => {
    if (practiceType !== "pronunciation" || !userId) return;
    (async () => {
      try {
        const total = await fetchCurriculumCount("pronunciation");
        setCurriculumTotal(total);
        const progress = await fetchCurriculumProgress(userId, "pronunciation");
        if (progress && progress.last_sort_order > 0) {
          const nextItem = await fetchNextSentence("pronunciation", progress.last_sort_order);
          if (nextItem) {
            const pageOffset = Math.floor((nextItem.sort_order - 1) / 5) * 5;
            await loadCurriculumPage(pageOffset, progress.last_sort_order);
          } else {
            // Completed entire curriculum — restart from beginning
            await loadCurriculumPage(0);
          }
        } else {
          await loadCurriculumPage(0);
        }
      } catch {
        await loadCurriculumPage(0);
      }
    })();
  }, [userId, practiceType, loadCurriculumPage]);

  const handleNextSentence = useCallback(async (): Promise<string | null> => {
    const nextIdx = currentItemIndex + 1;
    if (nextIdx < curriculumItems.length) {
      setCurrentItemIndex(nextIdx);
      setCurrentTopic(curriculumItems[nextIdx].topic);
      setGlobalSentenceIndex(curriculumOffset + nextIdx);
      return curriculumItems[nextIdx].sentence;
    } else {
      return await loadCurriculumPage(curriculumOffset + 5);
    }
  }, [currentItemIndex, curriculumItems, curriculumOffset, loadCurriculumPage]);

  const saveProgress = useCallback(async (score: number) => {
    const currentItem = curriculumItems[currentItemIndex];
    if (userId && currentItem && practiceType === "pronunciation") {
      await saveCurriculumProgress(userId, "pronunciation", currentItem.sort_order, score).catch(console.error);
    }
  }, [userId, curriculumItems, currentItemIndex, practiceType]);

  const currentSentence = curriculumItems[currentItemIndex]?.sentence ?? null;

  return {
    curriculumItems,
    currentItemIndex,
    curriculumLoading,
    currentTopic,
    curriculumTotal,
    globalSentenceIndex,
    currentSentence,
    loadCurriculumPage,
    handleNextSentence,
    saveProgress,
  };
}
