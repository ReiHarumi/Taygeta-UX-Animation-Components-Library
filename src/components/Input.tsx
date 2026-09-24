// Polaris Input (design_spec §9 Core > Input). A single-line text field with an optional
// Text Sweep typing animation (Taygeta `SweepInput`), prefix/suffix icons, and a label,
// hint and error wired to the input for assistive tech.
import {
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type InputHTMLAttributes,
  type MouseEvent,
  type ReactNode,
  type Ref,
} from 'react';
import { Search, type LucideIcon } from 'lucide-react';
import { SweepInput } from 'taygeta-ux-animation-components';
import { FieldMessages, LABEL_CLASS, TONE_BORDER, describedBy, fieldTone, hasText } from './field/field';

type NativeInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type' | 'size' | 'value' | 'defaultValue' | 'prefix' | 'className' | 'children'
>;

export interface InputProps extends NativeInputProps {
  /** Input type. `search` adds a leading Search icon (and ignores `prefix`). Defaults to `text`. */
  type?: 'text' | 'email' | 'password' | 'number' | 'search';
  /** `default`: 40px tall, 16px icons. `large`: 48px tall, 20px icons (design_spec §9, §8). Defaults to `default`. */
  size?: 'default' | 'large';
  /**
   * Controlled value. Pass with `onChange`. Leave `undefined` to let the field hold its own
   * draft (optionally seeded by `defaultValue`).
   */
  value?: string;
  /** Initial draft when uncontrolled. Ignored when `value` is given. */
  defaultValue?: string;
  /** Fired on every edit with the native event; read `event.target.value`. */
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
  /**
   * Visible label above the field, linked with `htmlFor`. When omitted the caller must give
   * the input an accessible name with `aria-label` or `aria-labelledby`.
   */
  label?: ReactNode;
  /** Helper text below the field, linked with `aria-describedby`. Shown in every state. */
  hint?: ReactNode;
  /**
   * Error message below the field. Any non-empty value puts the field in the error state:
   * error border, `aria-invalid="true"`, and the message linked with `aria-describedby`.
   */
  error?: ReactNode;
  /** `true` shows the success border. Ignored while `error` is set. */
  success?: boolean;
  /** Lucide icon drawn before the text, decorative (`aria-hidden`). Sized and stroked here (1.5, §8). */
  prefix?: LucideIcon;
  /** Lucide icon drawn after the text, decorative (`aria-hidden`). */
  suffix?: LucideIcon;
  /**
   * Text Sweep typing animation. Defaults to `true`. Always off for `password` (masked text is
   * never overlaid; Taygeta enforces this too) and for `number` (the browser reports an empty
   * value for partial numbers such as "-", which would leave the typed text invisible).
   */
  animated?: boolean;
  /** Extra classes on the outer wrapper (label + field + messages). Use it for width or margins. */
  className?: string;
  /** Ref to the native `<input>`. */
  ref?: Ref<HTMLInputElement>;
}

/**
 * Single-line text field. Every other prop (`name`, `placeholder`, `autoComplete`, `disabled`,
 * `required`, `aria-*`, `onBlur` ...) is passed to the native `<input>`.
 */
export function Input({
  type = 'text',
  size = 'default',
  value,
  defaultValue,
  onChange,
  label,
  hint,
  error,
  success,
  prefix,
  suffix,
  animated = true,
  className = '',
  ref,
  id,
  disabled,
  'aria-describedby': callerDescribedBy,
  ...inputProps
}: InputProps) {
  const autoId = useId();
  const inputId = id ?? `${autoId}-input`;
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;

  // View-local draft, used only when the caller does not control `value`.
  const [draft, setDraft] = useState(defaultValue ?? '');
  const controlled = value !== undefined;
  const current = controlled ? value : draft;
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (!controlled) setDraft(event.target.value);
    onChange?.(event);
  };

  const frameRef = useRef<HTMLDivElement>(null);
  const sweep = animated && type !== 'password' && type !== 'number';

  const tone = fieldTone(error, success);
  const large = size === 'large';
  const iconSize = large ? 20 : 16;
  const LeadIcon = type === 'search' ? Search : prefix;
  const TrailIcon = suffix;

  // A click on the frame's padding or an icon focuses the input.
  const focusFromFrame = (event: MouseEvent<HTMLDivElement>) => {
    const input = frameRef.current?.querySelector('input');
    if (!input || disabled || event.target === input) return;
    event.preventDefault();
    input.focus();
  };

  const nativeProps = {
    ...inputProps,
    id: inputId,
    type,
    disabled,
    onChange: handleChange,
    'aria-invalid': tone === 'error' ? true : undefined,
    'aria-describedby': describedBy(hasText(hint) && hintId, tone === 'error' && errorId, callerDescribedBy),
    // Transparent, borderless: the frame draws the box. Placeholder in text-secondary, as the ported selectors.
    className:
      'block h-full w-full min-w-0 border-0 bg-transparent p-0 text-text-primary placeholder:text-text-secondary outline-none disabled:cursor-not-allowed disabled:text-text-tertiary',
  };

  return (
    <div className={`flex min-w-0 flex-col gap-(--space-1) ${className}`}>
      {hasText(label) && (
        <label htmlFor={inputId} className={LABEL_CLASS}>
          {label}
        </label>
      )}
      <div
        ref={frameRef}
        onMouseDown={focusFromFrame}
        className={[
          // design_spec §9: 40px default, 48px large. §4 --space-1 gap, --space-2 horizontal padding.
          'flex w-full min-w-0 items-center gap-(--space-1) px-(--space-2)',
          large ? 'h-12' : 'h-10',
          // Ported selectors' trigger: rounded-lg (§5 --radius-lg 6px), border, cursor text.
          'rounded-lg border cursor-text',
          'transition-colors duration-(--duration-fast) ease-(--ease-standard)',
          TONE_BORDER[tone],
          disabled
            ? 'cursor-not-allowed bg-surface-default'
            : `bg-surface-elevated ${tone === 'default' ? 'hover:border-border-default' : ''}`,
          // Focus-visible: §2 border-strong ("Strong / focus borders") plus the ported selectors' 2px bay-leaf-600 ring.
          'has-[input:focus-visible]:ring-2 has-[input:focus-visible]:ring-bay-leaf-600',
          tone === 'default' ? 'has-[input:focus-visible]:border-border-strong' : '',
        ].join(' ')}
      >
        {LeadIcon && (
          <LeadIcon aria-hidden="true" size={iconSize} strokeWidth={1.5} className="shrink-0 text-text-secondary" />
        )}
        {sweep ? (
          <SweepInput
            {...nativeProps}
            // SweepInput forwards the ref to its native <input> (Taygeta 5f5628d).
            ref={ref}
            value={current}
            shellClassName="pui-sweep h-full flex-1"
            // design_spec §7 --duration-fast (150ms). A number prop, so the token cannot be read here.
            exitDuration={150}
            // design_spec §7: reduced motion preserves motion as specified.
            reducedMotion="ignore"
          />
        ) : (
          <div className="pui-sweep h-full min-w-0 flex-1">
            <input {...nativeProps} ref={ref} value={current} />
          </div>
        )}
        {TrailIcon && (
          <TrailIcon aria-hidden="true" size={iconSize} strokeWidth={1.5} className="shrink-0 text-text-secondary" />
        )}
      </div>
      <FieldMessages hintId={hintId} errorId={errorId} hint={hint} error={tone === 'error' ? error : undefined} />
    </div>
  );
}

export default Input;
