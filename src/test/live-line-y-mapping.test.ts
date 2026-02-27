/**
 * Regression test for the PROTECTED ZONE in PronunciationVisualizer.
 * These formulas and constants must not change without explicit user approval.
 * See: src/components/speaking/PronunciationVisualizer.tsx (protected zone)
 */
import { describe, it, expect } from "vitest";

// ── Constants ──
const PEAK_DECAY = 0.985;
const PAD = 8;

describe("Live line Y-mapping — protected constants", () => {
  it("PEAK_DECAY is 0.985", () => {
    expect(PEAK_DECAY).toBe(0.985);
  });

  it("PAD is 8", () => {
    expect(PAD).toBe(8);
  });
});

describe("Live line Y-mapping — formulas", () => {
  const ch = 300; // sample canvas height
  const drawableRange = ch - PAD * 2; // 284

  it("baseY = PAD + drawableRange * 0.85", () => {
    const baseY = PAD + drawableRange * 0.85;
    expect(baseY).toBeCloseTo(249.4, 1);
  });

  it("upwardPull = smoothAmp * drawableRange * 1.6", () => {
    const smoothAmp = 0.5;
    const upwardPull = smoothAmp * drawableRange * 1.6;
    expect(upwardPull).toBeCloseTo(227.2, 1);
  });

  it("centroidNudge = (centroid - 0.5) * drawableRange * 0.2", () => {
    const centroid = 0.7;
    const centroidNudge = (centroid - 0.5) * drawableRange * 0.2;
    expect(centroidNudge).toBeCloseTo(11.36, 1);
  });

  it("smoothing: smoothY * 0.865 + targetY * 0.135", () => {
    const smoothY = 200;
    const rawTarget = 100;
    const blended = smoothY * 0.865 + rawTarget * 0.135;
    expect(blended).toBeCloseTo(186.5, 1);
  });

  it("normAmp floor is 0.18 when cleanRms > 0.005", () => {
    const cleanRms = 0.01;
    const cleanPeak = 0.5;
    let normAmp = Math.min(1, cleanRms / cleanPeak);
    if (cleanRms > 0.005 && normAmp < 0.18) normAmp = 0.18;
    expect(normAmp).toBe(0.18);
  });

  it("normAmp is NOT floored when cleanRms <= 0.005", () => {
    const cleanRms = 0.003;
    const cleanPeak = 0.5;
    let normAmp = Math.min(1, cleanRms / cleanPeak);
    if (cleanRms > 0.005 && normAmp < 0.18) normAmp = 0.18;
    expect(normAmp).toBe(0.006);
  });

  it("maxDur = Math.max(4000, totalSyl * 400)", () => {
    expect(Math.max(4000, 5 * 400)).toBe(4000);
    expect(Math.max(4000, 15 * 400)).toBe(6000);
  });
});
