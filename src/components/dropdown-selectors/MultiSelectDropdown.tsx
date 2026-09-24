import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';
import Checkbox from '../Checkbox';
import { useDismiss } from '../../hooks/useDismiss';

/** One checkbox row in the dropdown. */
export type MultiSelectOption = {
  /** Stable identifier handed back through `onChange`. Never shown. */
  value: string;
  /** Visible row text, also used for the trigger summary, chips and search matching. */
  label: string;
};

export type MultiSelectDropdownProps = {
  /** Items rendered as checkbox rows, in display order. An empty array shows a "No options" row. */
  options: MultiSelectOption[];
  /**
   * Controlled selection: the checked option values. Pass it together with `onChange`.
   * `undefined` makes the dropdown uncontrolled (it keeps its own selection, seeded from `defaultValue`).
   */
  value?: string[];
  /** Initial selection when uncontrolled. Ignored when `value` is supplied. Defaults to `[]`. */
  defaultValue?: string[];
  /**
   * Called with the full next selection after every change (a row toggle, a chip removal,
   * Select all or Clear). Newly checked values are appended after the existing ones.
   */
  onChange?: (selected: string[]) => void;
  /** Trigger text when nothing is selected. Defaults to "Select options". */
  placeholder?: string;
  /**
   * Accessible name of the popup and the prefix of the trigger's accessible name
   * ("Team, 2 selected"). Not rendered visibly. Defaults to "Options".
   */
  label?: string;
  /** Tailwind max-height class for the scrollable option list. Defaults to `max-h-60` (240px). */
  listMaxHeight?: string;
  /** Extra classes on the outer wrapper (width, margins). The wrapper is `w-full max-w-sm` by default. */
  className?: string;
  /**
   * Trigger and row density. `sm` (default): 32px trigger, 12px text, matching the Reports
   * toolbar. `md`: 40px trigger, 14px text. Rows are 32px in both.
   */
  size?: 'sm' | 'md';
  /**
   * Adds a filter field at the top of the popup. It takes focus on open, matches labels
   * case-insensitively, and shows "No matches" when nothing matches. The query clears on close.
   * Off by default.
   */
  searchable?: boolean;
  /**
   * Adds "Select all" and "Clear" above the list. Both act on the options currently shown
   * (after the search filter), leaving hidden selections untouched. Off by default.
   */
  bulkActions?: boolean;
  /**
   * What the trigger shows once something is selected.
   * `summary` (default): the one selected label, or "N selected".
   * `chips`: each selected label as a small removable chip; chips that don't fit collapse
   * into a "+N" count. Each chip's remove button is labelled "Remove {label}".
   */
  triggerDisplay?: 'summary' | 'chips';
  /**
   * Optional slot rendered under the list, inside the popup (for example an "Add tag" field).
   * Arrow keys typed inside it are left alone; Escape still closes the popup.
   */
  footer?: ReactNode;
  /** Optional slot rendered above the list, inside the popup (for example a "Sample tags (demo)" note). */
  header?: ReactNode;
  /** Text of the single row shown when `options` is empty. Defaults to "No options". */
  emptyText?: string;
  /** Accessible name of the popup when it should differ from `label` (e.g. "Filter by Team"). Defaults to `label`. */
  popupLabel?: string;
  /**
   * How the popup lines up with the trigger. `stretch` (default): exactly the trigger's width.
   * `left` / `right`: anchored to that edge of the trigger and sized by `popupWidth`, so a
   * narrow trigger can open a wider popup. If that would leave the viewport, it opens from
   * the other edge instead. Layout only.
   */
  popupAlign?: 'stretch' | 'left' | 'right';
  /** Tailwind width classes for the popup when `popupAlign` is `left` or `right`. Defaults to `w-56`. */
  popupWidth?: string;
};

const OPTION = 'input[data-ms-option]';

