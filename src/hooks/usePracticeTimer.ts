import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TIME_TARGETS } from "@/lib/semester";
import { analytics } from "@/services/analytics";

export type ActivityType = "shadowing" | "pronunciation" | "speaking";

export type PracticeMode = "homework" | "independent";

interface UsePracticeTimerOptions {
  userId: string | null;
  courseType: "ielts" | "igcse" | null;
  activityType: ActivityType;
  weekNumber: number;
  practiceMode: PracticeMode;
  /** Whether audio is actively being produced (recording or TTS playing) */
  isAudioActive: boolean;
  /** Whether actual speech is being detected (more accurate than isAudioActive for anti-cheating) */
  isSpeechDetected?: boolean;
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
  practiceMode,
  isAudioActive,
  isSpeechDetected,
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

  // Auto-pause/resume based on actual speech activity
  useEffect(() => {
    if (manualPause) return;
    // If speech detection is available, use it (more accurate).
    // Otherwise fall back to isAudioActive (for pronunciation/fluency where STT isn't running).
    const shouldRun = isSpeechDetected !== undefined ? isSpeechDetected : isAudioActive;
    setIsRunning(shouldRun);
  }, [isAudioActive, isSpeechDetected, manualPause]);

  // Core timer tick
  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => {
      setActiveSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isRunning]);

  // Create/load log entry when activity starts (upsert to prevent duplicates)
  useEffect(() => {
    if (!userId || !courseType) return;
    logIdRef.current = null;

    const loadOrCreate = async () => {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      // First try to find today's existing log
      const { data: existing } = await supabase
        .from("student_practice_logs")
        .select("id, active_seconds")
        .eq("user_id", userId)
        .eq("activity_type", activityType)
        .eq("week_number", weekNumber)
        .eq("practice_mode", practiceMode)
        .gte("created_at", todayStart.toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existing) {
        logIdRef.current = existing.id;
        setActiveSeconds(existing.active_seconds);
      } else {
        // Insert with onConflict to handle race conditions —
        // if two mounts race, one wins and the other becomes a no-op,
        // then we re-query to get the winning row's id.
        const { data: newLog, error } = await supabase
          .from("student_practice_logs")
          .upsert({
            user_id: userId,
            course_type: courseType,
            activity_type: activityType,
            week_number: weekNumber,
            target_seconds: practiceMode === "independent" ? 0 : targetSeconds,
            active_seconds: 0,
            practice_mode: practiceMode,
          }, {
            onConflict: "user_id,activity_type,course_type,week_number,practice_mode,created_date",
            ignoreDuplicates: true,
          })
          .select("id")
          .single();

        if (newLog) {
          logIdRef.current = newLog.id;
          setActiveSeconds(0);
        } else if (error) {
          // Upsert returned nothing (duplicate ignored) — re-fetch the existing row
          const { data: refetched } = await supabase
            .from("student_practice_logs")
            .select("id, active_seconds")
            .eq("user_id", userId)
            .eq("activity_type", activityType)
            .eq("week_number", weekNumber)
            .eq("practice_mode", practiceMode)
            .gte("created_at", todayStart.toISOString())
            .limit(1)
            .maybeSingle();
          if (refetched) {
            logIdRef.current = refetched.id;
            setActiveSeconds(refetched.active_seconds);
          }
        }
      }
    };

    loadOrCreate().catch(console.error);
  }, [userId, courseType, activityType, weekNumber, targetSeconds, practiceMode]);

  // Periodic save (every 10 seconds while running)
  useEffect(() => {
    if (!isRunning || !logIdRef.current) return;

    if (saveIntervalRef.current) clearInterval(saveIntervalRef.current);
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

  // Track practice_completed when target is first reached
  const completedTrackedRef = useRef(false);
  useEffect(() => {
    if (isComplete && !completedTrackedRef.current && courseType) {
      completedTrackedRef.current = true;
      analytics.trackPracticeCompleted(activityType, activeSeconds, targetSeconds, courseType, weekNumber);
    }
  }, [isComplete, activityType, activeSeconds, targetSeconds, courseType, weekNumber]);

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
