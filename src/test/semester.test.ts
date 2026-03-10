import { describe, it, expect } from "vitest";
import { getWeekNumber, getWeekDateRange, SEMESTER_START, SEMESTER_WEEKS } from "@/lib/semester";

describe("semester utilities", () => {
  it("exports valid constants", () => {
    expect(SEMESTER_START).toBeTruthy();
    expect(SEMESTER_WEEKS).toBeGreaterThan(0);
  });

  it("getWeekNumber returns a number for the semester start date", () => {
    const semStart = new Date(`${SEMESTER_START}T12:00:00+08:00`);
    const week = getWeekNumber(semStart);
    expect(week).toBe(1);
  });

  it("getWeekDateRange returns valid start and end", () => {
    const range = getWeekDateRange(1);
    expect(range.start).toBeInstanceOf(Date);
    expect(range.end).toBeInstanceOf(Date);
    expect(range.end.getTime()).toBeGreaterThan(range.start.getTime());
  });

  it("week numbers increase over time", () => {
    const semStart = new Date(`${SEMESTER_START}T12:00:00+08:00`);
    const oneWeekLater = new Date(semStart.getTime() + 7 * 24 * 60 * 60 * 1000);
    const w1 = getWeekNumber(semStart);
    const w2 = getWeekNumber(oneWeekLater);
    expect(w2).toBeGreaterThan(w1!);
  });
});
