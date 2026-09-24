import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';
import { useDismiss } from '../../hooks/useDismiss';

/** One row in the single-select list. */
export type SingleSelectOption = {
  /** Stable identifier handed back through `onChange`. Never shown. */
  value: string;
  /** Visible row text. Also the trigger text once chosen, and what search and typeahead match. */
  label: string;
  /** Optional second line under the label, in secondary text. Rows only; the trigger shows `label`. */
  description?: string;
  /** Shows the row but it can't be chosen (skipped by arrows and typeahead). */
  disabled?: boolean;
};

export type SingleSelectDropdownProps = {
  /** Rows in display order. An empty array shows one `emptyText` row. */
  options: SingleSelectOption[];
  /**
   * Controlled choice: the chosen option's `value`, or `null` for nothing chosen yet.
   * Pass it together with `onChange`. `undefined` makes the dropdown uncontrolled
   * (it keeps its own choice, seeded from `defaultValue`).
   */
  value?: string | null;
  /** Initial choice when uncontrolled. Ignored when `value` is supplied. */
  defaultValue?: string;
  /** Called with the picked value (and its option) each time a row is picked, including the current one. */
  onChange?: (value: string, option: SingleSelectOption) => void;
  /** Trigger text while nothing is chosen. Defaults to "Select an option". */
  placeholder?: string;
  /**
   * Accessible name of the list, and the prefix of the trigger's accessible name
   * ("Status, Pending"). Not rendered visibly: the View renders its own visible label.
   * Defaults to "Options".
   */
  label?: string;
  /**
   * Id (or space-separated ids) of visible label elements. When set, the trigger is named by
   * them plus the chosen text instead of `label`, so a View's existing label or heading stays
   * the name (e.g. "Rest day, Ana Reyes, Sunday").
   */
  labelledBy?: string;
  /** Id for the trigger button, so a `<label htmlFor>` or a form can target it. */
  id?: string;
  /** Trigger density. `sm` (default): 32px trigger, 12px text. `md`: 40px trigger, 14px text. Rows are 32px min in both. */
  size?: 'sm' | 'md';
  /** Disables the trigger; the list can't open. */
  disabled?: boolean;
  /** `true` shows the error border and sets `aria-invalid`. The error text must be named by `aria-describedby`. */
  invalid?: boolean;
  /** Space-separated ids of hint or error text for the trigger. */
  'aria-describedby'?: string;
  /**
   * Adds a filter field at the top of the popup. It takes focus on open; typing filters labels
   * case-insensitively; arrows move through the matches; Enter picks. Off by default.
   */
  searchable?: boolean;
  /** Text of the single row shown when `options` is empty. Defaults to "No options". */
  emptyText?: string;
  /** Tailwind max-height class for the scrollable list. Defaults to `max-h-60` (240px). */
  listMaxHeight?: string;
  /**
   * Extra classes on the outer wrapper (width, margins). The wrapper is `w-full max-w-sm` by
   * default (`inline-block max-w-full` with `width="auto"`); an unprefixed `w-*` or `max-w-*` here replaces that default.
   */
  className?: string;
  /**
   * `full` (default): the trigger fills its wrapper (`w-full max-w-sm`). `auto`: the trigger
   * sizes to its text, for toolbars ("Group by: Project"); pair with `popupAlign` `left` or `right`.
   */
  width?: 'full' | 'auto';
  /** Optional visible text before the chosen label inside the trigger, e.g. "Group by:". Not part of the value. */
  prefix?: string;
  /**
   * How the popup lines up with the trigger. `stretch` (default): the trigger's width.
   * `left` / `right`: anchored to that edge and sized by `popupWidth`; flips to the other edge
   * if it would leave the viewport. Layout only.
   */
  popupAlign?: 'stretch' | 'left' | 'right';
  /** Tailwind width classes for the popup when `popupAlign` is `left` or `right`. Defaults to `w-56`. */
  popupWidth?: string;
};

