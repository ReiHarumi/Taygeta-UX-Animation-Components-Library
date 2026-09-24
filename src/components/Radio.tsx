// Polaris Radio and RadioGroup (design_spec §9 Forms > Radio: Single, Inline, Group; always
// exclusive within a group). Native radios drive a drawn dot, so exclusivity, Tab order and
// arrow-key movement inside the group stay native (the browser moves and selects on arrows).
import { useId, type ChangeEvent, type InputHTMLAttributes, type ReactNode } from 'react';
import { FieldMessages, LABEL_CLASS, describedBy, hasText } from './field/field';

type NativeRadioProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type' | 'checked' | 'defaultChecked' | 'onChange' | 'size' | 'children' | 'className' | 'value'
>;

// One label line tall (Body Small, line-height 1.5), so the dot centres on the first line.
const LINE_BOX = 'h-[1lh] text-(length:--font-size-body-sm) leading-(--line-height-normal)';

export interface RadioProps extends NativeRadioProps {
  /** The value this radio stands for. Reported by `onChange` and posted with a form. */
  value: string;
  /** Whether this radio is the selected one. Always controlled. */
  checked: boolean;
  /** Fired with this radio's `value` when the user selects it (click, label click, arrow keys). */
  onChange: (value: string, event: ChangeEvent<HTMLInputElement>) => void;
  /**
   * Visible label beside the dot, inside one `<label>` so a click on it selects. With no label the
   * dot renders bare and the caller owns the accessible name (`aria-label`).
   */
  label?: ReactNode;
  /** Secondary line under the label, in text-secondary. */
  description?: ReactNode;
  /** Extra classes on the outer element. */
  className?: string;
}

/**
 * One radio. Use inside `RadioGroup`, or give several the same `name` yourself. Every other prop
 * (`name`, `id`, `disabled`, `aria-*`) is passed to the native input.
 */
export function Radio({ value, checked, onChange, label, description, className = '', disabled, ...inputProps }: RadioProps) {
  const control = (
    <span className={`relative inline-flex shrink-0 items-center ${hasText(label) ? LINE_BOX : className}`}>
      <input
        {...inputProps}
        type="radio"
        value={value}
        checked={checked}
        disabled={disabled}
        onChange={(event) => {
          if (event.target.checked) onChange(value, event);
        }}
        className="peer sr-only"
      />
      {/* 16px ring with §5 radius-xl (8px) = a circle; 8px dot with radius-md (4px). Focus ring as Checkbox. */}
      <span
        aria-hidden="true"
        className={[
          'flex h-4 w-4 items-center justify-center rounded-xl border',
          'transition-colors duration-(--duration-fast) ease-(--ease-standard)',
          'peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-1 peer-focus-visible:outline-bay-leaf-600',
          disabled ? 'opacity-60' : '',
          checked
            ? 'border-bay-leaf-600 bg-bay-leaf-200'
            : 'border-neutral-600 bg-surface-elevated group-hover/radio:border-bay-leaf-600',
        ].join(' ')}
      >
        {checked && <span className="h-2 w-2 rounded-md bg-bay-leaf-900" />}
      </span>
    </span>
  );

  if (!hasText(label)) return control;

  return (
    <label
      className={`group/radio inline-flex items-start gap-(--space-1) ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'} ${className}`}
    >
      {control}
      <span className="flex min-w-0 flex-col">
        <span
          className={`text-(length:--font-size-body-sm) leading-(--line-height-normal) ${
            disabled ? 'text-text-tertiary' : 'text-text-primary'
          }`}
        >
          {label}
        </span>
        {hasText(description) && (
          <span className="text-(length:--font-size-body-sm) leading-(--line-height-normal) text-text-secondary">
            {description}
          </span>
        )}
      </span>
    </label>
  );
}

export interface RadioOption {
  /** Value reported on select. Unique within the group. */
  value: string;
  /** Visible option label. */
  label: ReactNode;
  /** Optional second line. */
  description?: ReactNode;
  /** Disables this option only. */
  disabled?: boolean;
}

export interface RadioGroupProps {
  /** Group label, shown above the options and used as the radiogroup's accessible name. */
  label: ReactNode;
  /** The options, in order. */
  options: RadioOption[];
  /** Selected option's value. `null` (or a value no option has) means nothing is selected yet. Always controlled. */
  value: string | null;
  /** Fired with the newly selected option's value. */
  onChange: (value: string) => void;
  /** Shared `name` for the native radios. Defaults to a generated id; pass one when posting a form. */
  name?: string;
  /** `stacked` (default): one option per row. `inline`: options wrap in a row. */
  orientation?: 'stacked' | 'inline';
  /** Helper text below the options. */
  hint?: ReactNode;
  /** Error message; any non-empty value sets `aria-invalid` on the group. */
  error?: ReactNode;
  /** Disables every option. */
  disabled?: boolean;
  /** Marks the group required for assistive tech (`aria-required`). */
  required?: boolean;
  /** Extra classes on the outer wrapper. */
  className?: string;
}

/**
 * An exclusive set of radios with a label, hint and error. Tab enters the group at the selected
 * option (or the first); Arrow keys move and select within it.
 */
export function RadioGroup({
  label,
  options,
  value,
  onChange,
  name,
  orientation = 'stacked',
  hint,
  error,
  disabled = false,
  required,
  className = '',
}: RadioGroupProps) {
  const uid = useId();
  const groupName = name ?? `${uid}-radio`;
  const labelId = `${uid}-label`;
  const hintId = `${uid}-hint`;
  const errorId = `${uid}-error`;
  const invalid = hasText(error);

  return (
    <div className={`flex min-w-0 flex-col gap-(--space-1) ${className}`}>
      <span id={labelId} className={LABEL_CLASS}>
        {label}
      </span>
      <div
        role="radiogroup"
        aria-labelledby={labelId}
        aria-describedby={describedBy(hasText(hint) && hintId, invalid && errorId)}
        aria-invalid={invalid || undefined}
        aria-required={required || undefined}
        className={orientation === 'inline' ? 'flex flex-wrap gap-x-(--space-3) gap-y-(--space-1)' : 'flex flex-col gap-(--space-1)'}
      >
        {options.map((opt) => (
          <Radio
            key={opt.value}
            name={groupName}
            value={opt.value}
            checked={value === opt.value}
            onChange={onChange}
            label={opt.label}
            description={opt.description}
            disabled={disabled || opt.disabled}
          />
        ))}
      </div>
      <FieldMessages hintId={hintId} errorId={errorId} hint={hint} error={error} />
    </div>
  );
}

export default RadioGroup;
