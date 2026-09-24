// The shared calendar picker: week (Dashboard), range (Calendar tab) and single
// (form date fields via ui/DateField). Pure date
// math lives in lib/dates.ts (G10); this file re-exports it for the View files
// that already call these names, and holds the picker markup plus the
// view-local keyboard navigation for the date grid (APG date-grid pattern).
import React, { useEffect, useId, useRef, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  MONTH_SHORT, MONTH_LONG, isoToDate, toIso, weekDatesFrom, mondayOf,
  weekFromAnyDate, shiftWeek, formatWeekRange, formatWeekRangeNumeric,
} from '../../utils/dates';

export { MONTH_SHORT, isoToDate, toIso, weekDatesFrom, mondayOf, weekFromAnyDate, shiftWeek, formatWeekRange, formatWeekRangeNumeric };

// Mock "today" — matches the reference date used throughout src/mock.
// TODO(cofounder): rule-2 debt — "today" and the two week presets below are
// computed in the View. Callers can override them with `presets` in range mode.
export const TODAY = '2026-08-20';
export const THIS_WEEK_DATES = weekFromAnyDate(TODAY);
export const LAST_WEEK_DATES = shiftWeek(THIS_WEEK_DATES, -1);

export const CAL_PRESETS: Array<{ id: string; label: string; dates: string[] }> = [
  { id: 'this_week', label: 'This week', dates: THIS_WEEK_DATES },
  { id: 'last_week', label: 'Last week', dates: LAST_WEEK_DATES },
];

export function presetIdFrom(dates: string[]): string {
  if (!dates.length) return 'custom';
  if (dates[0] === THIS_WEEK_DATES[0]) return 'this_week';
  if (dates[0] === LAST_WEEK_DATES[0]) return 'last_week';
  return 'custom';
}

/** An inclusive date span. Both ends are ISO calendar dates (`YYYY-MM-DD`), workspace timezone; `start <= end`. */
export interface DateRange {
  /** First day shown, ISO `YYYY-MM-DD`, inclusive. */
  start: string;
  /** Last day shown, ISO `YYYY-MM-DD`, inclusive. Equal to `start` for a one-day range. */
  end: string;
}

/** A named range in the picker's preset rail. */
export interface RangePreset {
  /** Stable id, e.g. `this_week`, `last_week`, `this_cutoff`, `last_cutoff`. Never `custom` (reserved for grid picks). */
  id: string;
  /** Visible label, e.g. "This cut-off". */
  label: string;
  /** First day, ISO `YYYY-MM-DD`, inclusive. */
  start: string;
  /** Last day, ISO `YYYY-MM-DD`, inclusive. */
  end: string;
}

/** The two week presets as ranges (same in-View debt as `CAL_PRESETS`). */
export const WEEK_RANGE_PRESETS: RangePreset[] = CAL_PRESETS.map((p) => ({
  id: p.id, label: p.label, start: p.dates[0], end: p.dates[p.dates.length - 1],
}));

// ─── View-local date helpers (keyboard navigation and display only) ─────────

function addDays(ds: string, n: number): string {
  const d = isoToDate(ds);
  d.setDate(d.getDate() + n);
  return toIso(d);
}

function addMonths(ds: string, n: number): string {
  const d = isoToDate(ds);
  const day = d.getDate();
  const target = new Date(d.getFullYear(), d.getMonth() + n, 1);
  const last = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(day, last));
  return toIso(target);
}

/** Every ISO date from `r.start` to `r.end`, inclusive. Display enumeration only. */
export function datesInRange(r: DateRange): string[] {
  const out: string[] = [];
  for (let ds = r.start; ds <= r.end; ds = addDays(ds, 1)) out.push(ds);
  return out;
}