/**
 * Shared multi-select dropdown: a trigger that opens a non-modal popup of native checkboxes.
 *
 * Adapted from the owner's source component (MS1): tokens only, bay-leaf checks, dense rows.
 * Outside click via the shared `useDismiss`. Escape closes the popup, returns focus to the
 * trigger and stops there, so a parent modal (`useModalFocus`) stays open. Tab out closes it.
 * ArrowUp / ArrowDown move between rows (and the search field), Home / End jump, Space toggles.
 *
 * Selection is either controlled (`value` + `onChange`) or uncontrolled (`defaultValue`).
 * Open/closed, the search query and chip overflow are view-local UI state only.
 */
export default function MultiSelectDropdown({
  options,
  value,
  defaultValue = [],
  onChange,
  placeholder = 'Select options',
  label = 'Options',
  listMaxHeight = 'max-h-60',
  className = '',
  size = 'sm',
  searchable = false,
  bulkActions = false,
  triggerDisplay = 'summary',
  footer,
  header,
  emptyText = 'No options',
  popupLabel,
  popupAlign = 'stretch',
  popupWidth = 'w-56',
}: MultiSelectDropdownProps) {
  const [open, setOpen] = useState(false);
  const [internal, setInternal] = useState<string[]>(defaultValue);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const panelId = useId();
  const listId = useId();

  const selected = value ?? internal;
  const chips = triggerDisplay === 'chips';
  const text = size === 'md' ? 'text-(length:--font-size-body-sm)' : 'text-xs';

  const commit = (next: string[]) => {
    if (value === undefined) setInternal(next);
    onChange?.(next);
  };
  const toggle = (v: string) =>
    commit(selected.includes(v) ? selected.filter((s) => s !== v) : [...selected, v]);

  const close = (returnFocus: boolean) => {
    setOpen(false);
    setQuery('');
    if (returnFocus) triggerRef.current?.focus();
  };

  useDismiss(rootRef, open, () => close(false), triggerRef);

  const q = query.trim().toLowerCase();
  const shown = useMemo(
    () => (q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options),
    [options, q],
  );

  // On open: the search field if there is one, else the first checked row, else the first row.
  useEffect(() => {
    if (!open) return;
    if (searchable) {
      searchRef.current?.focus();
      return;
    }
    const rows = Array.from(panelRef.current?.querySelectorAll<HTMLInputElement>(OPTION) ?? []);
    (rows.find((r) => r.checked) ?? rows[0])?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // A left/right-anchored popup that would leave the viewport opens from the other edge instead.
  const [flipped, setFlipped] = useState(false);
  useLayoutEffect(() => {
    if (!open) return setFlipped(false);
    if (popupAlign === 'stretch' || !panelRef.current) return;
    const r = panelRef.current.getBoundingClientRect();
    if (popupAlign === 'right' ? r.left < 0 : r.right > document.documentElement.clientWidth) setFlipped(true);
  }, [open, popupAlign]);
  const anchor = popupAlign === 'stretch' ? 'stretch' : flipped ? (popupAlign === 'left' ? 'right' : 'left') : popupAlign;

  const labelOf = (v: string) => options.find((o) => o.value === v)?.label;
  const selectedLabels = selected.map(labelOf).filter((l): l is string => l !== undefined);

  const summary =
    selected.length === 0
      ? placeholder
      : selected.length === 1
        ? labelOf(selected[0]) ?? placeholder
        : `${selected.length} selected`;
  const triggerName = `${label}, ${selected.length === 0 ? 'none selected' : summary}`;

  const onRootKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'Escape' || !open) return;
    // Owns this Escape: close the popup only. Stopping the native event keeps it from
    // reaching document-level handlers, so a parent dialog or menu stays open.
    e.preventDefault();
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();
    close(true);
  };

  const onRootBlur = (e: React.FocusEvent) => {
    const next = e.relatedTarget as Node | null;
    // `null` is a click on non-focusable space; outside clicks are `useDismiss`'s job.
    if (open && next && !rootRef.current?.contains(next)) close(false);
  };

  const onPanelKeyDown = (e: React.KeyboardEvent) => {
    const target = e.target as HTMLElement;
    const onSearch = target === searchRef.current;
    if (!onSearch && !target.matches(OPTION)) return;
    const rows = Array.from(panelRef.current?.querySelectorAll<HTMLInputElement>(OPTION) ?? []);
    const i = rows.indexOf(target as HTMLInputElement);
    let next: HTMLElement | null | undefined;
    switch (e.key) {
      case 'ArrowDown':
        next = onSearch ? rows[0] : rows[(i + 1) % rows.length];
        break;
      case 'ArrowUp':
        if (onSearch) return;
        next = i === 0 && searchable ? searchRef.current : rows[(i - 1 + rows.length) % rows.length];
        break;
      case 'Home':
        if (onSearch) return;
        next = rows[0];
        break;
      case 'End':
        if (onSearch) return;
        next = rows[rows.length - 1];
        break;
      case 'Enter':
        // Enter in the search field toggles the only match; never submits a surrounding form.
        if (onSearch) {
          e.preventDefault();
          if (shown.length === 1) toggle(shown[0].value);
        }
        return;
      default:
        return;
    }
    e.preventDefault();
    next?.focus();
  };

  const shownValues = shown.map((o) => o.value);
  const canSelectAll = shownValues.some((v) => !selected.includes(v));
  const canClear = shownValues.some((v) => selected.includes(v));
  const filtered = q.length > 0;

  const removeChip = (v: string) => commit(selected.filter((s) => s !== v));

  const focusRing =
    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-bay-leaf-600';
  const chevron = (
    <ChevronDown
      aria-hidden="true"
      className={`w-3.5 h-3.5 shrink-0 text-text-secondary transition-transform duration-150 motion-reduce:transition-none ${
        open ? 'rotate-180' : ''
      }`}
    />
  );

  return (
    <div
      ref={rootRef}
      onKeyDown={onRootKeyDown}
      onBlur={onRootBlur}
      className={`relative w-full max-w-sm ${className}`}
    >
      {chips ? (
        <ChipsTrigger
          triggerRef={triggerRef}
          open={open}
          panelId={panelId}
          triggerName={triggerName}
          placeholder={placeholder}
          selected={selected}
          labels={selectedLabels}
          labelOf={labelOf}
          size={size}
          chevron={chevron}
          onToggleOpen={() => (open ? close(true) : setOpen(true))}
          onRemove={removeChip}
        />
      ) : (
        <button
          ref={triggerRef}
          type="button"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={open ? panelId : undefined}
          aria-label={triggerName}
          onClick={() => (open ? close(true) : setOpen(true))}
          className={`flex w-full items-center justify-between gap-2 ${size === 'md' ? 'h-10' : 'h-8'} px-3 rounded-lg border border-border-default bg-surface-elevated ${text} font-semibold text-left hover:border-border-default transition-colors motion-reduce:transition-none ${focusRing} ${
            selected.length ? 'text-text-primary' : 'text-text-secondary'
          }`}
        >
          <span className="truncate">{summary}</span>
          {chevron}
        </button>
      )}

      {open && (
        <div
          ref={panelRef}
          id={panelId}
          role="dialog"
          aria-label={popupLabel ?? label}
          onKeyDown={onPanelKeyDown}
          className={`absolute ${
            anchor === 'left' ? `left-0 ${popupWidth}` : anchor === 'right' ? `right-0 ${popupWidth}` : 'left-0 right-0'
          } top-full z-30 mt-1 bg-surface-elevated rounded-xl border border-border-subtle shadow-lg p-1 ${text}`}
        >
          {header}

          {searchable && (
            <div className="relative mb-1">
              <Search aria-hidden="true" className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-secondary" />
              <input
                ref={searchRef}
                type="text"
                value={query}
                autoComplete="off"
                spellCheck={false}
                placeholder="Search"
                aria-label={`Search ${label}`}
                aria-controls={listId}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full min-w-0 h-8 pl-8 pr-2.5 rounded-lg border border-border-default bg-surface-elevated text-text-primary placeholder-text-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-bay-leaf-600"
              />
              <span role="status" className="sr-only">
                {filtered ? (shown.length === 0 ? 'No matches' : `${shown.length} shown`) : ''}
              </span>
            </div>
          )}

          {bulkActions && (
            <div className="flex items-center justify-between gap-2 px-1 mb-1">
              <button
                type="button"
                aria-disabled={!canSelectAll || undefined}
                aria-label={filtered ? `Select all ${shown.length} shown` : undefined}
                onClick={() => canSelectAll && commit([...selected, ...shownValues.filter((v) => !selected.includes(v))])}
                className={`h-7 px-1.5 rounded-lg font-semibold text-bay-leaf-600 hover:bg-bay-leaf-50 aria-disabled:text-text-secondary aria-disabled:opacity-60 aria-disabled:hover:bg-transparent aria-disabled:cursor-not-allowed ${focusRing}`}
              >
                Select all
              </button>
              <button
                type="button"
                aria-disabled={!canClear || undefined}
                aria-label={filtered ? `Clear ${shown.length} shown` : undefined}
                onClick={() => canClear && commit(selected.filter((v) => !shownValues.includes(v)))}
                className={`h-7 px-1.5 rounded-lg font-semibold text-text-secondary hover:bg-surface-default hover:text-text-primary aria-disabled:opacity-60 aria-disabled:hover:bg-transparent aria-disabled:hover:text-text-secondary aria-disabled:cursor-not-allowed ${focusRing}`}
              >
                Clear
              </button>
            </div>
          )}

          <ul id={listId} aria-label={label} className={`${listMaxHeight} overflow-y-auto space-y-0.5`}>
            {shown.length === 0 && (
              <li className="h-8 px-2 flex items-center text-text-secondary">
                {options.length === 0 ? emptyText : 'No matches'}
              </li>
            )}
            {shown.map((opt) => {
              const checked = selected.includes(opt.value);
              return (
                <li key={opt.value}>
                  <label
                    className={`flex h-8 cursor-pointer items-center gap-2 rounded-lg px-2 text-text-primary transition-colors duration-150 motion-reduce:transition-none ${
                      checked ? 'bg-bay-leaf-50 font-medium hover:bg-bay-leaf-100' : 'hover:bg-surface-default'
                    }`}
                  >
                    {/* MS5: the shared drawn checkbox, bare inside this row's own label. */}
                    <Checkbox data-ms-option="" checked={checked} onChange={() => toggle(opt.value)} />
                    <span className="truncate">{opt.label}</span>
                  </label>
                </li>
              );
            })}
          </ul>

          {footer && <div className="mt-1 pt-1 border-t border-border-subtle">{footer}</div>}
        </div>
      )}
    </div>
  );
}

