/**
 * Analytics Event Tracking Service
 *
 * Central fire-and-forget event logger with China compliance gate.
 * All events are written to the `user_events` table via Supabase.
 *
 * Usage:
 *   import { analytics } from "@/services/analytics";
 *   analytics.track("practice_completed", { module: "speaking", active_seconds: 300 });
 */

import { supabase } from "@/integrations/supabase/client";
import { PROVIDERS } from "@/lib/provider-config";

// ── Types ──────────────────────────────────────────────────────────

export interface EventMetadata {
  [key: string]: string | number | boolean | null | undefined;
}

interface EventPayload {
  user_id: string;
  event_name: string;
  metadata: Record<string, unknown>;
  session_id: string;
  deployment_region: string;
  course_type?: string;
  platform: string;
}

// ── Session ID (per browser session, not persisted across tabs) ───

let _sessionId: string | null = null;
function getSessionId(): string {
  if (!_sessionId) {
    _sessionId = crypto.randomUUID();
  }
  return _sessionId;
}

// ── China Compliance Gate ──────────────────────────────────────────

function applyComplianceGate(payload: EventPayload): EventPayload {
  const isCN = PROVIDERS.backend === "memfire" || payload.deployment_region === "cn";
  if (!isCN) return payload;

  // Strip PII fields for China deployments
  const sanitized = { ...payload };
  delete (sanitized as any).device_id;

  // Ensure metadata doesn't leak PII
  const meta = { ...sanitized.metadata };
  delete meta.ip;
  delete meta.user_agent;
  sanitized.metadata = meta;

  return sanitized;
}

// ── Core track() ──────────────────────────────────────────────────

async function track(
  eventName: string,
  metadata: EventMetadata = {},
  options?: { courseType?: string }
): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return; // Don't track anonymous users

    const deploymentRegion = PROVIDERS.backend === "memfire" ? "cn" : "global";

    let payload: EventPayload = {
      user_id: user.id,
      event_name: eventName,
      metadata: metadata as Record<string, unknown>,
      session_id: getSessionId(),
      deployment_region: deploymentRegion,
      course_type: options?.courseType,
      platform: "web",
    };

    // Apply China compliance gate
    payload = applyComplianceGate(payload);

    // Fire-and-forget insert — don't block the UI
    supabase
      .from("user_events" as any)
      .insert(payload as any)
      .then(({ error }) => {
        if (error) console.warn("[analytics] Failed to track event:", eventName, error.message);
      });
  } catch (err) {
    // Never let analytics break the app
    console.warn("[analytics] Error tracking event:", eventName, err);
  }
}

// ── Convenience helpers for Tier 1 events ─────────────────────────

function trackSignup(method: string, role: string) {
  track("user_signed_up", { method, role });
}

function trackPracticeCompleted(
  module: string,
  activeSeconds: number,
  targetSeconds: number,
  courseType: string,
  weekNumber: number
) {
  track(
    "practice_completed",
    {
      module,
      active_seconds: activeSeconds,
      target_seconds: targetSeconds,
      completion_ratio: targetSeconds > 0 ? Math.round((activeSeconds / targetSeconds) * 100) : 0,
      week_number: weekNumber,
    },
    { courseType }
  );
}

function trackPracticeStarted(module: string, courseType: string, weekNumber: number) {
  track("practice_started", { module, week_number: weekNumber }, { courseType });
}

function trackStreakMilestone(streakDays: number) {
  const milestones = [3, 7, 14, 30, 60, 100];
  if (milestones.includes(streakDays)) {
    track("streak_milestone", { streak_days: streakDays, milestone: streakDays });
  }
}

function trackBandScoreImproved(previousBand: number, newBand: number, module: string) {
  track("band_score_improved", { previous_band: previousBand, new_band: newBand, module });
}

function trackWeeklyGoalMet(weekNumber: number, targetSeconds: number, actualSeconds: number, courseType: string) {
  track("weekly_goal_met", { week_number: weekNumber, target_seconds: targetSeconds, actual_seconds: actualSeconds }, { courseType });
}

function trackPronunciationScore(score: number, sentenceId: string, attemptNumber: number) {
  track("pronunciation_score_received", { score, sentence_id: sentenceId, attempt_number: attemptNumber });
}

function trackShadowingMastered(sentenceId: string, attemptsToMaster: number, trackName: string) {
  track("shadowing_sentence_mastered", { sentence_id: sentenceId, attempts_to_master: attemptsToMaster, track: trackName });
}

function trackFluencyScore(wpm: number, fillerCount: number, pauseCount: number, hesitationRatio: number) {
  track("fluency_score_calculated", { wpm, filler_count: fillerCount, pause_count: pauseCount, hesitation_ratio: hesitationRatio });
}

function trackAIResponseRated(rating: "thumbs_up" | "thumbs_down", conversationId: string, turn: number) {
  track("ai_response_rated", { rating, conversation_id: conversationId, turn });
}

// ── Public API ────────────────────────────────────────────────────

export const analytics = {
  track,
  trackSignup,
  trackPracticeStarted,
  trackPracticeCompleted,
  trackStreakMilestone,
  trackBandScoreImproved,
  trackWeeklyGoalMet,
  trackPronunciationScore,
  trackShadowingMastered,
  trackFluencyScore,
  trackAIResponseRated,
};
