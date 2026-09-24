// Polaris Textarea (design_spec §9 Forms > Textarea). Multi-line text with the same states as
// Input, an optional auto-resize capped at 320px, and a label, hint and error.
import {
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
  type Ref,
  type TextareaHTMLAttributes,
} from 'react';
import { FieldMessages, LABEL_CLASS, TONE_BORDER, describedBy, fieldTone, hasText } from './field/field';

type NativeTextareaProps = Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  'value' | 'defaultValue' | 'className' | 'children'
>;

export interface TextareaProps extends NativeTextareaProps {
  /** Controlled value. Pass with `onChange`. Leave `undefined` to let the field hold its own draft. */
  value?: string;
  /** Initial draft when uncontrolled. Ignored when `value` is given. */
  defaultValue?: string;
  /** Fired on every edit with the native event; read `event.target.value`. */
  onChange?: (event: ChangeEvent<HTMLTextAreaElement>) => void;
  /** Visible label above the field. When omitted, give the textarea `aria-label` or `aria-labelledby`. */
  label?: ReactNode;
  /** Helper text below the field, linked with `aria-describedby`. */
  hint?: ReactNode;
  /** Error message. Any non-empty value sets the error border and `aria-invalid="true"`. */
  error?: ReactNode;
  /** `true` shows the success border. Ignored while `error` is set. */
  success?: boolean;
  /**
   * Grow with the content instead of showing a resize handle. Height stops at 320px
   * (design_spec §9, "max-height 320px recommended"), then the field scrolls. Defaults to `false`.
   */
  autoResize?: boolean;
  /** Visible rows before any typing (the minimum height). Defaults to 3. */
  rows?: number;
  /** Extra classes on the outer wrapper. */
  className?: string;
  /** Ref to the native `<textarea>`. */
  ref?: Ref<HTMLTextAreaElement>;
}

/** design_spec §9: auto-resize max-height 320px. */
const MAX_AUTO_HEIGHT = 320;

/** Multi-line text field. Other props go to the native `<textarea>`. */
export function Textarea({
  value,
  defaultValue,
  onChange,
  label,
  hint,
  error,
  success,
  autoResize = false,
  rows = 3,
  className = '',
  ref,
  id,
  disabled,
  'aria-describedby': callerDescribedBy,
  ...textareaProps
}: TextareaProps) {
  const autoId = useId();
  const fieldId = id ?? `${autoId}-textarea`;
  const hintId = `${fieldId}-hint`;
  const errorId = `${fieldId}-error`;

  const [draft, setDraft] = useState(defaultValue ?? '');
  const controlled = value !== undefined;
  const current = controlled ? value : draft;

  const innerRef = useRef<HTMLTextAreaElement>(null);
  useImperativeHandle(ref, () => innerRef.current as HTMLTextAreaElement, []);

  // Auto-resize: measure after every value change, before paint.
  useLayoutEffect(() => {
    const el = innerRef.current;
    if (!el || !autoResize) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight + (el.offsetHeight - el.clientHeight), MAX_AUTO_HEIGHT)}px`;
  }, [current, autoResize]);

  const tone = fieldTone(error, success);

  return (
    <div className={`flex min-w-0 flex-col gap-(--space-1) ${className}`}>
      {hasText(label) && (
        <label htmlFor={fieldId} className={LABEL_CLASS}>
          {label}
        </label>
      )}
      <textarea
        {...textareaProps}
        ref={innerRef}
        id={fieldId}
        rows={rows}
        disabled={disabled}
        value={current}
        onChange={(event) => {
          if (!controlled) setDraft(event.target.value);
          onChange?.(event);
        }}
        aria-invalid={tone === 'error' ? true : undefined}
        aria-describedby={describedBy(hasText(hint) && hintId, tone === 'error' && errorId, callerDescribedBy)}
        className={[
          // Same frame as Input: §4 --space-1 / --space-2 padding, §5 radius-lg, §3 Body text.
          'block w-full min-w-0 px-(--space-2) py-(--space-1) rounded-lg border',
          'text-(length:--font-size-body) leading-(--line-height-normal) placeholder:text-text-secondary',
          'transition-colors duration-(--duration-fast) ease-(--ease-standard) outline-none',
          'focus-visible:ring-2 focus-visible:ring-bay-leaf-600',
          tone === 'default' ? 'focus-visible:border-border-strong' : '',
          TONE_BORDER[tone],
          autoResize ? 'resize-none max-h-80 overflow-y-auto' : 'resize-y',
          disabled
            ? 'cursor-not-allowed bg-surface-default text-text-tertiary'
            : `bg-surface-elevated text-text-primary ${tone === 'default' ? 'hover:border-border-default' : ''}`,
        ].join(' ')}
      />
      <FieldMessages hintId={hintId} errorId={errorId} hint={hint} error={tone === 'error' ? error : undefined} />
    </div>
  );
}

export default Textarea;
