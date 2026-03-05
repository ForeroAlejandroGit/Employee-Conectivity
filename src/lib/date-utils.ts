import {
  startOfMonth,
  endOfMonth,
  subDays,
  subMonths,
  parse,
  format,
} from 'date-fns';

/**
 * Parse the `month` or `days` query parameter into a date range.
 * - `?month=2026-02` → Feb 1 to Feb 28
 * - `?days=30`       → (today − 30) to today
 * - no param         → defaults to current month
 */
export function getDateRange(searchParams: URLSearchParams) {
  const month = searchParams.get('month');
  const days = searchParams.get('days');

  if (month) {
    const start = startOfMonth(parse(`${month}-01`, 'yyyy-MM-dd', new Date()));
    const end = endOfMonth(start);
    return { startDate: start, endDate: end };
  }

  if (days) {
    const d = parseInt(days, 10);
    const now = new Date();
    return { startDate: subDays(now, d), endDate: now };
  }

  // Default: current month
  const now = new Date();
  return { startDate: startOfMonth(now), endDate: now };
}

/**
 * Returns a list of month options for the UI dropdown.
 * E.g. for March 2026: ["2026-03", "2026-02", "2026-01", "2025-12", ...]
 */
export function getAvailableMonths(count = 6): { value: string; label: string }[] {
  const now = new Date();
  const months: { value: string; label: string }[] = [];

  for (let i = 0; i < count; i++) {
    const d = subMonths(now, i);
    months.push({
      value: format(d, 'yyyy-MM'),
      label: format(d, 'MMMM yyyy'),
    });
  }

  return months;
}
