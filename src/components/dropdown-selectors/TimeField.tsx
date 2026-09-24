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
import { useEffect, useId, useRef, useState } from 'react';

export interface TimeFieldProps {
  /** Visible label above the control. */
  label: string;
  /** Id for the HH:MM text box, so a form can move focus to it. */
  id?: string;
  /** The time as 24h `HH:MM`, or `''` for none. */
  value: string;
  /** Fired with 24h `HH:MM` once the box holds a valid 12-hour time, or `''` when it doesn't. */
  onChange: (value: string) => void;
  /** Fired when the text box loses focus (to mark the field touched). */
  onBlur?: () => void;
  /** `true` shows the error border. The error text must be named by `describedBy`. */
  invalid?: boolean;
  /** Space-separated ids of hint and error text for the text box. */
  describedBy?: string;
  /** Extra classes on the wrapper, for layout. */
  className?: string;
  /**
   * Extra classes on the visible label, e.g. `lg:sr-only` where a table header already names
   * the column. The label stays the text box's accessible name either way.
   */
  labelClassName?: string;
}

type Meridiem = 'AM' | 'PM';

function from24(value: string): { text: string; meridiem: Meridiem } | null {
  const m = /^(\d{2}):(\d{2})$/.exec(value);
  if (!m) return null;
  const h = Number(m[1]);
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

/** Accepts "9", "9:30", "09:30", "930" or "0930". Returns hour 1–12 and minute, or null. */
function parse12(text: string): { h: number; m: number } | null {
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
  if (h < 1 || h > 12 || m > 59) return null;
  return { h, m };
}

/**
 * TT7 mask. Reads the raw box text left to right and returns the formatted draft:
 * "", "1", "09", "09:", "09:3" or "09:30". A first hour digit of 2–9 becomes
 * "0d"; a second hour digit that would pass 12 starts the minutes instead ("13"
 * gives "01:3"); "00" clamps to "01". A first minute digit of 6–9 becomes "0d".
 * A typed colon after the hour pads it ("9:" gives "09:").
 */
function formatDraft(raw: string): string {
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

function to24(h: number, m: number, meridiem: Meridiem): string {
  const h24 = (h % 12) + (meridiem === 'PM' ? 12 : 0);
  return `${String(h24).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export default function TimeField({ label, id, value, onChange, onBlur, invalid, describedBy, className, labelClassName }: TimeFieldProps) {
  const uid = useId();
  const inputId = id ?? `${uid}-time`;
  const labelId = `${uid}-label`;
  const initial = from24(value);
  const [text, setText] = useState(initial?.text ?? '');
  const [meridiem, setMeridiem] = useState<Meridiem>(initial?.meridiem ?? 'AM');
  const amRef = useRef<HTMLButtonElement>(null);
  const pmRef = useRef<HTMLButtonElement>(null);

  // Keep the draft in step if the caller replaces the value (e.g. a reset).
  useEffect(() => {
    const parsed = parse12(text);
    const current = parsed ? to24(parsed.h, parsed.m, meridiem) : '';
    if (value === current) return;
    const next = from24(value);
    if (next) {
      setText(next.text);
      setMeridiem(next.meridiem);
    } else if (value === '' && parsed) {
      setText('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const emit = (nextText: string, nextMeridiem: Meridiem) => {
    const parsed = parse12(nextText);
    onChange(parsed ? to24(parsed.h, parsed.m, nextMeridiem) : '');
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
        className={`px-2 text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-bay-leaf-600 ${
          on
            ? 'bg-bay-leaf-200 text-bay-leaf-900 ring-1 ring-inset ring-bay-leaf-600'
            : 'bg-surface-elevated text-text-secondary hover:bg-bay-leaf-100'
        }`}
      >
        {m}
      </button>
    );
  };

  return (
    <div className={`min-w-0 ${className ?? ''}`}>
      <label id={labelId} htmlFor={inputId} className={`mb-1 block text-caption font-semibold text-text-secondary ${labelClassName ?? ''}`}>
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
              next = formatDraft(h.slice(0, -1) + m);
            } else {
              next = formatDraft(raw);
            }
            // A pasted "9:30 PM" (or a typed "p" / "a") also sets the AM/PM switch.
            let nextMeridiem = meridiem;
            if (/[ap]/i.test(raw)) {
              if (/p/i.test(raw)) nextMeridiem = 'PM';
              else if (/a/i.test(raw)) nextMeridiem = 'AM';
              setMeridiem(nextMeridiem);
            }
            setText(next);
            emit(next, nextMeridiem);
          }}
          onBlur={() => {
            const parsed = parse12(text);
            if (parsed) setText(`${String(parsed.h).padStart(2, '0')}:${String(parsed.m).padStart(2, '0')}`);
            onBlur?.();
          }}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          className={`flex-1 min-w-0 border rounded-lg px-2.5 py-1.5 text-xs bg-surface-elevated text-text-primary tabular-nums placeholder-text-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-bay-leaf-600 ${
            invalid ? 'border-error-400' : 'border-border-default'
          }`}
        />
        <div
          role="radiogroup"
          aria-label={`${label}: AM or PM`}
          className="flex shrink-0 rounded-lg border border-border-default overflow-hidden divide-x divide-border-subtle"
        >
          {segment('AM')}
          {segment('PM')}
        </div>
      </div>
    </div>
  );
}
