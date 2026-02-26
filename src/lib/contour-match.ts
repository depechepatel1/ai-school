/**
 * Contour Matching — DTW + Pearson correlation pitch contour comparison
 *
 * Compares a user's recorded pitch contour against a target contour
 * using resampling, z-score normalization, and blended scoring.
 */

import type { WordData } from "@/lib/prosody";

const RESAMPLE_LEN = 50;

/**
 * Generate a normalized target contour from prosody data.
 * Uses gentler pitch range and more points per syllable.
 */
export function generateTargetContour(prosodyData: WordData[]): number[] {
  const contour: number[] = [];
  for (const word of prosodyData) {
    for (const syl of word.syllables) {
      // Gentler range: 0.3-0.7 instead of 0.2-0.8
      const normalized = syl.pitch === 2 ? 0.7 : syl.pitch === -1 ? 0.3 : 0.5;
      // 4 points per syllable for smoother contour
      contour.push(normalized, normalized, normalized, normalized);
    }
  }
  return contour;
}

/**
 * Resample a contour to a fixed number of points via linear interpolation.
 */
export function resampleContour(contour: number[], targetLen: number): number[] {
  if (contour.length === 0) return new Array(targetLen).fill(0);
  if (contour.length === 1) return new Array(targetLen).fill(contour[0]);
  if (contour.length === targetLen) return [...contour];

  const result: number[] = [];
  for (let i = 0; i < targetLen; i++) {
    const pos = (i / (targetLen - 1)) * (contour.length - 1);
    const lo = Math.floor(pos);
    const hi = Math.min(lo + 1, contour.length - 1);
    const frac = pos - lo;
    result.push(contour[lo] * (1 - frac) + contour[hi] * frac);
  }
  return result;
}

/**
 * Z-score normalize a contour (subtract mean, divide by stddev).
 * Returns zero array if stddev is near zero (flat contour).
 */
export function zNormalize(contour: number[]): number[] {
  const n = contour.length;
  if (n === 0) return [];

  let sum = 0;
  for (let i = 0; i < n; i++) sum += contour[i];
  const mean = sum / n;

  let varSum = 0;
  for (let i = 0; i < n; i++) varSum += (contour[i] - mean) ** 2;
  const std = Math.sqrt(varSum / n);

  if (std < 1e-6) return new Array(n).fill(0);
  return contour.map((v) => (v - mean) / std);
}

/**
 * Pearson correlation coefficient between two equal-length arrays.
 * Returns value from -1 to 1.
 */
export function pearsonCorrelation(a: number[], b: number[]): number {
  const n = a.length;
  if (n === 0) return 0;

  let sumA = 0, sumB = 0;
  for (let i = 0; i < n; i++) { sumA += a[i]; sumB += b[i]; }
  const meanA = sumA / n, meanB = sumB / n;

  let num = 0, denA = 0, denB = 0;
  for (let i = 0; i < n; i++) {
    const da = a[i] - meanA, db = b[i] - meanB;
    num += da * db;
    denA += da * da;
    denB += db * db;
  }

  const den = Math.sqrt(denA * denB);
  if (den < 1e-10) return 0;
  return num / den;
}

/**
 * DTW distance between two z-normalized contours (same length expected).
 */
function dtwDistance(a: number[], b: number[]): number {
  const n = a.length, m = b.length;
  if (n === 0 || m === 0) return Infinity;

  let prev = new Float64Array(m + 1).fill(Infinity);
  let curr = new Float64Array(m + 1).fill(Infinity);
  prev[0] = 0;

  for (let i = 1; i <= n; i++) {
    curr[0] = Infinity;
    for (let j = 1; j <= m; j++) {
      const cost = Math.abs(a[i - 1] - b[j - 1]);
      curr[j] = cost + Math.min(prev[j], curr[j - 1], prev[j - 1]);
    }
    [prev, curr] = [curr, prev];
    curr.fill(Infinity);
  }

  return prev[m];
}

/**
 * Match two contours using resampling, z-normalization, DTW + Pearson blend.
 * Returns a score from 0 (no match) to 100 (perfect match).
 */
export function matchContours(target: number[], user: number[]): number {
  if (target.length === 0 || user.length === 0) return 0;

  // 1. Resample both to same length
  const tResampled = resampleContour(target, RESAMPLE_LEN);
  const uResampled = resampleContour(user, RESAMPLE_LEN);

  // 2. Z-normalize both
  const tNorm = zNormalize(tResampled);
  const uNorm = zNormalize(uResampled);

  // 3. DTW score (gentler formula)
  const dist = dtwDistance(tNorm, uNorm);
  const avgDist = dist / RESAMPLE_LEN;
  const dtwScore = Math.max(0, Math.min(100, Math.round((1 - avgDist * 0.8) * 100)));

  // 4. Pearson correlation score (map -1..1 to 0..100)
  const corr = pearsonCorrelation(tNorm, uNorm);
  const corrScore = Math.max(0, Math.min(100, Math.round((corr + 1) * 50)));

  // 5. Blend: 40% DTW + 60% correlation
  const blended = Math.round(dtwScore * 0.4 + corrScore * 0.6);

  return Math.max(0, Math.min(100, blended));
}
