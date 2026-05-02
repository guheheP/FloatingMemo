// Local-date helpers — all dates are 'YYYY-MM-DD' in user's local timezone.
// Persisted as TEXT in SQLite to sidestep epoch/TZ ambiguity.

export type DateStr = string; // 'YYYY-MM-DD'

const pad2 = (n: number): string => (n < 10 ? `0${n}` : `${n}`);

export function dateStrFromDate(d: Date): DateStr {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function todayStr(): DateStr {
  return dateStrFromDate(new Date());
}

export function dateFromStr(s: DateStr): Date {
  const [y, m, d] = s.split("-").map((p) => parseInt(p, 10));
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

export function yearMonthOf(s: DateStr): string {
  return s.slice(0, 7);
}

export function yearMonthStr(year: number, month1: number): string {
  return `${year}-${pad2(month1)}`;
}

export function addMonths(
  year: number,
  month1: number,
  delta: number,
): { year: number; month1: number } {
  const total = year * 12 + (month1 - 1) + delta;
  return { year: Math.floor(total / 12), month1: (total % 12) + 1 };
}

export function daysInMonth(year: number, month1: number): number {
  return new Date(year, month1, 0).getDate();
}

// First day of week: Sunday=0..Saturday=6
export function firstWeekday(year: number, month1: number): number {
  return new Date(year, month1 - 1, 1).getDay();
}

export function buildMonthGrid(year: number, month1: number): (DateStr | null)[][] {
  const first = firstWeekday(year, month1);
  const total = daysInMonth(year, month1);
  const cells: (DateStr | null)[] = [];
  for (let i = 0; i < first; i++) cells.push(null);
  for (let d = 1; d <= total; d++) cells.push(`${year}-${pad2(month1)}-${pad2(d)}`);
  while (cells.length % 7 !== 0) cells.push(null);
  while (cells.length < 42) cells.push(null);
  const rows: (DateStr | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
  return rows;
}

export function formatYearMonth(year: number, month1: number): string {
  return `${year}年 ${month1}月`;
}
