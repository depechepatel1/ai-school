/**
 * Single source of truth for background-video framing presets.
 * Every screen that needs a specific camera framing should reference
 * these constants instead of hardcoding strings.
 */

/** Auth screens, mock-test config, week-selection — teacher shifted far left */
export const AUTH_SETUP_OBJECT_POSITION = "110% 15%";

/** Active test / full-width centered screens */
export const CENTER_OBJECT_POSITION = "center center";

/**
 * Typed preset map consumed by PageShell.
 * Add new presets here; never pass ad-hoc position strings from pages.
 */
export type VideoPreset = "authSetup" | "center";

export const VIDEO_PRESET_MAP: Record<VideoPreset, string> = {
  authSetup: AUTH_SETUP_OBJECT_POSITION,
  center: CENTER_OBJECT_POSITION,
};
