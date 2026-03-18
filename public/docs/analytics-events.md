# Analytics Event Reference — SpeakSmart

> Comprehensive taxonomy of all monetizable events for analytics, AI training, and commercial intelligence.
> Last updated: 2026-03-18

---

## Common Metadata (attached to every event)

| Field | Type | Description |
|---|---|---|
| `user_id` | uuid | Authenticated user ID |
| `session_id` | uuid | Browser session identifier |
| `timestamp` | ISO 8601 | Event time (UTC) |
| `country` | string | ISO 3166-1 alpha-2 country code |
| `device_id` | string | Fingerprinted device hash |
| `app_version` | string | Deployed app version |
| `deployment_region` | string | `cn` \| `global` |
| `course_type` | string | `ielts` \| `igcse` |
| `platform` | string | `web` \| `pwa` |

---

## China Compliance Gate

All events pass through a compliance gate before dispatch:

```
if (deployment_region === 'cn') {
  // Strip PII fields (device_id, IP)
  // Route to CN-local analytics endpoint
  // Enforce data residency (no cross-border transfer)
}
```

---

## Monetization Value Tiers

| Tier | Value | Use Case |
|---|---|---|
| **Tier 1** | Highest | Direct revenue signals (conversions, purchases, subscription events) |
| **Tier 2** | High | Engagement depth, AI training data, content optimization |
| **Tier 3** | Medium | Product analytics, UX optimization, feature adoption |

---

## 1. Authentication Events

| Event | Metadata | Tier | Status |
|---|---|---|---|
| `user_signed_up` | `method: email\|google`, `referral_source` | 1 | ☐ |
| `user_logged_in` | `method`, `days_since_last_login` | 3 | ☐ |
| `user_logged_out` | — | 3 | ☐ |
| `password_reset_requested` | — | 3 | ☐ |
| `email_verified` | `time_to_verify_hours` | 2 | ☐ |

---

## 2. Practice Session Events

| Event | Metadata | Tier | Status |
|---|---|---|---|
| `practice_started` | `module: speaking\|fluency\|pronunciation`, `week_number` | 2 | ☐ |
| `practice_completed` | `module`, `active_seconds`, `target_seconds`, `completion_ratio` | 1 | ☐ |
| `practice_abandoned` | `module`, `seconds_before_abandon`, `reason_hint` | 2 | ☐ |
| `practice_paused` | `module`, `elapsed_seconds` | 3 | ☐ |
| `practice_resumed` | `module`, `pause_duration_seconds` | 3 | ☐ |
| `extended_practice_started` | `module`, `base_seconds_completed` | 1 | ☐ |
| `timer_expired` | `module`, `total_seconds` | 3 | ☐ |

---

## 3. Mock Test Events

| Event | Metadata | Tier | Status |
|---|---|---|---|
| `mock_test_started` | `test_type: ielts\|igcse`, `part_number` | 1 | ☐ |
| `mock_test_part_completed` | `part_number`, `duration_seconds`, `word_count` | 1 | ☐ |
| `mock_test_completed` | `total_duration`, `parts_completed`, `band_estimate` | 1 | ☐ |
| `mock_test_abandoned` | `part_reached`, `seconds_elapsed` | 2 | ☐ |
| `cue_card_viewed` | `topic`, `prep_time_used_seconds` | 3 | ☐ |
| `examiner_question_answered` | `part`, `question_index`, `response_seconds` | 2 | ☐ |

---

## 4. Speech & Pronunciation Events

| Event | Metadata | Tier | Status |
|---|---|---|---|
| `recording_started` | `context: practice\|mock\|free` | 3 | ☐ |
| `recording_completed` | `duration_seconds`, `word_count`, `silence_ratio` | 2 | ☐ |
| `pronunciation_score_received` | `score`, `sentence_id`, `attempt_number` | 1 | ☐ |
| `pronunciation_word_flagged` | `word`, `expected_phoneme`, `actual_phoneme`, `score` | 2 | ☐ |
| `shadowing_attempt` | `sentence_id`, `score`, `attempt_number`, `track` | 2 | ☐ |
| `shadowing_sentence_mastered` | `sentence_id`, `attempts_to_master`, `track` | 1 | ☐ |
| `fluency_score_calculated` | `wpm`, `filler_count`, `pause_count`, `hesitation_ratio` | 1 | ☐ |
| `prosody_analyzed` | `pitch_range`, `rhythm_score`, `stress_accuracy` | 2 | ☐ |
| `accent_changed` | `from_accent`, `to_accent` | 3 | ☐ |

---

## 5. Grammar & Language Events

