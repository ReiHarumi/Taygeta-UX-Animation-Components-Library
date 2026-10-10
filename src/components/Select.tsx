// Polaris Select (Timesheet spec L-4). A native <select> in the Input frame, so phones get the OS picker.
import { useId, type ReactNode, type Ref, type SelectHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';
import { COMPACT_LABEL_CLASS, FieldMessages, LABEL_CLASS, TONE_BORDER, describedBy, fieldTone, hasText } from './field/field';

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size' | 'className'> {
  /** Native `<option>` / `<optgroup>` elements. */
  children: ReactNode;
  /**
   * Visible label, linked with `htmlFor`. When omitted the caller must give the select an
   * accessible name with `aria-label` or `aria-labelledby`.
   */
  label?: ReactNode;
  /** Helper text below the field, linked with `aria-describedby`. */
  hint?: ReactNode;
  /** Error message below the field. Any non-empty value gives the error edge and `aria-invalid="true"`. */
  error?: ReactNode;
  /** `true` draws the error edge and `aria-invalid` without a message (the error lives in a `FieldGroup`). */
  invalid?: boolean;
  /** `default`: 40px. `compact`: 40px under 768, 32px with 12px text from 768 (as Input L-1). Defaults to `default`. */
  size?: 'default' | 'compact';
  /** `above` (default): label over the field. `start`: label to the left, the select takes the remaining width. */
  labelPlacement?: 'above' | 'start';
  /** Extra classes on the outer wrapper (width, margins). */
  className?: string;
  /** Ref to the native `<select>`. */
  ref?: Ref<HTMLSelectElement>;
}

/**
 * Native select. `value`, `defaultValue`, `onChange`, `disabled`, `name`, `required` and the
 * rest go to the `<select>`. The OS draws the option list.
 */
export function Select({
  children,
  label,
  hint,
  error,
  invalid,
  size = 'default',
  labelPlacement = 'above',
  className = '',
  ref,
  id,
  disabled,
  'aria-describedby': callerDescribedBy,
  ...rest
}: SelectProps) {
  const auto = useId();
  const selectId = id ?? `${auto}-select`;
  const hintId = `${selectId}-hint`;
  const errorId = `${selectId}-error`;
  const messageTone = fieldTone(error, false);
  const tone = invalid ? 'error' : messageTone;
  const compact = size === 'compact';
  const start = labelPlacement === 'start';
  const labelClass = compact ? COMPACT_LABEL_CLASS : LABEL_CLASS;

  const field = (
    <div className={`relative ${start ? 'min-w-0 flex-1' : 'w-full'}`}>
      <select
        {...rest}
        ref={ref}
        id={selectId}
        disabled={disabled}
        aria-invalid={tone === 'error' ? true : undefined}
        aria-describedby={describedBy(hasText(hint) && hintId, messageTone === 'error' && errorId, callerDescribedBy)}
        className={[
          // appearance-none hides the native arrow (the OS picker still opens); our chevron is drawn over the right padding.
          'block w-full min-w-0 appearance-none rounded-lg border pl-(--space-2) pr-8 text-text-primary',
          compact ? 'h-10 text-base tablet:h-8 tablet:text-xs' : 'h-10 text-(length:--font-size-body)',
          TONE_BORDER[tone],
          disabled ? 'cursor-not-allowed bg-surface-default text-text-tertiary' : 'cursor-pointer bg-surface-elevated',
          'transition-colors duration-(--duration-fast) ease-(--ease-standard) motion-reduce:transition-none',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-focus-ring)',
          tone === 'default' ? 'focus-visible:border-border-strong' : '',
        ].join(' ')}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden="true"
        size={compact ? 14 : 16}
        strokeWidth={1.5}
        className="pointer-events-none absolute right-(--space-2) top-1/2 -translate-y-1/2 text-text-secondary"
      />
    </div>
  );

  const messages = (
    <FieldMessages
      hintId={hintId}
      errorId={errorId}
      hint={hint}
      error={messageTone === 'error' ? error : undefined}
      compact={compact}
    />
  );

  return (
    <div className={`flex min-w-0 flex-col gap-(--space-1) ${className}`}>
      {start ? (
        <div className="flex min-w-0 items-center gap-(--space-2)">
          {hasText(label) && (
            <label htmlFor={selectId} className={`${labelClass} shrink-0`}>
              {label}
            </label>
          )}
          {field}
        </div>
      ) : (
        <>
          {hasText(label) && (
            <label htmlFor={selectId} className={labelClass}>
              {label}
            </label>
          )}
          {field}
        </>
      )}
      {messages}
    </div>
  );
}

export default Select;
