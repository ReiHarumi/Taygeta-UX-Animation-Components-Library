// Polaris FilterChip (design_spec §9 Chip (filter); Time Tracker screen spec §12.1, §13).
// A pill toggle button for narrowing a list by values present in the data, several at once.
import { useLayoutEffect, useRef, useState, type FocusEventHandler, type KeyboardEventHandler, type ReactNode, type Ref } from 'react';
import { Check } from 'lucide-react';

export interface FilterChipProps {
  /** Selected state, rendered as `aria-pressed`. The parent owns it; the chip holds no selection. */
  pressed: boolean;
  /** Called with the next value on click, Space and Enter. */
  onPressedChange: (next: boolean) => void;
  /** Visible text. Truncates with an ellipsis at 128px; the full text stays in the accessible name. */
  label: string;
  /** Trailing tally, formatted by the caller (for example "7:56"). Tabular figures. `undefined`: no tally. */
  count?: string;
  /**
   * Idle leading-slot content, usually the 20px project marker (a smaller dot also fits). When
   * `pressed` the slot shows a 14px check, centred, instead. The slot is 20px square whenever this
   * is set. `undefined`: no slot (unless `stableWidth`, which reserves a 14px slot).
   */
  leading?: ReactNode;
  /**
   * For a chip with no `leading`: reserve the check slot in both states and centre the idle
   * content, so pressing never changes the width (the "All" chip). `undefined`/`false`: width follows content.
   */
  stableWidth?: boolean;
  /** Trailing marker slot (for example a 14px `AlertCircle`); drawn in the chip's text colour. `undefined`: none. */
  trailing?: ReactNode;
  /**
   * Fixed accessible name. `undefined`: `label` plus ", " plus `count`. Must not change with
   * `pressed` (WAI-ARIA APG Button); it may change with data.
   */
  accessibleName?: string;
  /** Hover text. `undefined`: the label, shown only while the label is truncated. */
  title?: string;
  /** Drawn height: `sm` 32px (768 and up), `md` 40px (phones). Defaults to `sm`. */
  size?: 'sm' | 'md';
  /** Roving-focus tab index, set by `ChipGroup`. `undefined`: the button's natural tab stop. */
  tabIndex?: number;
  /** DOM id. `undefined`: none. */
  id?: string;
  /** Key handler, set by `ChipGroup` for roving focus. `undefined`: none. */
  onKeyDown?: KeyboardEventHandler<HTMLButtonElement>;
  /** Focus handler, set by `ChipGroup` to track the active chip. `undefined`: none. */
  onFocus?: FocusEventHandler<HTMLButtonElement>;
  /** Id the group uses to find this chip (`data-chip-id`). `undefined`: not part of a group. */
  chipId?: string;
  /** Ref to the native `<button>`. */
  ref?: Ref<HTMLButtonElement>;
}

/**
 * Slot that holds the leading node or the check (design_spec §9 Chip). 20px square when `leading`
 * is set (fits the 20px project marker), 14px otherwise; the 14px check centres in either.
 */
function Slot({ pressed, leading }: { pressed: boolean; leading?: ReactNode }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center ${leading != null ? 'h-5 w-5' : 'h-3.5 w-3.5'}`}
    >
      {pressed ? <Check size={14} strokeWidth={1.5} /> : leading}
    </span>
  );
}

/**
 * Toggle chip. Renders a native `<button type="button" aria-pressed>`. No disabled state: show
 * only chips that apply. Idle: elevated fill with a default edge. Pressed: bay-leaf-200 fill,
 * bay-leaf-600 edge, bay-leaf-900 text (both themes), with a check. Weight never changes with state.
 */
export function FilterChip({
  pressed,
  onPressedChange,
  label,
  count,
  leading,
  stableWidth,
  trailing,
  accessibleName,
  title,
  size = 'sm',
  tabIndex,
  id,
  onKeyDown,
  onFocus,
  chipId,
  ref,
}: FilterChipProps) {
  const labelRef = useRef<HTMLSpanElement>(null);
  const [truncated, setTruncated] = useState(false);
  useLayoutEffect(() => {
    const el = labelRef.current;
    if (el) setTruncated(el.scrollWidth > el.clientWidth);
  }, [label, size]);

  const hasSlot = leading != null || stableWidth;
  const body = (hidden: boolean, showPressed: boolean) => (
    <span
      aria-hidden={hidden ? true : undefined}
      className={`inline-flex min-w-0 items-center gap-2 ${hidden ? 'invisible col-start-1 row-start-1 pointer-events-none' : 'col-start-1 row-start-1 justify-self-center'}`}
    >
      {hasSlot && <Slot pressed={showPressed} leading={leading} />}
      <span ref={hidden ? undefined : labelRef} className="min-w-0 max-w-32 truncate text-xs font-medium leading-4">
        {label}
      </span>
      {count != null && <span className="shrink-0 text-xs font-semibold leading-4 tabular-nums">{count}</span>}
      {trailing != null && <span className="inline-flex shrink-0 items-center">{trailing}</span>}
    </span>
  );

  return (
    <button
      ref={ref}
      id={id}
      type="button"
      tabIndex={tabIndex}
      data-chip-id={chipId}
      aria-pressed={pressed}
      aria-label={accessibleName ?? (count != null ? `${label}, ${count}` : label)}
      title={title ?? (truncated ? label : undefined)}
      onClick={() => onPressedChange(!pressed)}
      onKeyDown={onKeyDown}
      onFocus={onFocus}
      className={[
        // Pill (Badge radius, UI-14), 12px inline padding, 1px edge, grid so a ghost can fix the width.
        'inline-grid shrink-0 items-center rounded-full border px-3 cursor-pointer select-none',
        size === 'md' ? 'h-10' : 'h-8',
        'transition-colors duration-(--duration-fast) ease-(--ease-standard) motion-reduce:transition-none',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-focus-ring)',
        pressed
          ? 'border-bay-leaf-600 bg-bay-leaf-200 text-bay-leaf-900'
          : 'border-border-default bg-surface-elevated text-text-primary hover:bg-surface-muted',
      ].join(' ')}
    >
      {stableWidth && !leading ? body(true, true) : null}
      {body(false, pressed)}
    </button>
  );
}

export default FilterChip;
