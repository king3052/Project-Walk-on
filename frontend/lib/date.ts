/**
 * Returns a date as "YYYY-MM-DD" using LOCAL calendar date components.
 *
 * Never use `date.toISOString().slice(0, 10)` for this — toISOString()
 * converts to UTC first. For anyone in a timezone behind UTC (all of the
 * US, for example), local evening hours have already rolled over to the
 * next day in UTC, so that pattern silently returns tomorrow's date once
 * it gets late enough locally. This uses getFullYear/getMonth/getDate,
 * which read the local calendar date the browser is actually showing.
 */
export function toLocalISODate(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
