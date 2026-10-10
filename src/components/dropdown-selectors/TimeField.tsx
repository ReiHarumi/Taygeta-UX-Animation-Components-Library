// A 12-hour time field (TT2): an HH:MM text box plus an AM/PM segmented control.
// The value in and out is the caller's 24h `HH:MM` string, so a form's contract
// never changes. View-local draft state only; no business logic.
//
// TT7: the box formats as you type. Digits only; the colon is added for you once
// a minute digit follows; hours stay 01–12 and minutes 00–59. Backspace removes
// one digit at a time. Pasting "930", "09:30" or "9:30 PM" works (a pasted AM/PM
// sets the switch). `inputMode="numeric"` and `pattern="[0-9]*"` bring up the
// phone numpad. The pattern does not match the colon, so a form that hosts this
// field must set `noValidate` (AddTimeModal and EditEntryModal do).
//
// L-6 / TB-L6 (Timesheet spec, UI-43): `size="compact"`, `hourCycle="24"`, `hint`, `error`
// and `onStatusChange` are additive. With none of them set the field behaves as before;
// label, focus ring and error edge now use the same values as `Input` (UI-13/14/15/20).
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { COMPACT_LABEL_CLASS, FieldMessages, LABEL_CLASS, describedBy as joinIds, hasText } from '../field/field';

/** What the text box holds: nothing, a partial time, or a complete time. */
export type TimeFieldStatus = 'empty' | 'incomplete' | 'valid';

export interface TimeFieldProps {
  /** Visible label above the control. */
  label: string;
  /** Id for the HH:MM text box, so a form can move focus to it. */
  id?: string;
  /** The time as 24h `HH:MM`, or `''` for none. */
  value: string;
  /** Fired with 24h `HH:MM` once the box holds a valid time (in the chosen `hourCycle`), or `''` when it doesn't. */
  onChange: (value: string) => void;
  /** Fired when the text box loses focus (to mark the field touched). */
  onBlur?: () => void;
  /**
   * `true` draws the error edge and sets `aria-invalid` without a message of its own (use it
   * when a `FieldGroup` shows the error). The caller's message must be named by `describedBy`.
   * `undefined` or `false`: the state follows `error` alone.
   */
  invalid?: boolean;
  /** Space-separated ids of extra hint or error text (outside this field) for the text box. */
  describedBy?: string;
  /** Extra classes on the wrapper, for layout. */
  className?: string;
  /**
   * Extra classes on the visible label, e.g. `lg:sr-only` where a table header already names
   * the column. The label stays the text box's accessible name either way.
   */
  labelClassName?: string;
  /**
   * `default`: one size, 12px text (as before). `compact`: 40px tall with 16px text under 768,
   * 32px tall with 12px text from 768 up, AM/PM segments at least 40px wide under 768, a 12px/600
   * text-primary label and a 14px alert icon before the error (Timesheet spec L-6; matches
   * `Input` compact). `undefined`: `default`.
   */
  size?: 'default' | 'compact';
  /**
   * `'12'`: hh:mm with an AM/PM group, hours 01–12 (as before). `'24'`: no AM/PM group, hours
   * 00–23 (a first digit of 3–9 becomes "0d"; "24" is never accepted). `value` and `onChange`
   * stay 24h `HH:MM` in both modes. `undefined`: `'12'`.
   */
  hourCycle?: '12' | '24';
  /** Helper text below the field, linked with `aria-describedby`. `undefined`: none. */
  hint?: ReactNode;
  /**
   * Error message below the field. Any non-empty value draws the error edge, sets
   * `aria-invalid` and links the message. `undefined`, `false` or `''`: no error.
   */
  error?: ReactNode;
  /**
   * Fired when the box's state changes: `'empty'` (nothing typed), `'incomplete'` (something
   * typed that is not yet a time, e.g. "09:" or "09:3") or `'valid'`. `onChange` alone cannot
   * tell empty from incomplete, since both emit `''`. Also fires once on mount with the first
   * state. `undefined`: not reported.
   */
  onStatusChange?: (status: TimeFieldStatus) => void;
}

type Meridiem = 'AM' | 'PM';
type Cycle = '12' | '24';

function from24(value: string, cycle: Cycle = '12'): { text: string; meridiem: Meridiem } | null {
  const m = /^(\d{2}):(\d{2})$/.exec(value);
  if (!m) return null;
  const h = Number(m[1]);
  if (cycle === '24') return { text: value, meridiem: h < 12 ? 'AM' : 'PM' };
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return { text: `${String(h12).padStart(2, '0')}:${m[2]}`, meridiem: h < 12 ? 'AM' : 'PM' };
}

/**
 * Display only: a 24h `HH:MM` as the TimeField shows it, e.g. "09:00 AM". Returns the input
 * unchanged if it isn't `HH:MM`, so a read-only cell never shows a guess.
 */
export function formatTime12(value: string): string {
  const t = from24(value);
  return t ? `${t.text} ${t.meridiem}` : value;
}

