import { describe, it, expect } from "vitest";
import {
  stripPauseMarkers,
  reinsertPauseMarkers,
} from "@/lib/speech-annotations";

describe("stripPauseMarkers", () => {
  it("returns clean text and no slots when no markers present", () => {
    const { clean, slots } = stripPauseMarkers("Hello world this is a test");
    expect(clean).toBe("Hello world this is a test");
    expect(slots).toHaveLength(0);
  });

  it("strips a single marker and records its position", () => {
    const { clean, slots } = stripPauseMarkers("Hello world ⟦1.8s⟧ this is a test");
    expect(clean).toBe("Hello world this is a test");
    expect(slots).toHaveLength(1);
    expect(slots[0].marker).toBe("⟦1.8s⟧");
    expect(slots[0].wordIndexBefore).toBe(2); // after "Hello world"
  });

  it("strips multiple markers", () => {
    const { clean, slots } = stripPauseMarkers("One ⟦2.0s⟧ two three ⟦1.5s⟧ four");
    expect(clean).toBe("One two three four");
    expect(slots).toHaveLength(2);
    expect(slots[0].wordIndexBefore).toBe(1);
    expect(slots[1].wordIndexBefore).toBe(3);
  });

  it("handles marker at the very start", () => {
    const { clean, slots } = stripPauseMarkers("⟦3.0s⟧ Hello");
    expect(clean).toBe("Hello");
    expect(slots).toHaveLength(1);
    expect(slots[0].wordIndexBefore).toBe(0);
  });

  it("handles marker at the very end", () => {
    const { clean, slots } = stripPauseMarkers("Hello world ⟦1.0s⟧");
    expect(clean).toBe("Hello world");
    expect(slots).toHaveLength(1);
    expect(slots[0].wordIndexBefore).toBe(2);
  });

  it("handles integer pause values", () => {
    const { clean, slots } = stripPauseMarkers("Yes ⟦2s⟧ no");
    expect(clean).toBe("Yes no");
    expect(slots).toHaveLength(1);
    expect(slots[0].marker).toBe("⟦2s⟧");
  });
});

describe("reinsertPauseMarkers", () => {
  it("returns text unchanged when no slots", () => {
    expect(reinsertPauseMarkers("Hello world", [])).toBe("Hello world");
  });

  it("reinserts a single marker at the correct position", () => {
    const slots = [{ marker: "⟦1.8s⟧", wordIndexBefore: 2 }];
    const result = reinsertPauseMarkers("Hello world, this is a test.", slots);
    // Marker goes after word index 2 ("Hello world,") before "this"
    expect(result).toContain("⟦1.8s⟧");
    const parts = result.split("⟦1.8s⟧");
    expect(parts[0].trim().split(/\s+/).length).toBe(2); // "Hello world,"
  });

  it("reinserts multiple markers in correct order", () => {
    const slots = [
      { marker: "⟦2.0s⟧", wordIndexBefore: 1 },
      { marker: "⟦1.5s⟧", wordIndexBefore: 3 },
    ];
    const result = reinsertPauseMarkers("One, two three four.", slots);
    const idx1 = result.indexOf("⟦2.0s⟧");
    const idx2 = result.indexOf("⟦1.5s⟧");
    expect(idx1).toBeGreaterThan(-1);
    expect(idx2).toBeGreaterThan(-1);
    expect(idx1).toBeLessThan(idx2);
  });

  it("handles marker at position 0 (start of text)", () => {
    const slots = [{ marker: "⟦3.0s⟧", wordIndexBefore: 0 }];
    const result = reinsertPauseMarkers("Hello world.", slots);
    expect(result).toMatch(/^⟦3\.0s⟧/);
  });

  it("handles marker at end (position beyond last word)", () => {
    const slots = [{ marker: "⟦1.0s⟧", wordIndexBefore: 3 }];
    const result = reinsertPauseMarkers("One two three.", slots);
    expect(result).toMatch(/⟦1\.0s⟧$/);
  });
});

describe("round-trip: strip → punctuate → reinsert", () => {
  it("preserves markers through a simulated punctuation transform", () => {
    const original = "hello world ⟦1.8s⟧ this is great ⟦2.5s⟧ thank you";
    const { clean, slots } = stripPauseMarkers(original);
    // Simulate AI punctuation adding caps and periods
    const punctuated = "Hello world. This is great. Thank you.";
    const result = reinsertPauseMarkers(punctuated, slots);

    expect(result).toContain("⟦1.8s⟧");
    expect(result).toContain("⟦2.5s⟧");
    // Verify punctuation survived
    expect(result).toContain("Hello world.");
    expect(result).toContain("Thank you.");
  });

  it("preserves a single marker through round-trip", () => {
    const original = "um yeah ⟦3.0s⟧ I think so";
    const { clean, slots } = stripPauseMarkers(original);
    expect(clean).toBe("um yeah I think so");
    const punctuated = "Um, yeah, I think so.";
    const result = reinsertPauseMarkers(punctuated, slots);
    expect(result).toContain("⟦3.0s⟧");
    expect(result).toContain("Um,");
    expect(result).toContain("I think so.");
  });

  it("handles text with no markers (no-op round-trip)", () => {
    const original = "Just a normal sentence";
    const { clean, slots } = stripPauseMarkers(original);
    const punctuated = "Just a normal sentence.";
    const result = reinsertPauseMarkers(punctuated, slots);
    expect(result).toBe("Just a normal sentence.");
  });
});