| Event | Metadata | Tier | Status |
|---|---|---|---|
| `grammar_error_detected` | `error_type`, `sentence_context`, `severity` | 2 | ☐ |
| `grammar_correction_shown` | `error_type`, `original`, `corrected` | 3 | ☐ |
| `grammar_correction_accepted` | `error_type` | 3 | ☐ |
| `vocabulary_level_assessed` | `cefr_level`, `unique_word_count`, `lexical_diversity` | 1 | ☐ |

### Grammar Error Types Enum

```typescript
type GrammarErrorType =
  | 'subject_verb_agreement'
  | 'tense_error'
  | 'article_error'
  | 'preposition_error'
  | 'word_order'
  | 'missing_word'
  | 'extra_word'
  | 'spelling'
  | 'punctuation'
  | 'run_on_sentence'
  | 'fragment'
  | 'other';
```

---

## 6. Content Engagement Events

| Event | Metadata | Tier | Status |
|---|---|---|---|
| `curriculum_item_started` | `item_id`, `track`, `topic`, `band_level` | 3 | ☐ |
| `curriculum_item_completed` | `item_id`, `score`, `time_spent_seconds` | 2 | ☐ |
| `curriculum_track_completed` | `track`, `total_items`, `avg_score` | 1 | ☐ |
| `homework_viewed` | `week_number`, `assignment_count` | 3 | ☐ |
| `homework_completed` | `week_number`, `time_to_complete_hours` | 2 | ☐ |
| `week_selected` | `week_number`, `previous_week` | 3 | ☐ |

---

## 7. Learning Progression Events

| Event | Metadata | Tier | Status |
|---|---|---|---|
| `streak_milestone` | `streak_days`, `milestone: 3\|7\|14\|30\|60\|100` | 1 | ☐ |
| `streak_broken` | `previous_streak_days` | 2 | ☐ |
| `xp_earned` | `amount`, `source: practice\|streak\|bonus`, `total_xp` | 2 | ☐ |
| `level_up` | `new_level`, `total_xp` | 1 | ☐ |
| `band_score_improved` | `previous_band`, `new_band`, `module` | 1 | ☐ |
| `weekly_goal_met` | `week_number`, `target_seconds`, `actual_seconds` | 1 | ☐ |
| `weekly_goal_missed` | `week_number`, `target_seconds`, `actual_seconds`, `deficit_pct` | 2 | ☐ |

---

## 8. Commercial Intent Events

| Event | Metadata | Tier | Status |
|---|---|---|---|
| `exam_date_set` | `exam_type`, `date`, `days_until_exam` | 1 | ☐ |
| `target_band_set` | `target_band`, `current_estimated_band` | 1 | ☐ |
| `study_plan_generated` | `weeks_until_exam`, `recommended_daily_minutes` | 1 | ☐ |
| `tutoring_interest_expressed` | `context`, `current_band` | 1 | ☐ |

---

## 9. Device & Session Events

| Event | Metadata | Tier | Status |
|---|---|---|---|
| `session_started` | `user_agent`, `screen_resolution`, `connection_type` | 3 | ☐ |
| `session_ended` | `duration_seconds`, `pages_viewed`, `actions_taken` | 3 | ☐ |
| `mic_permission_granted` | `device_label` | 3 | ☐ |
| `mic_permission_denied` | — | 2 | ☐ |
| `headphone_detected` | `headphone_type: wired\|bluetooth` | 3 | ☐ |
| `pwa_installed` | `install_source` | 2 | ☐ |
| `offline_mode_entered` | — | 3 | ☐ |
| `browser_not_supported` | `user_agent`, `missing_api` | 2 | ☐ |

---

## 10. Navigation Events

| Event | Metadata | Tier | Status |
|---|---|---|---|
| `page_viewed` | `page_path`, `referrer`, `time_on_previous_page` | 3 | ☐ |
| `feature_discovered` | `feature_name`, `discovery_method: menu\|prompt\|deeplink` | 2 | ☐ |
| `help_requested` | `context_page`, `query` | 2 | ☐ |
| `error_encountered` | `error_type`, `error_message`, `page_path` | 2 | ☐ |
| `language_toggled` | `from_lang`, `to_lang` | 3 | ☐ |

---

## 11. AI Interaction Events

