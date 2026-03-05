import { isWeekend, format } from 'date-fns';

/**
 * Colombian public holidays (Festivos) for 2025-2027.
 * Includes both fixed holidays and Ley Emiliani (moved-to-Monday) holidays.
 */
const HOLIDAYS: Record<string, string> = {
  // ─── 2025 ───────────────────────────────────────
  '2025-01-01': 'Año Nuevo',
  '2025-01-06': 'Reyes Magos',
  '2025-03-24': 'San José',
  '2025-04-17': 'Jueves Santo',
  '2025-04-18': 'Viernes Santo',
  '2025-05-01': 'Día del Trabajo',
  '2025-06-02': 'Ascensión',
  '2025-06-23': 'Corpus Christi',
  '2025-06-30': 'Sagrado Corazón / San Pedro y San Pablo',
  '2025-07-20': 'Independencia',
  '2025-08-07': 'Batalla de Boyacá',
  '2025-08-18': 'Asunción',
  '2025-10-13': 'Día de la Raza',
  '2025-11-03': 'Todos los Santos',
  '2025-11-17': 'Independencia de Cartagena',
  '2025-12-08': 'Inmaculada Concepción',
  '2025-12-25': 'Navidad',

  // ─── 2026 ───────────────────────────────────────
  '2026-01-01': 'Año Nuevo',
  '2026-01-12': 'Reyes Magos',
  '2026-03-23': 'San José',
  '2026-04-02': 'Jueves Santo',
  '2026-04-03': 'Viernes Santo',
  '2026-05-01': 'Día del Trabajo',
  '2026-05-18': 'Ascensión',
  '2026-06-08': 'Corpus Christi',
  '2026-06-15': 'Sagrado Corazón',
  '2026-06-29': 'San Pedro y San Pablo',
  '2026-07-20': 'Independencia',
  '2026-08-07': 'Batalla de Boyacá',
  '2026-08-17': 'Asunción',
  '2026-10-12': 'Día de la Raza',
  '2026-11-02': 'Todos los Santos',
  '2026-11-16': 'Independencia de Cartagena',
  '2026-12-08': 'Inmaculada Concepción',
  '2026-12-25': 'Navidad',

  // ─── 2027 ───────────────────────────────────────
  '2027-01-01': 'Año Nuevo',
  '2027-01-11': 'Reyes Magos',
  '2027-03-22': 'San José',
  '2027-03-25': 'Jueves Santo',
  '2027-03-26': 'Viernes Santo',
  '2027-05-01': 'Día del Trabajo',
  '2027-05-10': 'Ascensión',
  '2027-05-31': 'Corpus Christi',
  '2027-06-07': 'Sagrado Corazón',
  '2027-06-28': 'San Pedro y San Pablo',
  '2027-07-20': 'Independencia',
  '2027-08-07': 'Batalla de Boyacá',
  '2027-08-16': 'Asunción',
  '2027-10-18': 'Día de la Raza',
  '2027-11-01': 'Todos los Santos',
  '2027-11-15': 'Independencia de Cartagena',
  '2027-12-08': 'Inmaculada Concepción',
  '2027-12-25': 'Navidad',
};

/** Check if a date is a Colombian holiday */
export function isColombianHoliday(date: Date): boolean {
  return format(date, 'yyyy-MM-dd') in HOLIDAYS;
}

/** Get the holiday name for a date, or null */
export function getHolidayName(date: Date): string | null {
  return HOLIDAYS[format(date, 'yyyy-MM-dd')] ?? null;
}

/** Check if a date is a business day (not weekend, not holiday) */
export function isBusinessDay(date: Date): boolean {
  return !isWeekend(date) && !isColombianHoliday(date);
}

/** Get all holidays in a given month (yyyy-MM format) */
export function getHolidaysInMonth(month: string): { date: string; name: string }[] {
  return Object.entries(HOLIDAYS)
    .filter(([d]) => d.startsWith(month))
    .map(([date, name]) => ({ date, name }));
}
