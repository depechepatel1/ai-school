import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Course-specific time targets in seconds per activity.
 * IELTS: Shadowing 15m, Pronunciation 10m, Speaking 15m
 * IGCSE: Shadowing 10m, Pronunciation 10m, Speaking 10m
 */
const TIME_TARGETS: Record<string, Record<string, number>> = {
  ielts: { shadowing: 900, pronunciation: 600, speaking: 900 },
  igcse: { shadowing: 600, pronunciation: 600, speaking: 600 },
};

export type ActivityType = "shadowing" | "pronunciation" | "speaking";

interface UsePracticeTimerOptions {
  userId: string | null;
  courseType: "ielts" | "igcse" | null;
  activityType: ActivityType;
  weekNumber: number;
  /** Whether audio is actively being produced (recording or TTS playing) */
  isAudioActive: boolean;
}

interface PracticeTimerState {
  /** Seconds practiced in this session */
  activeSeconds: number;
  /** Target seconds for this activity */
  targetSeconds: number;
  /** Seconds remaining until target (negative = overtime) */
  remainingSeconds: number;
  /** Whether the timer is currently counting */
  isRunning: boolean;
  /** Whether the target has been reached */
  isComplete: boolean;
  /** Whether overtime (past target) */
  isOvertime: boolean;
  /** Display time: countdown before target, count-up after */
  displaySeconds: number;
  /** Whether in countdown mode (true) or count-up mode (false) */
  isCountdown: boolean;
  /** Pause the timer manually */
  pause: () => void;
  /** Resume the timer manually */
  resume: () => void;
  /** Reset and start fresh */
  reset: () => void;
}

export function usePracticeTimer({
  userId,
  courseType,
  activityType,
  weekNumber,
  isAudioActive,
}: UsePracticeTimerOptions): PracticeTimerState {
  const [activeSeconds, setActiveSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [manualPause, setManualPause] = useState(false);
  const logIdRef = useRef<string | null>(null);
  const saveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const activeSecondsRef = useRef(0);

  const targetSeconds =
    courseType && TIME_TARGETS[courseType]
      ? TIME_TARGETS[courseType][activityType] ?? 600
      : 600;

  // Keep ref in sync
  useEffect(() => {
    activeSecondsRef.current = activeSeconds;
  }, [activeSeconds]);

  // Auto-pause/resume based on audio activity
  useEffect(() => {
    if (manualPause) return;
    setIsRunning(isAudioActive);
  }, [isAudioActive, manualPause]);

  // Core timer tick
  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => {
      setActiveSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isRunning]);

  // Create/load log entry when activity starts
  useEffect(() => {
    if (!userId || !courseType) return;
    logIdRef.current = null;

    // Try to find today's existing log for this activity
    const loadOrCreate = async () => {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const { data: existing } = await supabase
        .from("student_practice_logs")
        .select("id, active_seconds")
        .eq("user_id", userId)
        .eq("activity_type", activityType)
        .eq("week_number", weekNumber)
        .gte("created_at", todayStart.toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existing) {
        logIdRef.current = existing.id;
        setActiveSeconds(existing.active_seconds);
      } else {
        const { data: newLog } = await supabase
          .from("student_practice_logs")
          .insert({
            user_id: userId,
            course_type: courseType,
            activity_type: activityType,
            week_number: weekNumber,
            target_seconds: targetSeconds,
            active_seconds: 0,
          })
          .select("id")
          .single();
        if (newLog) logIdRef.current = newLog.id;
        setActiveSeconds(0);
      }
    };

    loadOrCreate().catch(console.error);
  }, [userId, courseType, activityType, weekNumber, targetSeconds]);

  // Periodic save (every 10 seconds while running)
  useEffect(() => {
    if (!isRunning || !logIdRef.current) return;

    saveIntervalRef.current = setInterval(() => {
      if (logIdRef.current) {
        supabase
          .from("student_practice_logs")
          .update({ active_seconds: activeSecondsRef.current })
          .eq("id", logIdRef.current)
          .then(() => {});
      }
    }, 10_000);

    return () => {
      if (saveIntervalRef.current) clearInterval(saveIntervalRef.current);
    };
  }, [isRunning]);

  // Save on unmount or activity change
  useEffect(() => {
    return () => {
      if (logIdRef.current && activeSecondsRef.current > 0) {
        supabase
          .from("student_practice_logs")
          .update({ active_seconds: activeSecondsRef.current })
          .eq("id", logIdRef.current)
          .then(() => {});
      }
    };
  }, [activityType]);

  const remaining = targetSeconds - activeSeconds;
  const isComplete = activeSeconds >= targetSeconds;
  const isOvertime = activeSeconds > targetSeconds;

  const pause = useCallback(() => {
    setManualPause(true);
    setIsRunning(false);
  }, []);

  const resume = useCallback(() => {
    setManualPause(false);
    // Will auto-resume via isAudioActive effect
  }, []);

  const reset = useCallback(() => {
    setActiveSeconds(0);
    setManualPause(false);
  }, []);

  return {
    activeSeconds,
    targetSeconds,
    remainingSeconds: remaining,
    isRunning,
    isComplete,
    isOvertime,
    // Before target: show countdown. After target: show overtime count-up
    displaySeconds: isComplete ? activeSeconds - targetSeconds : remaining,
    isCountdown: !isComplete,
    pause,
    resume,
    reset,
  };
}
