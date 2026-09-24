// Polaris Switch (design_spec §9 Forms > Switch: on/off toggle, no intermediate state).
// A <button role="switch">: Space and Enter toggle, `aria-checked` carries the state.
import { useId, type ButtonHTMLAttributes, type MouseEvent, type ReactNode } from 'react';
import { hasText } from './field/field';

type NativeButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'type' | 'role' | 'onChange' | 'children' | 'className' | 'value' | 'aria-checked'
>;

export interface SwitchProps extends NativeButtonProps {
  /** On (`true`) or off (`false`). Always controlled; there is no intermediate state. */
  checked: boolean;
  /** Fired with the next state when the user toggles (click, Space, Enter, or a click on the label). */
  onChange: (checked: boolean, event: MouseEvent<HTMLButtonElement>) => void;
  /**
   * Visible label beside the switch; it names the switch (`aria-labelledby`) and a click on it
   * toggles. With no label, give the switch `aria-label`.
   */
  label?: ReactNode;
  /** Secondary line under the label, linked with `aria-describedby`. */
  description?: ReactNode;
  /** Where the label sits. `end` (default): label after the switch. `start`: label first. */
  labelPosition?: 'start' | 'end';
  /** Extra classes on the outer element. */
  className?: string;
}

/**
 * On/off toggle. Every other prop (`id`, `name`, `disabled`, `aria-*`) goes to the `<button>`.
 *
 * Track 40 x 24px and thumb 16px use the §4 spacing tokens (--space-5, --space-3, --space-2);
 * design_spec §9 gives no Switch dimensions, so these are listed as open in the library README.
 * On: bay-leaf-200 track, bay-leaf-600 edge, bay-leaf-900 thumb (owner ruling, §11 2026-09-25).
 */
export function Switch({
  checked,
  onChange,
  label,
  description,
  labelPosition = 'end',
  className = '',
  disabled,
  id,
  ...buttonProps
}: SwitchProps) {
  const uid = useId();
  const buttonId = id ?? `${uid}-switch`;
  const labelId = `${uid}-label`;
  const descId = `${uid}-desc`;
  const hasLabel = hasText(label);
  const hasDesc = hasText(description);

  const control = (
    <button
      {...buttonProps}
      id={buttonId}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={buttonProps['aria-labelledby'] ?? (hasLabel ? labelId : undefined)}
      aria-describedby={buttonProps['aria-describedby'] ?? (hasDesc ? descId : undefined)}
      disabled={disabled}
      onClick={(event) => onChange(!checked, event)}
      className={[
        'group/sw relative inline-flex h-(--space-3) w-(--space-5) shrink-0 items-center rounded-xl border',
        'transition-colors duration-(--duration-fast) ease-(--ease-standard)',
        // Focus ring as the ported Checkbox.
        'outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-bay-leaf-600',
        disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
        checked ? 'border-bay-leaf-600 bg-bay-leaf-200' : 'border-transparent bg-neutral-600',
      ].join(' ')}
    >
      {/* Thumb: 16px, 4px from each end (§4 --space-2; the 4px inset is (24 - 16) / 2). §6 shadow-sm on hover.
          On: bay-leaf-900, so it stays distinguishable from the bay-leaf-200 track. */}
      <span
        aria-hidden="true"
        className={[
          'absolute top-1/2 left-1 h-(--space-2) w-(--space-2) -translate-y-1/2 rounded-md',
          'transition-[translate,box-shadow] duration-(--duration-fast) ease-(--ease-standard)',
          checked ? 'translate-x-(--space-2) bg-bay-leaf-900' : 'translate-x-0 bg-surface-elevated',
          disabled ? '' : 'group-hover/sw:shadow-sm',
        ].join(' ')}
      />
    </button>
  );

  if (!hasLabel && !hasDesc) return <span className={`inline-flex ${className}`}>{control}</span>;

  // The label is a <label htmlFor> so a click on it toggles the button natively.
  const text = (
    <span className="flex min-w-0 flex-col">
      {hasLabel && (
        <label
          id={labelId}
          htmlFor={buttonId}
          className={`text-(length:--font-size-body-sm) leading-(--line-height-normal) ${
            disabled ? 'cursor-not-allowed text-text-tertiary' : 'cursor-pointer text-text-primary'
          }`}
        >
          {label}
        </label>
      )}
      {hasDesc && (
        <span id={descId} className="text-(length:--font-size-body-sm) leading-(--line-height-normal) text-text-secondary">
          {description}
        </span>
      )}
    </span>
  );

  return (
    <span className={`inline-flex items-start gap-(--space-1) ${className}`}>
      {labelPosition === 'start' && text}
      {control}
      {labelPosition === 'end' && text}
    </span>
  );
}

export default Switch;