const TYPEAHEAD_RESET_MS = 500;

/**
 * Default wrapper sizing, dropping any default the caller's `className` overrides (an
 * unprefixed `w-*` or `max-w-*`), so two conflicting utilities never depend on CSS order.
 */
function wrapperSize(width: 'full' | 'auto', className: string): string {
  const hasW = /(^|\s)w-/.test(className);
  const hasMaxW = /(^|\s)max-w-/.test(className);
  if (width === 'auto') return `inline-block ${hasMaxW ? '' : 'max-w-full'}`;
  return `${hasW ? '' : 'w-full'} ${hasMaxW ? '' : 'max-w-sm'}`;
}

/**
 * Shared single-select dropdown (DS2): the MultiSelectDropdown trigger and rows, no checkboxes.
 * The chosen row is tinted bay-leaf-50 with a check on the right. Picking a row closes the
 * popup and returns focus to the trigger.
 *
 * Listbox keyboard pattern. On the trigger: ArrowDown / ArrowUp / Enter / Space open it.
 * In the list: ArrowUp / ArrowDown move, Home / End jump, typing a letter jumps to the next
 * label starting with it (typeahead), Enter or Space picks. With `searchable`, focus sits in
 * the search field: typing filters, arrows move, Enter picks, Home / End move the caret.
 * Escape closes the popup, returns focus to the trigger and stops there, so a parent modal
 * (`useModalFocus`) stays open. Tab out or an outside click (`useDismiss`) closes without picking.
 *
 * The choice is controlled (`value` + `onChange`) or uncontrolled (`defaultValue`).
 * Open/closed, the highlighted row and the search query are view-local UI state only.
 */
