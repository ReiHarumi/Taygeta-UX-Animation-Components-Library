// Polaris ChipGroup (design_spec §9 Chip (filter) Group; Time Tracker screen spec §12.2).
// A labelled group of FilterChips: one scrolling row, or wrapping rows with measured hiding.
// Presentational: the parent owns the selection and the live announcements.
import { useCallback, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { FilterChip } from './FilterChip';

/** One chip in a `ChipGroup`. */
export interface ChipGroupItem {
  /** Stable key, handed back through `onToggle`. Chips are keyed by it, so a focused chip keeps focus when it moves. */
  id: string;
  /** Visible text (truncates at 128px). */
  label: string;
  /** Pre-formatted tally, for example "7:56". `undefined`: none. */
  count?: string;
  /** Idle leading-slot content such as a 12px dot. `undefined`: none (see `stableWidth`). */
  leading?: ReactNode;
  /** Trailing marker, for example a 14px `AlertCircle`. `undefined`: none. */
  trailing?: ReactNode;
  /** Whether the chip is selected. */
  pressed: boolean;
  /** Fixed accessible name (never says "selected"). `undefined`: label plus count. */
  accessibleName?: string;
  /** Reserve the check slot in both states (the "All" chip). `undefined`: width follows content. */
  stableWidth?: boolean;
}

export interface ChipGroupProps {
  /** `aria-label` of the `role="group"` container (for example "Filter by project"). */
  label: string;
  /** Chips in display order. */
  items: ChipGroupItem[];
  /** Called with the id of the chip that was pressed. */
  onToggle: (id: string) => void;
  /** Called when Esc is pressed on any chip; the event stops at the group. `undefined`: Esc is ignored. */
  onEscape?: () => void;
  /** `scroll`: one row that scrolls sideways (phones). `wrap`: wrapping rows, hidden overflow (768 and up). */
  layout: 'scroll' | 'wrap';
  /** Wrap only. Row cap before chips are hidden. Pressed chips are never hidden, so rows can exceed it. Defaults to 2. */
  maxRows?: number;
  /**
   * Wrap only. Rendered last when any chip is hidden, outside the roving set (for example a
   * "+N more" `MultiSelectDropdown`). Receives the ids of the hidden chips. `undefined`: nothing is rendered.
   */
  renderOverflow?: (hiddenIds: string[]) => ReactNode;
  /** Number of leading chips that are never hidden (the "All" chip). Defaults to 1. */
  pinFirst?: number;
  /** More chips than this: the group is one Tab stop with arrow-key roving. At or below: every chip is a Tab stop. Defaults to 6. */
  rovingThreshold?: number;
  /** Chip size: `sm` 32px, `md` 40px. Defaults to `sm`. */
  size?: 'sm' | 'md';
  /** Layout-only classes on the container (margins, width). */
  className?: string;
}

const GAP = 8; // design_spec §9 Chip: chips 8px apart.

/** Greedy line packing, as flex-wrap does: how many rows do these widths take in `width` px. */
function rowsFor(widths: number[], width: number): number {
  if (widths.length === 0) return 0;
  let rows = 1;
  let used = 0;
  for (const w of widths) {
    const need = used === 0 ? w : used + GAP + w;
    if (need > width && used > 0) {
      rows += 1;
      used = w;
    } else {
      used = need;
    }
  }
  return rows;
}

/** Ids of the chips to hide, per the spec: fill in order, then promote pressed chips over the smallest unpressed ones. */
function computeHidden(
  items: ChipGroupItem[],
  widths: number[],
  overflowWidth: number,
  width: number,
  maxRows: number,
  pinFirst: number,
): string[] {
  const all = items.map((_, i) => i);
  if (rowsFor(widths, width) <= maxRows) return [];
  const fits = (idx: number[]) => rowsFor([...idx.map((i) => widths[i]), overflowWidth], width) <= maxRows;
  const pinned = all.slice(0, pinFirst);
  let visible = [...pinned];
  for (let i = pinFirst; i < items.length; i += 1) {
    if (!fits([...visible, i])) break;
    visible.push(i);
  }
  for (let i = pinFirst; i < items.length; i += 1) {
    if (!items[i].pressed || visible.includes(i)) continue;
    const swap = [...visible].reverse().find((v) => v >= pinFirst && !items[v].pressed);
    visible = swap === undefined ? [...visible, i] : visible.filter((v) => v !== swap).concat(i);
    visible.sort((a, b) => a - b);
    // A wider promoted chip can push the set over the cap: drop more unpressed chips until it fits.
    while (!fits(visible)) {
      const drop = [...visible].reverse().find((v) => v >= pinFirst && !items[v].pressed);
      if (drop === undefined) break;
      visible = visible.filter((v) => v !== drop);
    }
  }
  return all.filter((i) => !visible.includes(i)).map((i) => items[i].id);
}

/**
 * Chip group. `role="group"` labelled by `label`; items are independent toggle buttons (no
 * listbox or radiogroup roles). Wrap layout is measured from rendered widths and recomputed on
 * resize and when items change, with no animation. The group never announces.
 */
export function ChipGroup({
  label,
  items,
  onToggle,
  onEscape,
  layout,
  maxRows = 2,
  renderOverflow,
  pinFirst = 1,
  rovingThreshold = 6,
  size = 'sm',
  className = '',
}: ChipGroupProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [hidden, setHidden] = useState<string[]>([]);
  const [activeId, setActiveId] = useState<string | undefined>(undefined);
  const wrap = layout === 'wrap';

  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!el || !wrap) return;
    // Content width: the container's padding is not available to chips.
    const measure = () => {
      const cs = getComputedStyle(el);
      setWidth(el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [wrap]);

  // Everything that changes a chip's width or order, so the hidden set is recomputed.
  const signature = items.map((i) => `${i.id}|${i.label}|${i.count ?? ''}|${i.pressed ? 1 : 0}|${i.trailing ? 1 : 0}`).join('~');
  useLayoutEffect(() => {
    if (!wrap) {
      setHidden((h) => (h.length ? [] : h));
      return;
    }
    const m = measureRef.current;
    if (!m || width === 0) return;
    const widths = items.map((it) => m.querySelector<HTMLElement>(`[data-chip-id="${CSS.escape(it.id)}"]`)?.offsetWidth ?? 0);
    const overflowWidth = m.querySelector<HTMLElement>('[data-measure-overflow]')?.offsetWidth ?? 0;
    const next = computeHidden(items, widths, overflowWidth, width, maxRows, pinFirst);
    setHidden((prev) => (prev.length === next.length && prev.every((v, i) => v === next[i]) ? prev : next));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wrap, width, signature, maxRows, pinFirst, size]);

  const shown = useMemo(() => items.filter((i) => !hidden.includes(i.id)), [items, hidden]);
  const roving = shown.length > rovingThreshold;
  const landingId = useMemo(() => {
    if (activeId && shown.some((i) => i.id === activeId)) return activeId;
    return (shown.find((i) => i.pressed) ?? shown[0])?.id;
  }, [activeId, shown]);

  const chips = useCallback(
    () => Array.from(rootRef.current?.querySelectorAll<HTMLButtonElement>('button[data-chip-id]') ?? []).filter(
        (b) => !b.closest('[data-measure]'),
      ),
    [],
  );

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Escape') {
      if (!onEscape) return;
      event.preventDefault();
      event.stopPropagation();
      onEscape();
      return;
    }
    if (!roving) return;
    const list = chips();
    const at = list.indexOf(event.currentTarget);
    let to = -1;
    if (event.key === 'ArrowRight') to = Math.min(at + 1, list.length - 1);
    else if (event.key === 'ArrowLeft') to = Math.max(at - 1, 0);
    else if (event.key === 'Home') to = 0;
    else if (event.key === 'End') to = list.length - 1;
    if (to < 0) return;
    event.preventDefault();
    list[to]?.focus();
  };

  const chipFor = (item: ChipGroupItem, measuring: boolean) => (
    <FilterChip
      key={item.id}
      chipId={item.id}
      pressed={item.pressed}
      onPressedChange={() => onToggle(item.id)}
      label={item.label}
      count={item.count}
      leading={item.leading}
      trailing={item.trailing}
      stableWidth={item.stableWidth}
      accessibleName={item.accessibleName}
      size={size}
      tabIndex={measuring ? -1 : roving ? (item.id === landingId ? 0 : -1) : undefined}
      onKeyDown={measuring ? undefined : onKeyDown}
      onFocus={
        measuring
          ? undefined
          : (event) => {
              setActiveId(item.id);
              if (!wrap) event.currentTarget.scrollIntoView({ block: 'nearest', inline: 'nearest' });
            }
      }
    />
  );

  return (
    <div
      ref={rootRef}
      role="group"
      aria-label={label}
      // Padding keeps a focus ring (2px + 2px offset) unclipped; the negative margin keeps the first chip on the page edge.
      className={`relative -m-1 flex gap-2 p-1 ${
        wrap ? 'flex-wrap' : 'snap-x snap-proximity flex-nowrap [&>*]:snap-start overflow-x-auto overflow-y-hidden'
      } ${className}`}
    >
      {shown.map((item) => chipFor(item, false))}
      {wrap && hidden.length > 0 && renderOverflow?.(hidden)}
      {wrap && (
        // Off-screen copy of every chip, measured to decide what fits. Inert, invisible and clipped
        // to zero height so it never adds page scroll.
        <div aria-hidden="true" className="pointer-events-none invisible absolute left-0 top-0 h-0 w-full overflow-hidden">
          <div ref={measureRef} {...({ inert: true } as object)} data-measure className="flex w-max gap-2">
            {items.map((item) => chipFor(item, true))}
            {renderOverflow && <div data-measure-overflow>{renderOverflow(items.slice(pinFirst).map((i) => i.id))}</div>}
          </div>
        </div>
      )}
    </div>
  );
}

export default ChipGroup;