interface ChipsTriggerProps {
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  open: boolean;
  panelId: string;
  triggerName: string;
  placeholder: string;
  selected: string[];
  labels: string[];
  labelOf: (v: string) => string | undefined;
  size: 'sm' | 'md';
  chevron: ReactNode;
  onToggleOpen: () => void;
  onRemove: (value: string) => void;
}

/**
 * The `chips` trigger. A button can't hold buttons, so the bordered shell is a plain box:
 * the chips (each with its own remove button) sit beside the real toggle button, and a
 * click on empty shell space toggles too. Chip overflow is measured against a hidden row.
 */
function ChipsTrigger({
  triggerRef,
  open,
  panelId,
  triggerName,
  placeholder,
  selected,
  labels,
  labelOf,
  size,
  chevron,
  onToggleOpen,
  onRemove,
}: ChipsTriggerProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState(labels.length);
  const key = labels.join('\u0000');
  const known = selected.filter((v) => labelOf(v) !== undefined);
  // After a chip is removed, keep keyboard users in place: the chip now at that index, else the trigger.
  const pendingFocus = useRef<number | null>(null);
  useEffect(() => {
    if (pendingFocus.current === null) return;
    const buttons = boxRef.current?.querySelectorAll<HTMLElement>('[data-chip-remove]');
    const target = buttons?.length ? buttons[Math.min(pendingFocus.current, buttons.length - 1)] : null;
    pendingFocus.current = null;
    (target ?? triggerRef.current)?.focus();
  }, [key, triggerRef]);

  useLayoutEffect(() => {
    const box = boxRef.current;
    const m = measureRef.current;
    if (!box || !m) return;
    const compute = () => {
      const widths = Array.from(m.querySelectorAll<HTMLElement>('[data-chip]')).map((c) => c.getBoundingClientRect().width);
      const plus = m.querySelector<HTMLElement>('[data-plus]')?.getBoundingClientRect().width ?? 0;
      const gap = parseFloat(getComputedStyle(m).columnGap) || 0;
      const avail = box.clientWidth;
      const total = widths.reduce((s, w, i) => s + w + (i ? gap : 0), 0);
      if (total <= avail) return setFit(widths.length);
      let used = plus;
      let n = 0;
      for (const w of widths) {
        if (used + gap + w > avail) break;
        used += gap + w;
        n += 1;
      }
      setFit(n);
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(box);
    return () => ro.disconnect();
  }, [key]);

  const text = size === 'md' ? 'text-(length:--font-size-body-sm)' : 'text-xs';
  const chip = 'inline-flex h-6 max-w-32 items-center rounded-md bg-bay-leaf-50 pl-2 text-bay-leaf-700 font-medium';
  // Always show at least one chip: in a very narrow trigger it shrinks and truncates beside "+N".
  const visible = labels.length ? Math.max(fit, 1) : 0;
  const hidden = labels.length - visible;

  return (
    <div
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('[data-chip-remove], button')) return;
        onToggleOpen();
      }}
      className={`flex w-full cursor-pointer items-center gap-1 ${size === 'md' ? 'h-10' : 'h-8'} pl-1 pr-3 rounded-lg border border-border-default bg-surface-elevated ${text} hover:border-border-default transition-colors motion-reduce:transition-none has-[[data-ms-trigger]:focus-visible]:outline has-[[data-ms-trigger]:focus-visible]:outline-2 has-[[data-ms-trigger]:focus-visible]:outline-offset-1 has-[[data-ms-trigger]:focus-visible]:outline-bay-leaf-600`}
    >
      {labels.length > 0 && (
        <div ref={boxRef} className="relative flex min-w-0 flex-1 items-center gap-1 overflow-hidden">
          {known.slice(0, visible).map((v, i) => (
            <span key={v} className={`${chip} ${fit === 0 ? 'min-w-0 shrink' : 'shrink-0'}`}>
              <span className="truncate">{labelOf(v)}</span>
              <button
                type="button"
                data-chip-remove=""
                aria-label={`Remove ${labelOf(v)}`}
                onClick={() => { pendingFocus.current = i; onRemove(v); }}
                className="ml-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-bay-leaf-700 hover:bg-bay-leaf-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-bay-leaf-600"
              >
                <X aria-hidden="true" className="h-3 w-3" />
              </button>
            </span>
          ))}
          {hidden > 0 && (
            <span data-plus-visible="" className="inline-flex h-6 shrink-0 items-center rounded-md bg-neutral-100 px-1.5 font-semibold text-text-secondary tabular-nums">
              +{hidden}
              <span className="sr-only"> more selected</span>
            </span>
          )}
          {/* Hidden measuring row: every chip at full size, plus a "+N" badge. */}
          <div aria-hidden="true" className="invisible pointer-events-none absolute left-0 top-0 h-0 w-0 overflow-hidden">
            <div ref={measureRef} className="flex w-max items-center gap-1">
              {labels.map((l, i) => (
                <span key={i} data-chip="" className={`${chip} shrink-0`}>
                  <span className="truncate">{l}</span>
                  <span className="ml-0.5 h-6 w-6 shrink-0" />
                </span>
              ))}
              <span data-plus="" className="inline-flex h-6 items-center px-1.5 font-semibold tabular-nums">
                +{labels.length}
              </span>
            </div>
          </div>
        </div>
      )}
      <button
        ref={triggerRef}
        type="button"
        data-ms-trigger=""
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-label={labels.length ? `${triggerName}: ${labels.join(', ')}` : triggerName}
        onClick={onToggleOpen}
        className={`flex h-full items-center gap-2 font-semibold text-text-secondary focus:outline-none ${
          labels.length ? 'shrink-0 pl-1' : 'min-w-0 flex-1 justify-between pl-2 text-left'
        }`}
      >
        {labels.length === 0 && <span className="truncate">{placeholder}</span>}
        {chevron}
      </button>
    </div>
  );
}
