// Date helpers used by WeekPicker.
//
// Copied from Timer MVP (`Polaris-MDBS UI-UX Frontend/src/lib/dates.ts`) on 2026-09-25,
// verbatim, only the functions WeekPicker imports. Timer's copy is authoritative for
// Timer; this copy is authoritative for @polaris/ui. The two can drift: a fix in one
// is not applied to the other automatically.

export const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
export const MONTH_LONG = ['January','February','March','April','May','June',
  'July','August','September','October','November','December'];

export function isoToDate(s: string): Date {
  return new Date(s + 'T00:00:00');
}

export function toIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function weekDatesFrom(monday: Date): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return toIso(d);
  });
}

export function mondayOf(ds: string): Date {
  const d = isoToDate(ds);
  const dow = d.getDay();
  d.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
  return d;
}

export function weekFromAnyDate(ds: string): string[] {
  return weekDatesFrom(mondayOf(ds));
}

export function shiftWeek(dates: string[], delta: number): string[] {
  if (!dates.length) return dates;
  return dates.map((d) => {
    const dt = isoToDate(d);
    dt.setDate(dt.getDate() + delta * 7);
    return toIso(dt);
  });
}

export function formatWeekRange(dates: string[]): string {
  if (dates.length < 7) return '';
  const s = isoToDate(dates[0]);
  const e = isoToDate(dates[6]);
  return `${MONTH_SHORT[s.getMonth()]} ${s.getDate()} – ${MONTH_SHORT[e.getMonth()]} ${e.getDate()}, ${e.getFullYear()}`;
}

export function formatWeekRangeNumeric(dates: string[]): string {
  if (dates.length < 7) return '';
  const fmt = (ds: string) => {
    const [y, mo, d] = ds.split('-');
    return `${d}/${mo}/${y}`;
  };
  return `${fmt(dates[0])} – ${fmt(dates[6])}`;
}