/** Accepts "9", "9:30", "09:30", "930" or "0930". Returns hour (1–12, or 0–23 in 24h) and minute, or null. */
function parse12(text: string, cycle: Cycle = '12'): { h: number; m: number } | null {
  const t = text.trim();
  let hs: string;
  let ms: string;
  const colon = /^(\d{1,2}):(\d{2})$/.exec(t);
  if (colon) {
    [, hs, ms] = colon;
  } else if (/^\d{1,2}$/.test(t)) {
    hs = t;
    ms = '00';
  } else if (/^\d{3,4}$/.test(t)) {
    hs = t.slice(0, t.length - 2);
    ms = t.slice(-2);
  } else {
    return null;
  }
  const h = Number(hs);
  const m = Number(ms);
  if (m > 59) return null;
  if (cycle === '24' ? h > 23 : h < 1 || h > 12) return null;
  return { h, m };
}

/**
 * TT7 mask. Reads the raw box text left to right and returns the formatted draft:
 * "", "1", "09", "09:", "09:3" or "09:30". A first hour digit of 2–9 becomes
 * "0d"; a second hour digit that would pass 12 starts the minutes instead ("13"
 * gives "01:3"); "00" clamps to "01". A first minute digit of 6–9 becomes "0d".
 * A typed colon after the hour pads it ("9:" gives "09:").
 */
function formatDraft12(raw: string): string {
  let hours = '';
  let mins = '';
  let colon = false;
  const pushMinute = (d: string) => {
    colon = true;
    if (mins.length === 0) mins = d > '5' ? `0${d}` : d;
    else if (mins.length === 1) mins += d;
  };
  for (const ch of raw) {
    if (ch === ':') {
      if (hours.length === 1) hours = hours === '0' ? '01' : `0${hours}`;
      if (hours.length === 2) colon = true;
      continue;
    }
    if (!/\d/.test(ch)) continue;
    if (colon || hours.length === 2) {
      pushMinute(ch);
    } else if (hours.length === 0) {
      hours = ch > '1' ? `0${ch}` : ch;
    } else {
      const candidate = hours + ch;
      if (candidate === '00') hours = '01';
      else if (Number(candidate) > 12) {
        hours = `0${hours}`;
        pushMinute(ch);
      } else hours = candidate;
    }
  }
  return colon ? `${hours}:${mins}` : hours;
}

/**
 * 24-hour mask: hours 00–23. A first hour digit of 3–9 becomes "0d"; after a first "2", a digit
 * of 4–9 starts the minutes ("24" is never accepted, so "2" then "4" gives "02:4"). Minutes as in 12h.
 */
function formatDraft24(raw: string): string {
  let hours = '';
  let mins = '';
  let colon = false;
  const pushMinute = (d: string) => {
    colon = true;
    if (mins.length === 0) mins = d > '5' ? `0${d}` : d;
    else if (mins.length === 1) mins += d;
  };
  for (const ch of raw) {
    if (ch === ':') {
      if (hours.length === 1) hours = `0${hours}`;
      if (hours.length === 2) colon = true;
      continue;
    }
    if (!/\d/.test(ch)) continue;
    if (colon || hours.length === 2) pushMinute(ch);
    else if (hours.length === 0) hours = ch > '2' ? `0${ch}` : ch;
    else if (hours === '2' && ch > '3') {
      hours = '02';
      pushMinute(ch);
    } else hours += ch;
  }
  return colon ? `${hours}:${mins}` : hours;
}

function formatDraft(raw: string, cycle: Cycle): string {
  return cycle === '24' ? formatDraft24(raw) : formatDraft12(raw);
}

