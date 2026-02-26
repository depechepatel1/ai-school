/**
 * Contour Matching — DTW-based pitch contour comparison
 *
 * Compares a user's recorded pitch contour against a target contour
 * generated from prosody analysis. Returns a similarity score 0-100.
 */

import type { WordData } from "@/lib/prosody";

/**
 * Generate a normalized target contour (0-1 values) from prosody data.
 * Maps syllable pitch values to smooth contour points.
 */
export function generateTargetContour(prosodyData: WordData[]): number[] {
  const contour: number[] = [];
  for (const word of prosodyData) {
    for (const syl of word.syllables) {
      // pitch: 2 = high (stressed), 0 = mid, -1 = low
      const normalized = syl.pitch === 2 ? 0.8 : syl.pitch === -1 ? 0.2 : 0.5;
      // Add multiple samples per syllable for smoother contour
      contour.push(normalized, normalized);
    }
  }
  return contour;
}

/**
 * DTW (Dynamic Time Warping) similarity between two contours.
 * Returns a score from 0 (no match) to 100 (perfect match).
 */
export function matchContours(target: number[], user: number[]): number {
  if (target.length === 0 || user.length === 0) return 0;

  const n = target.length;
  const m = user.length;

  // Use two-row DTW to save memory
  let prev = new Float64Array(m + 1).fill(Infinity);
  let curr = new Float64Array(m + 1).fill(Infinity);
  prev[0] = 0;

  for (let i = 1; i <= n; i++) {
    curr[0] = Infinity;
    for (let j = 1; j <= m; j++) {
      const cost = Math.abs(target[i - 1] - user[j - 1]);
      curr[j] = cost + Math.min(prev[j], curr[j - 1], prev[j - 1]);
    }
    [prev, curr] = [curr, prev];
    curr.fill(Infinity);
  }

  const dtwDist = prev[m];
  const pathLen = Math.max(n, m);
  const avgDist = dtwDist / pathLen;

  // Convert average distance (0-1 range) to score (0-100)
  // avgDist of 0 = 100%, avgDist of 0.5+ = ~0%
  const score = Math.max(0, Math.min(100, Math.round((1 - avgDist * 2) * 100)));
  return score;
}
