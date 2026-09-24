// A form date field: a button-like trigger that opens the shared calendar
// picker (ui/WeekPicker) in a popover, as a sheet below 1024px. Single or
// range. View-local open state only; the value is the caller's.
import { useId, useRef, useState } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import { useDismiss } from '../../hooks/useDismiss';
import {
  WeekCalendarPicker, formatRange, isoToDate, MONTH_SHORT,
  type DateRange, type RangePreset,
} from './WeekPicker';

interface DateFieldBase {
  /** Visible label above the trigger. Also the first part of the trigger's accessible name. */
  label: string;
  /** Trigger text while no value is chosen. Defaults to "Choose a date" / "Choose dates". */
  placeholder?: string;
  /** Space-separated ids of hint and error text, wired to the trigger's `aria-describedby`. */
  describedBy?: string;
  /**
   * `true` shows the error border. The error itself must be in an element
   * named by `describedBy`, which is how assistive tech hears it.
   */
  invalid?: boolean;
  /** Which trigger edge the desktop popover lines up with. Defaults to `start`. */
  align?: 'start' | 'end';
  /** Accessible name of the picker dialog. Defaults to `label`. */
  dialogLabel?: string;
  /** How one ISO date is shown in the picker's summary cells. Defaults to `DD/MM/YYYY`. Display only. */
  formatDay?: (iso: string) => string;
  /** Extra classes on the wrapper, for layout (width, grid placement). */
  className?: string;
  /** Id for the trigger button, so a form can move focus to it (e.g. the first invalid field). */
  id?: string;
}

interface SingleDateFieldProps extends DateFieldBase {
  mode: 'single';
  /** The chosen date, ISO `YYYY-MM-DD`, or null for none. */
  value: string | null;
  /** Fired once per pick with the ISO date. The field then closes and focus returns to the trigger. */
  onChange: (iso: string) => void;
  /** Trigger text for a chosen value, e.g. `Day 15`. Defaults to "20 Aug 2026". */
  display?: (iso: string) => string;
}

interface RangeDateFieldProps extends DateFieldBase {
  mode: 'range';
  /** The chosen span, ISO dates inclusive, or null for none. */
  value: DateRange | null;
  /** Fired once the second day is picked (or a preset is chosen). The field then closes. */
  onChange: (range: DateRange) => void;
  /** Trigger text for a chosen value, e.g. `Day 1–15`. Defaults to "Aug 1 – Aug 15, 2026". */
  display?: (range: DateRange) => string;
  /** Optional preset rail. Omitted or empty hides the rail. */
  presets?: RangePreset[];
}

export type DateFieldProps = SingleDateFieldProps | RangeDateFieldProps;

function shortDate(iso: string): string {
  const d = isoToDate(iso);
  return `${d.getDate()} ${MONTH_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

export default function DateField(props: DateFieldProps) {
  const { label, describedBy, invalid, className, formatDay, id } = props;
  const uid = useId();
  const labelId = `${uid}-label`;
  const valueId = `${uid}-value`;
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  useDismiss(rootRef, open, () => setOpen(false), triggerRef);

  const close = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  let text: string | null = null;
  if (props.mode === 'single') {
    if (props.value) text = props.display ? props.display(props.value) : shortDate(props.value);
  } else if (props.value) {
    text = props.display ? props.display(props.value) : formatRange(props.value);
  }
  const placeholder = props.placeholder ?? (props.mode === 'single' ? 'Choose a date' : 'Choose dates');
  const align = props.align ?? 'start';
  const dialogLabel = props.dialogLabel ?? label;

  return (
    <div ref={rootRef} className={`relative min-w-0 ${className ?? ''}`}>
      <span id={labelId} className="block text-caption font-semibold text-text-secondary">{label}</span>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-labelledby={`${labelId} ${valueId}`}
        aria-describedby={describedBy}
        onClick={() => setOpen((o) => !o)}
        className={`mt-1 w-full min-w-0 flex items-center gap-1.5 border rounded-lg px-2.5 py-1.5 text-xs bg-surface-elevated text-left hover:border-border-default transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-bay-leaf-600 ${
          invalid ? 'border-error-400' : 'border-border-default'
        }`}
      >
        <Calendar className="w-3.5 h-3.5 text-text-secondary shrink-0" aria-hidden="true" />
        <span id={valueId} className={`flex-1 min-w-0 truncate tabular-nums ${text ? 'text-text-primary' : 'text-text-secondary'}`}>
          {text ?? placeholder}
        </span>
        <ChevronDown className="w-3 h-3 text-text-secondary shrink-0" aria-hidden="true" />
      </button>
      {open && (props.mode === 'single' ? (
        <WeekCalendarPicker
          selectionMode="single"
          value={props.value}
          onSelectDate={(iso) => { props.onChange(iso); close(); }}
          align={align}
          dialogLabel={dialogLabel}
          formatDay={formatDay}
          autoFocusGrid
        />
      ) : (
        <WeekCalendarPicker
          selectionMode="range"
          value={props.value}
          presets={props.presets ?? []}
          onSelectRange={(r) => { props.onChange(r); close(); }}
          align={align}
          dialogLabel={dialogLabel}
          formatDay={formatDay}
          autoFocusGrid
        />
      ))}
    </div>
  );
}