function to24(h: number, m: number, meridiem: Meridiem, cycle: Cycle = '12'): string {
  const h24 = cycle === '24' ? h : (h % 12) + (meridiem === 'PM' ? 12 : 0);
  return `${String(h24).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export default function TimeField({
  label,
  id,
  value,
  onChange,
  onBlur,
  invalid,
  describedBy,
  className,
  labelClassName,
  size = 'default',
  hourCycle = '12',
  hint,
  error,
  onStatusChange,
}: TimeFieldProps) {
  const uid = useId();
  const inputId = id ?? `${uid}-time`;
  const labelId = `${uid}-label`;
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;
  const cycle: Cycle = hourCycle === '24' ? '24' : '12';
  const compact = size === 'compact';
  const hasError = hasText(error);
  const showError = hasError || invalid === true;
  const initial = from24(value, cycle);
  const [text, setText] = useState(initial?.text ?? '');
  const [meridiem, setMeridiem] = useState<Meridiem>(initial?.meridiem ?? 'AM');
  const amRef = useRef<HTMLButtonElement>(null);
  const pmRef = useRef<HTMLButtonElement>(null);

  // Keep the draft in step if the caller replaces the value (e.g. a reset).
  useEffect(() => {
    const parsed = parse12(text, cycle);
    const current = parsed ? to24(parsed.h, parsed.m, meridiem, cycle) : '';
    if (value === current) return;
    const next = from24(value, cycle);
    if (next) {
      setText(next.text);
      setMeridiem(next.meridiem);
    } else if (value === '' && parsed) {
      setText('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // Redraw the stored value in the new mode if `hourCycle` changes.
  const firstCycle = useRef(true);
  useEffect(() => {
    if (firstCycle.current) {
      firstCycle.current = false;
      return;
    }
    const next = from24(value, cycle);
    if (next) {
      setText(next.text);
      setMeridiem(next.meridiem);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cycle]);

  const status: TimeFieldStatus = text === '' ? 'empty' : parse12(text, cycle) ? 'valid' : 'incomplete';
  const statusRef = useRef(onStatusChange);
  statusRef.current = onStatusChange;
  useEffect(() => {
    statusRef.current?.(status);
  }, [status]);

  const emit = (nextText: string, nextMeridiem: Meridiem) => {
    const parsed = parse12(nextText, cycle);
    onChange(parsed ? to24(parsed.h, parsed.m, nextMeridiem, cycle) : '');
  };

  const pickMeridiem = (next: Meridiem, focus = false) => {
    setMeridiem(next);
    emit(text, next);
    if (focus) (next === 'AM' ? amRef : pmRef).current?.focus();
  };

  const onSegmentKey = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
      e.preventDefault();
      pickMeridiem(meridiem === 'AM' ? 'PM' : 'AM', true);
    }
  };

  const segment = (m: Meridiem) => {
    const on = meridiem === m;
    return (
      <button
        ref={m === 'AM' ? amRef : pmRef}
        type="button"
        role="radio"
        aria-checked={on}
        tabIndex={on ? 0 : -1}
        onClick={() => pickMeridiem(m)}
        onKeyDown={onSegmentKey}
        className={`${compact ? 'min-w-10 px-2 tablet:min-w-0' : 'px-2'} text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-(--color-focus-ring) ${
          on
            ? 'bg-bay-leaf-200 text-bay-leaf-900 ring-1 ring-inset ring-bay-leaf-600'
            : 'bg-surface-elevated text-text-secondary hover:bg-bay-leaf-100 hover:text-bay-leaf-900'
        }`}
      >
        {m}
      </button>
    );
  };

  return (
    <div className={`min-w-0 ${className ?? ''}`}>
      <label id={labelId} htmlFor={inputId} className={`mb-1 ${compact ? COMPACT_LABEL_CLASS : LABEL_CLASS} ${labelClassName ?? ''}`}>
        {label}
      </label>
      <div className="flex items-stretch gap-1.5">
        <input
          id={inputId}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="off"
          placeholder="hh:mm"
          value={text}
          onChange={(e) => {
            const raw = e.target.value;
            const native = e.nativeEvent as InputEvent;
            let next: string;
            const [h, m = ''] = text.split(':');
            if (
              native.inputType?.startsWith('delete') &&
              m !== '' &&
              raw.replace(/\D/g, '') === text.replace(/\D/g, '') &&
              raw.length < text.length
            ) {
              // Only the colon between hour and minutes was removed: take the hour
              // digit before it too, so Backspace is never stuck on a colon the
              // mask would put straight back.
              next = formatDraft(h.slice(0, -1) + m, cycle);
            } else {
              next = formatDraft(raw, cycle);
            }
            // A pasted "9:30 PM" (or a typed "p" / "a") also sets the AM/PM switch (12h only).
            let nextMeridiem = meridiem;
            if (cycle === '12' && /[ap]/i.test(raw)) {
              if (/p/i.test(raw)) nextMeridiem = 'PM';
              else if (/a/i.test(raw)) nextMeridiem = 'AM';
              setMeridiem(nextMeridiem);
            }
            setText(next);
            emit(next, nextMeridiem);
          }}
          onBlur={() => {
            const parsed = parse12(text, cycle);
            if (parsed) setText(`${String(parsed.h).padStart(2, '0')}:${String(parsed.m).padStart(2, '0')}`);
            onBlur?.();
          }}
          aria-invalid={showError || undefined}
          aria-describedby={joinIds(hasText(hint) && hintId, hasError && errorId, describedBy)}
          className={`flex-1 min-w-0 border rounded-lg px-2.5 ${
            compact ? 'h-10 text-base tablet:h-8 tablet:text-xs' : 'py-1.5 text-xs'
          } bg-surface-elevated text-text-primary tabular-nums placeholder-text-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-(--color-focus-ring) ${
            showError ? 'border-error-600' : 'border-border-field'
          }`}
        />
        {cycle === '12' && (
          <div
            role="radiogroup"
            aria-label={`${label}: AM or PM`}
            className="flex shrink-0 rounded-lg border border-border-field overflow-hidden divide-x divide-border-subtle"
          >
            {segment('AM')}
            {segment('PM')}
          </div>
        )}
      </div>
      {(hint !== undefined || error !== undefined) && (
        <FieldMessages hintId={hintId} errorId={errorId} hint={hint} error={error} compact={compact} />
      )}
    </div>
  );
}