export default function SingleSelectDropdown({
  options,
  value,
  defaultValue,
  onChange,
  placeholder = 'Select an option',
  label = 'Options',
  labelledBy,
  id,
  size = 'sm',
  disabled = false,
  invalid = false,
  'aria-describedby': describedBy,
  searchable = false,
  emptyText = 'No options',
  listMaxHeight = 'max-h-60',
  className = '',
  popupAlign = 'stretch',
  popupWidth = 'w-56',
  width = 'full',
  prefix,
}: SingleSelectDropdownProps) {
  const [open, setOpen] = useState(false);
  const [internal, setInternal] = useState<string | null>(defaultValue ?? null);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const typeahead = useRef({ text: '', at: 0 });
  const baseId = useId();
  const listId = `${baseId}-list`;
  const valueId = `${baseId}-value`;
  const optionId = (i: number) => `${baseId}-opt-${i}`;

  const chosen = value === undefined ? internal : value;
  const chosenOption = options.find((o) => o.value === chosen);
  const text = size === 'md' ? 'text-(length:--font-size-body-sm)' : 'text-xs';

  const q = query.trim().toLowerCase();
  const shown = useMemo(
    () => (q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options),
    [options, q],
  );

  const close = (returnFocus: boolean) => {
    setOpen(false);
    setQuery('');
    setActive(-1);
    if (returnFocus) triggerRef.current?.focus();
  };

  useDismiss(rootRef, open, () => close(false), triggerRef);

  const pick = (opt: SingleSelectOption) => {
    if (opt.disabled) return;
    if (value === undefined) setInternal(opt.value);
    onChange?.(opt.value, opt);
    close(true);
  };

  const enabledIndexes = shown.flatMap((o, i) => (o.disabled ? [] : [i]));
  const first = enabledIndexes[0] ?? -1;
  const last = enabledIndexes[enabledIndexes.length - 1] ?? -1;
  const step = (from: number, dir: 1 | -1) => {
    if (enabledIndexes.length === 0) return -1;
    if (from < 0) return dir === 1 ? first : last;
    const next = dir === 1 ? enabledIndexes.find((i) => i > from) : [...enabledIndexes].reverse().find((i) => i < from);
    return next ?? from;
  };

  // On open: highlight the chosen row (else the first), and focus the search field or the list.
  useEffect(() => {
    if (!open) return;
    const i = shown.findIndex((o) => o.value === chosen && !o.disabled);
    setActive(i >= 0 ? i : first);
    (searchable ? searchRef.current : listRef.current)?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Filtering resets the highlight to the first match.
  useEffect(() => {
    if (open && searchable) setActive(first);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  // Keep the highlighted row in view.
  useEffect(() => {
    if (!open || active < 0) return;
    document.getElementById(optionId(active))?.scrollIntoView({ block: 'nearest' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, open]);

  // A left/right-anchored popup that would leave the viewport opens from the other edge instead.
  const [flipped, setFlipped] = useState(false);
  useLayoutEffect(() => {
    if (!open) return setFlipped(false);
    if (popupAlign === 'stretch' || !panelRef.current) return;
    const r = panelRef.current.getBoundingClientRect();
    if (popupAlign === 'right' ? r.left < 0 : r.right > document.documentElement.clientWidth) setFlipped(true);
  }, [open, popupAlign]);
  const anchor = popupAlign === 'stretch' ? 'stretch' : flipped ? (popupAlign === 'left' ? 'right' : 'left') : popupAlign;

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

  const onTriggerKeyDown = (e: React.KeyboardEvent) => {
    if (open || disabled) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      setOpen(true);
    }
  };

  const runTypeahead = (ch: string) => {
    const now = Date.now();
    const t = typeahead.current;
    t.text = now - t.at > TYPEAHEAD_RESET_MS ? ch : t.text + ch;
    t.at = now;
    const needle = t.text.toLowerCase();
    // A repeated single letter cycles through matches; a longer prefix searches from the current row.
    const cycling = needle.length > 1 && needle.split('').every((c) => c === needle[0]);
    const prefix = cycling ? needle[0] : needle;
    const start = cycling || needle.length === 1 ? active + 1 : Math.max(active, 0);
    const order = [...shown.keys()].map((k) => (k + start) % Math.max(shown.length, 1));
    const hit = order.find((i) => !shown[i].disabled && shown[i].label.toLowerCase().startsWith(prefix));
    if (hit !== undefined) setActive(hit);
  };

  const onListKeyDown = (e: React.KeyboardEvent) => {
    const onSearch = e.target === searchRef.current;
    switch (e.key) {
      case 'ArrowDown':
        setActive((a) => step(a, 1));
        break;
      case 'ArrowUp':
        setActive((a) => step(a, -1));
        break;
      case 'Home':
        if (onSearch) return;
        setActive(first);
        break;
      case 'End':
        if (onSearch) return;
        setActive(last);
        break;
      case 'Enter':
        // Never submits a surrounding form.
        if (active >= 0 && shown[active]) pick(shown[active]);
        break;
      case ' ':
        if (onSearch) return;
        if (active >= 0 && shown[active]) pick(shown[active]);
        break;
      default:
        if (!onSearch && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          runTypeahead(e.key);
          break;
        }
        return;
    }
    e.preventDefault();
  };

  const focusRing =
    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-bay-leaf-600';
  const shownText = chosenOption?.label ?? placeholder;
  const activeId = open && active >= 0 && shown[active] ? optionId(active) : undefined;

  return (
    <div ref={rootRef} onKeyDown={onRootKeyDown} onBlur={onRootBlur} className={`relative ${wrapperSize(width, className)} ${className}`}>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={labelledBy ? undefined : `${label}, ${chosenOption ? chosenOption.label : 'none selected'}`}
        aria-labelledby={labelledBy ? `${labelledBy} ${valueId}` : undefined}
        aria-describedby={describedBy}
        aria-invalid={invalid || undefined}
        onClick={() => (open ? close(true) : setOpen(true))}
        onKeyDown={onTriggerKeyDown}
        className={`flex ${width === 'auto' ? 'max-w-full' : 'w-full'} items-center justify-between gap-2 ${size === 'md' ? 'h-10' : 'h-8'} px-3 rounded-lg border ${
          invalid ? 'border-error-400' : 'border-border-default'
        } bg-surface-elevated ${text} font-semibold text-left hover:border-border-default transition-colors motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:border-border-default ${focusRing} ${
          chosenOption ? 'text-text-primary' : 'text-text-secondary'
        }`}
      >
        <span className="flex min-w-0 items-center gap-1">
          {prefix && <span aria-hidden="true" className="shrink-0 font-medium text-text-secondary">{prefix}</span>}
          <span id={valueId} className="truncate">
            {shownText}
          </span>
        </span>
        <ChevronDown
          aria-hidden="true"
          className={`w-3.5 h-3.5 shrink-0 text-text-secondary transition-transform duration-150 motion-reduce:transition-none ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {open && (
        <div
          ref={panelRef}
          onKeyDown={onListKeyDown}
          className={`absolute ${
            anchor === 'left' ? `left-0 ${popupWidth}` : anchor === 'right' ? `right-0 ${popupWidth}` : 'left-0 right-0'
          } top-full z-30 mt-1 bg-surface-elevated rounded-xl border border-border-subtle shadow-lg p-1 ${text}`}
        >
          {searchable && (
            <div className="relative mb-1">
              <Search aria-hidden="true" className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-secondary" />
              <input
                ref={searchRef}
                type="text"
                role="combobox"
                value={query}
                autoComplete="off"
                spellCheck={false}
                placeholder="Search"
                aria-label={`Search ${label}`}
                aria-expanded="true"
                aria-controls={listId}
                aria-autocomplete="list"
                aria-activedescendant={activeId}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full min-w-0 h-8 pl-8 pr-2.5 rounded-lg border border-border-default bg-surface-elevated text-text-primary placeholder-text-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-bay-leaf-600"
              />
              <span role="status" className="sr-only">
                {q ? (shown.length === 0 ? 'No matches' : `${shown.length} shown`) : ''}
              </span>
            </div>
          )}

          <ul
            ref={listRef}
            id={listId}
            role="listbox"
            aria-label={label}
            tabIndex={searchable ? -1 : 0}
            aria-activedescendant={searchable ? undefined : activeId}
            className={`${listMaxHeight} overflow-y-auto space-y-0.5 rounded-lg focus:outline-none`}
          >
            {shown.length === 0 && (
              <li role="presentation" className="h-8 px-2 flex items-center text-text-secondary">
                {options.length === 0 ? emptyText : 'No matches'}
              </li>
            )}
            {shown.map((opt, i) => {
              const isChosen = opt.value === chosen;
              const isActive = i === active;
              return (
                <li
                  key={opt.value}
                  id={optionId(i)}
                  role="option"
                  aria-selected={isChosen}
                  aria-disabled={opt.disabled || undefined}
                  onClick={() => pick(opt)}
                  onMouseMove={() => !opt.disabled && active !== i && setActive(i)}
                  className={`flex min-h-8 items-center gap-2 rounded-lg px-2 py-1 transition-colors duration-150 motion-reduce:transition-none ${
                    opt.disabled
                      ? 'cursor-not-allowed text-text-secondary opacity-60'
                      : isChosen
                        ? `cursor-pointer font-medium text-text-primary ${isActive ? 'bg-bay-leaf-100' : 'bg-bay-leaf-50'}`
                        : `cursor-pointer text-text-primary ${isActive ? 'bg-surface-default' : ''}`
                  } ${isActive ? 'outline outline-1 -outline-offset-1 outline-border-default' : ''}`}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{opt.label}</span>
                    {opt.description && (
                      <span className="block truncate font-normal text-text-secondary">{opt.description}</span>
                    )}
                  </span>
                  {isChosen && <Check aria-hidden="true" className="w-3.5 h-3.5 shrink-0 text-bay-leaf-600" />}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