/** "Sep 3 – Sep 14, 2026", matching `formatWeekRange`. */
export function formatRange(r: DateRange): string {
  const s = isoToDate(r.start);
  const e = isoToDate(r.end);
  const startPart = s.getFullYear() === e.getFullYear()
    ? `${MONTH_SHORT[s.getMonth()]} ${s.getDate()}`
    : `${MONTH_SHORT[s.getMonth()]} ${s.getDate()}, ${s.getFullYear()}`;
  return `${startPart} – ${MONTH_SHORT[e.getMonth()]} ${e.getDate()}, ${e.getFullYear()}`;
}

/** "Thursday, 20 August 2026" — the accessible name of a day cell. */
function longDate(ds: string): string {
  return isoToDate(ds).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

const DOW = [
  { short: 'Mo', long: 'Monday' }, { short: 'Tu', long: 'Tuesday' }, { short: 'We', long: 'Wednesday' },
  { short: 'Th', long: 'Thursday' }, { short: 'Fr', long: 'Friday' }, { short: 'Sa', long: 'Saturday' },
  { short: 'Su', long: 'Sunday' },
];

export function MonthGrid({
  year, month, range, focusDate, onDayClick, onDayKeyDown,
}: {
  year: number; month: number;
  /** Highlighted span, or null for none. */
  range: DateRange | null;
  /** The one cell that is in the tab order (roving tabindex). */
  focusDate: string;
  onDayClick: (ds: string) => void;
  onDayKeyDown: (e: React.KeyboardEvent<HTMLButtonElement>, ds: string) => void;
}) {
  const headingId = useId();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDow = new Date(year, month, 1).getDay();
  const offset = firstDow === 0 ? 6 : firstDow - 1;

  const cells: Array<{ day: number; ds: string } | null> = [
    ...Array(offset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      const ds = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      return { day, ds };
    }),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  const rows = Array.from({ length: cells.length / 7 }, (_, r) => cells.slice(r * 7, r * 7 + 7));

  return (
    <div className="w-[168px]">
      <p id={headingId} aria-live="polite" className="text-center text-caption font-bold text-text-secondary mb-1.5 tracking-wide">
        {MONTH_LONG[month]} {year}
      </p>
      <div role="grid" aria-labelledby={headingId}>
        <div role="row" className="grid grid-cols-7">
          {DOW.map((d) => (
            <div key={d.short} role="columnheader" aria-label={d.long} className="h-6 flex items-center justify-center text-caption-sm text-text-secondary font-semibold">{d.short}</div>
          ))}
        </div>
        {rows.map((row, r) => (
          <div key={r} role="row" className="grid grid-cols-7">
            {row.map((cell, i) => {
              if (!cell) return <div key={i} role="gridcell" className="h-6" />;
              const { day, ds } = cell;
              const inRange = !!range && ds >= range.start && ds <= range.end;
              const isStart = !!range && range.start === ds;
              const isEnd = !!range && range.end === ds;
              const isToday = ds === TODAY;
              const isMid = inRange && !isStart && !isEnd;
              return (
                <div
                  key={i}
                  role="gridcell"
                  aria-selected={inRange}
                  className={`relative flex items-center justify-center h-6
                    ${isMid || isStart || isEnd ? 'bg-bay-leaf-200' : ''}
                    ${isStart ? 'rounded-l-full' : ''}
                    ${isEnd ? 'rounded-r-full' : ''}
                  `}
                >
                  <button
                    type="button"
                    data-date={ds}
                    tabIndex={ds === focusDate ? 0 : -1}
                    aria-label={longDate(ds)}
                    aria-current={isToday ? 'date' : undefined}
                    onClick={() => onDayClick(ds)}
                    onKeyDown={(e) => onDayKeyDown(e, ds)}
                    className={`
                      w-6 h-6 flex items-center justify-center rounded-full text-caption transition-colors cursor-pointer select-none
                      focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-bay-leaf-600
                      ${isStart || isEnd ? 'bg-bay-leaf-200 text-bay-leaf-900 font-bold ring-1 ring-inset ring-bay-leaf-600' : ''}
                      ${!inRange && !isToday ? 'text-text-secondary hover:bg-bay-leaf-100' : ''}
                      ${isToday && !inRange ? 'ring-1 ring-bay-leaf-600 text-text-primary font-semibold' : ''}
                      ${isMid ? 'text-bay-leaf-900' : ''}
                    `}
                  >
                    {day}
                  </button>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Options every mode shares. All optional; omitting them keeps the original behaviour. */
interface SharedPickerProps {
  /** Move focus to the grid's roving cell when the picker opens (APG dialog behaviour). */
  autoFocusGrid?: boolean;
  /**
   * Which edge of the trigger the desktop popover (1024px and up) lines up with.
   * `end` (default) keeps the original right-aligned popover; `start` aligns left.
   * Below 1024px the picker is always a sheet and this has no effect.
   */
  align?: 'start' | 'end';
  /** Accessible name of the dialog. Defaults to "Choose week", "Choose date range" or "Choose date". */
  dialogLabel?: string;
  /**
   * How a single ISO date is shown in the summary cells above the grid.
   * Defaults to `DD/MM/YYYY`. Display only.
   */
  formatDay?: (iso: string) => string;
}

/** Week mode (Dashboard): any day click snaps to its Monday–Sunday week. Unchanged contract. */
interface WeekModeProps extends SharedPickerProps {
  selectionMode?: 'week';
  /** The selected week, seven ISO dates Monday–Sunday. */
  selectedDates: string[];
  /** Highlighted preset id (`this_week`, `last_week`) or `custom`. */
  selectedPreset: string;
  onSelectWeek: (dates: string[], preset: string) => void;
}

/** Range mode (Calendar tab): presets, then two grid clicks (start, end; swapped if reversed). */
interface RangeModeProps extends SharedPickerProps {
  selectionMode: 'range';
  /** The committed range, or null when none is chosen. */
  value: DateRange | null;
  /** Preset rail, in display order. Each preset's dates come from the caller. An empty list hides the rail. */
  presets: RangePreset[];
  /** Fired on a preset click (`presetId` = its id) or on the second grid click (`presetId` = `custom`). */
  onSelectRange: (range: DateRange, presetId: string) => void;
}

/** Single mode (form date fields): one grid click picks one day. One month shown, no preset rail. */
interface SingleModeProps extends SharedPickerProps {
  selectionMode: 'single';
  /** The committed date, ISO `YYYY-MM-DD`, or null when none is chosen. */
  value: string | null;
  /** Fired on a grid click (mouse, or Enter/Space on the focused cell) with the ISO date. */
  onSelectDate: (iso: string) => void;
}

export type WeekCalendarPickerProps = WeekModeProps | RangeModeProps | SingleModeProps;

export function WeekCalendarPicker(props: WeekCalendarPickerProps) {
  const isRange = props.selectionMode === 'range';
  const isSingle = props.selectionMode === 'single';
  const monthsShown = isSingle ? 1 : 2;

  // The committed span this picker highlights.
  const committed: DateRange | null = props.selectionMode === 'range'
    ? props.value
    : props.selectionMode === 'single'
      ? (props.value ? { start: props.value, end: props.value } : null)
      : props.selectedDates.length
        ? { start: props.selectedDates[0], end: props.selectedDates[props.selectedDates.length - 1] }
        : null;

  // Range mode: first click sets a pending start; the second click commits.
  const [pendingStart, setPendingStart] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState('');

  const shown: DateRange | null = pendingStart ? { start: pendingStart, end: pendingStart } : committed;

  const anchor = committed?.start ?? TODAY;
  const startDate = isoToDate(anchor);
  const [viewYear, setViewYear] = useState(startDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(startDate.getMonth());
  const [focusDate, setFocusDate] = useState(anchor);
  const rootRef = useRef<HTMLDivElement>(null);
  const moveFocusRef = useRef(false);

  const m2 = viewMonth === 11 ? 0 : viewMonth + 1;
  const y2 = viewMonth === 11 ? viewYear + 1 : viewYear;
  const firstVisible = toIso(new Date(viewYear, viewMonth, 1));
  const lastVisible = isSingle
    ? toIso(new Date(viewYear, viewMonth + 1, 0))
    : toIso(new Date(y2, m2 + 1, 0));
  // Roving tabindex: the focus date if it is on screen, else the 1st of the left month.
  const tabbable = focusDate >= firstVisible && focusDate <= lastVisible ? focusDate : firstVisible;

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  };

  useEffect(() => {
    if (props.autoFocusGrid) moveFocusRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!moveFocusRef.current) return;
    moveFocusRef.current = false;
    rootRef.current?.querySelector<HTMLButtonElement>(`button[data-date="${tabbable}"]`)?.focus();
  });

  const handleDayClick = (ds: string) => {
    setFocusDate(ds);
    if (props.selectionMode === 'single') {
      setAnnouncement(`Selected ${longDate(ds)}.`);
      props.onSelectDate(ds);
      return;
    }
    if (props.selectionMode !== 'range') {
      const dates = weekFromAnyDate(ds);
      props.onSelectWeek(dates, presetIdFrom(dates));
      return;
    }
    if (!pendingStart) {
      setPendingStart(ds);
      setAnnouncement(`Start date ${longDate(ds)}. Choose an end date.`);
      return;
    }
    const range = ds < pendingStart ? { start: ds, end: pendingStart } : { start: pendingStart, end: ds };
    setPendingStart(null);
    setAnnouncement(`Selected ${longDate(range.start)} to ${longDate(range.end)}.`);
    props.onSelectRange(range, 'custom');
  };

  const handleDayKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, ds: string) => {
    const dow = (isoToDate(ds).getDay() + 6) % 7; // 0 = Monday
    let next: string | null = null;
    switch (e.key) {
      case 'ArrowLeft': next = addDays(ds, -1); break;
      case 'ArrowRight': next = addDays(ds, 1); break;
      case 'ArrowUp': next = addDays(ds, -7); break;
      case 'ArrowDown': next = addDays(ds, 7); break;
      case 'Home': next = addDays(ds, -dow); break;
      case 'End': next = addDays(ds, 6 - dow); break;
      case 'PageUp': next = addMonths(ds, e.shiftKey ? -12 : -1); break;
      case 'PageDown': next = addMonths(ds, e.shiftKey ? 12 : 1); break;
      default: return; // Enter/Space activate the button natively; Escape is the host's.
    }
    e.preventDefault();
    const d = isoToDate(next);
    if (next < firstVisible) {
      setViewYear(d.getFullYear()); setViewMonth(d.getMonth());
    } else if (next > lastVisible) {
      const left = new Date(d.getFullYear(), d.getMonth() - (monthsShown - 1), 1);
      setViewYear(left.getFullYear()); setViewMonth(left.getMonth());
    }
    moveFocusRef.current = true;
    setFocusDate(next);
  };

  const fmtCell = (ds: string) => {
    if (!ds) return '—';
    if (props.formatDay) return props.formatDay(ds);
    const [y, mo, d] = ds.split('-');
    return `${d}/${mo}/${y}`;
  };

  let presetRail: Array<{ id: string; label: string; onPick: () => void }> = [];
  let activePresetId: string | null = null;
  if (props.selectionMode === 'range') {
    const { presets, onSelectRange, value } = props;
    presetRail = presets.map((p) => ({
      id: p.id,
      label: p.label,
      onPick: () => {
        setPendingStart(null);
        setAnnouncement(`${p.label}: ${longDate(p.start)} to ${longDate(p.end)}.`);
        onSelectRange({ start: p.start, end: p.end }, p.id);
      },
    }));
    activePresetId = pendingStart || !value ? null : presets.find((p) => p.start === value.start && p.end === value.end)?.id ?? null;
  } else if (props.selectionMode !== 'single') {
    const { onSelectWeek } = props;
    presetRail = CAL_PRESETS.map((p) => ({
      id: p.id,
      label: p.label,
      onPick: () => { if (p.dates.length) onSelectWeek(p.dates, p.id); },
    }));
    activePresetId = props.selectedPreset;
  }

  const dialogLabel = props.dialogLabel ?? (isSingle ? 'Choose date' : isRange ? 'Choose date range' : 'Choose week');
  const alignCls = props.align === 'start' ? 'lg:left-0' : 'lg:right-0';

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-label={dialogLabel}
      className={`fixed inset-x-4 top-20 max-h-[calc(100dvh-6rem)] overflow-y-auto lg:absolute lg:inset-x-auto lg:max-h-none lg:top-full lg:mt-1 ${alignCls} lg:overflow-hidden z-30 bg-surface-elevated rounded-xl border border-border-subtle shadow-lg flex flex-col lg:flex-row`}
    >
      {presetRail.length > 0 && (
      <div role="group" aria-label="Presets" className="w-full lg:w-36 border-b lg:border-b-0 lg:border-r border-neutral-100 py-1.5 shrink-0">
        {presetRail.map((p) => (
          <button
            key={p.id}
            type="button"
            aria-pressed={activePresetId === p.id}
            onClick={p.onPick}
            className={`w-full text-left px-3 py-2 text-xs transition-colors
              ${activePresetId === p.id ? 'bg-bay-leaf-200 text-bay-leaf-900 font-semibold ring-1 ring-inset ring-bay-leaf-600' : 'text-text-secondary hover:bg-bay-leaf-100'}
            `}
          >
            {p.label}
          </button>
        ))}
      </div>
      )}

      <div className="p-4 self-center lg:self-auto">
        <div className="flex items-center gap-2 mb-2">
          {isSingle ? (
            <div className="flex items-center gap-1.5 border border-border-subtle rounded-lg px-2.5 py-1.5 bg-surface-default">
              <Calendar className="w-3.5 h-3.5 text-text-secondary shrink-0" aria-hidden="true" />
              <span className="text-xs tabular-nums text-text-secondary"><span className="sr-only">Selected </span>{fmtCell(shown?.start || '')}</span>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-1.5 border border-border-subtle rounded-lg px-2.5 py-1.5 bg-surface-default">
                <Calendar className="w-3.5 h-3.5 text-text-secondary shrink-0" aria-hidden="true" />
                <span className="text-xs tabular-nums text-text-secondary"><span className="sr-only">Start </span>{fmtCell(shown?.start || '')}</span>
              </div>
              <span className="text-neutral-700 text-sm" aria-hidden="true">{'–'}</span>
              <div className="flex items-center gap-1.5 border border-border-subtle rounded-lg px-2.5 py-1.5 bg-surface-default">
                <Calendar className="w-3.5 h-3.5 text-text-secondary shrink-0" aria-hidden="true" />
                <span className="text-xs tabular-nums text-text-secondary"><span className="sr-only">End </span>{fmtCell(pendingStart ? '' : shown?.end || '')}</span>
              </div>
            </>
          )}
        </div>

        <div className="flex items-start gap-1">
          <button type="button" aria-label="Previous month" onClick={prevMonth} className="p-1 mt-[22px] text-text-secondary hover:text-text-secondary hover:bg-neutral-100 rounded-lg transition-colors shrink-0">
            <ChevronLeft className="w-4 h-4" aria-hidden="true" />
          </button>
          <div className="flex flex-col sm:flex-row gap-2">
            <MonthGrid year={viewYear} month={viewMonth} range={shown} focusDate={tabbable} onDayClick={handleDayClick} onDayKeyDown={handleDayKeyDown} />
            {!isSingle && (
              <MonthGrid year={y2} month={m2} range={shown} focusDate={tabbable} onDayClick={handleDayClick} onDayKeyDown={handleDayKeyDown} />
            )}
          </div>
          <button type="button" aria-label="Next month" onClick={nextMonth} className="p-1 mt-[22px] text-text-secondary hover:text-text-secondary hover:bg-neutral-100 rounded-lg transition-colors shrink-0">
            <ChevronRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
        <p className="sr-only" aria-live="polite">{announcement}</p>
      </div>
    </div>
  );
}
