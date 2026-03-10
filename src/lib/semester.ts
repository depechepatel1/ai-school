/** Semester 1 starts Monday 2nd March 2026 */
export const SEMESTER_START = "2026-03-02";
export const SEMESTER_WEEKS = 20;

const MS_PER_DAY = 86_400_000;
const MS_PER_WEEK = 7 * MS_PER_DAY;

function startDate(): Date {
  // Use China Standard Time (UTC+8) as the canonical timezone
  return new Date(`${SEMESTER_START}T00:00:00+08:00`);
}

/** Returns 1-based week number (clamped to 1..SEMESTER_WEEKS). 0 if before semester. */
export function getWeekNumber(date: Date = new Date()): number {
  const diff = date.getTime() - startDate().getTime();
  if (diff < 0) return 0;
  const week = Math.floor(diff / MS_PER_WEEK) + 1;
  return Math.min(week, SEMESTER_WEEKS);
}

/** Returns [start, end) date range for a 1-based week number */
export function getWeekDateRange(weekNum: number): { start: Date; end: Date } {
  const s = startDate();
  const start = new Date(s.getTime() + (weekNum - 1) * MS_PER_WEEK);
  const end = new Date(start.getTime() + MS_PER_WEEK);
  return { start, end };
}

/** Returns true if date falls within the 20-week semester */
export function isWithinSemester(date: Date = new Date()): boolean {
  const s = startDate();
  const semesterEnd = new Date(s.getTime() + SEMESTER_WEEKS * MS_PER_WEEK);
  return date >= s && date < semesterEnd;
}

/** Course-specific daily time targets in seconds */
export const TIME_TARGETS: Record<string, Record<string, number>> = {
  ielts: { shadowing: 900, pronunciation: 600, speaking: 900 },
  igcse: { shadowing: 600, pronunciation: 600, speaking: 600 },
};

/** SCHOOL_DAYS_PER_WEEK used for target scaling */
export const SCHOOL_DAYS_PER_WEEK = 5;