| Event | Metadata | Tier | Status |
|---|---|---|---|
| `ai_chat_opened` | `context_page`, `trigger: fab\|menu\|auto` | 3 | ☐ |
| `ai_message_sent` | `message_length`, `conversation_turn`, `context` | 2 | ☐ |
| `ai_response_received` | `response_time_ms`, `model_used`, `token_count` | 2 | ☐ |
| `ai_response_rated` | `rating: thumbs_up\|thumbs_down`, `conversation_id`, `turn` | 1 | ☐ |
| `ai_response_regenerated` | `conversation_id`, `turn`, `previous_rating` | 1 | ☐ |
| `ai_feedback_viewed` | `feedback_type: pronunciation\|fluency\|grammar`, `duration_viewed_seconds` | 2 | ☐ |
| `ai_suggestion_accepted` | `suggestion_type`, `context` | 2 | ☐ |
| `ai_suggestion_dismissed` | `suggestion_type`, `context` | 2 | ☐ |

---

## 12. Social & Institutional Events

| Event | Metadata | Tier | Status |
|---|---|---|---|
| `class_joined` | `class_id`, `join_method: code\|invite` | 2 | ☐ |
| `class_left` | `class_id`, `days_in_class` | 2 | ☐ |
| `leaderboard_viewed` | `leaderboard_type: class\|global\|extended` | 3 | ☐ |
| `leaderboard_rank_changed` | `previous_rank`, `new_rank`, `leaderboard_type` | 2 | ☐ |
| `teacher_feedback_received` | `feedback_type: note\|score\|comment`, `conversation_id` | 1 | ☐ |
| `parent_dashboard_viewed` | `student_count`, `view_duration_seconds` | 2 | ☐ |
| `session_shared` | `share_method`, `session_id` | 2 | ☐ |

---

## 13. Conversion Funnel Events

| Event | Metadata | Tier | Status |
|---|---|---|---|
| `paywall_viewed` | `trigger_feature`, `current_plan`, `page_path` | 1 | ☐ |
| `paywall_dismissed` | `trigger_feature`, `view_duration_seconds` | 1 | ☐ |
| `trial_started` | `plan_type`, `trial_duration_days` | 1 | ☐ |
| `trial_converted` | `plan_type`, `days_to_convert` | 1 | ☐ |
| `trial_expired` | `plan_type`, `usage_during_trial` | 1 | ☐ |
| `upgrade_completed` | `from_plan`, `to_plan`, `payment_method` | 1 | ☐ |
| `downgrade_requested` | `from_plan`, `to_plan`, `reason` | 1 | ☐ |
| `churn_risk_detected` | `days_inactive`, `previous_usage_pattern` | 1 | ☐ |

---

## 14. Content Gap Analysis Events

| Event | Metadata | Tier | Status |
|---|---|---|---|
| `search_with_no_results` | `query`, `context_page` | 1 | ☐ |
| `repeated_failure_on_item` | `item_id`, `attempt_count`, `avg_score`, `track` | 1 | ☐ |
| `feature_request_submitted` | `description`, `category` | 2 | ☐ |
| `content_difficulty_spike` | `item_id`, `cohort_avg_score`, `cohort_failure_rate` | 1 | ☐ |
| `curriculum_gap_identified` | `topic`, `missing_band_levels`, `student_demand_count` | 1 | ☐ |

---

## 15. Re-engagement Events

| Event | Metadata | Tier | Status |
|---|---|---|---|
| `return_after_absence` | `days_absent`, `return_trigger: organic\|notification\|email` | 1 | ☐ |
| `notification_sent` | `notification_type`, `channel: push\|email\|sms` | 3 | ☐ |
| `notification_clicked` | `notification_type`, `channel`, `time_to_click_minutes` | 1 | ☐ |
| `notification_dismissed` | `notification_type`, `channel` | 2 | ☐ |
| `win_back_offer_shown` | `offer_type`, `days_inactive` | 1 | ☐ |
| `win_back_offer_accepted` | `offer_type`, `discount_pct` | 1 | ☐ |

---

## Implementation Tracking Summary

| Category | Event Count | Implemented |
|---|---|---|
| Authentication | 5 | 0 |
| Practice Session | 7 | 0 |
| Mock Test | 6 | 0 |
| Speech & Pronunciation | 9 | 0 |
| Grammar & Language | 4 | 0 |
| Content Engagement | 6 | 0 |
| Learning Progression | 7 | 0 |
| Commercial Intent | 4 | 0 |
| Device & Session | 8 | 0 |
| Navigation | 5 | 0 |
| AI Interaction | 8 | 0 |
| Social & Institutional | 7 | 0 |
| Conversion Funnel | 8 | 0 |
| Content Gap Analysis | 5 | 0 |
| Re-engagement | 6 | 0 |
| **Total** | **95** | **0** |

---

*Document generated for SpeakSmart analytics planning. Place in `public/docs/` for direct download access.*
