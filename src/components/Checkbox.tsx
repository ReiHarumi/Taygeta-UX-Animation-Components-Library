import { useEffect, useRef, type ChangeEvent, type InputHTMLAttributes, type ReactNode } from 'react';
import { Check, Minus } from 'lucide-react';

type NativeInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type' | 'checked' | 'defaultChecked' | 'onChange' | 'size' | 'children' | 'className'
>;

export interface CheckboxProps extends NativeInputProps {
  /** Whether the box is ticked. Always controlled. */
  checked: boolean;
  /**
   * Fired with the next checked value when the user toggles the box (click, Space, or a
   * click on its label). The native change event is passed second for callers that need it.
   */
  onChange: (checked: boolean, event: ChangeEvent<HTMLInputElement>) => void;
  /**
   * Visible label, rendered beside the box inside one `<label>`, so a click on it toggles.
   * `children` is accepted as an alias; `label` wins when both are given.
   * With neither, the box renders bare (no `<label>`), for use inside a caller's own
   * `<label>` row; the caller then owns the accessible name.
   */
  label?: ReactNode;
  children?: ReactNode;
  /**
   * Draws the box as "mixed" (a dash) and sets the input's `indeterminate` property, so
   * assistive tech announces it as mixed. Used for a group toggle. Defaults to `false`.
   */
  indeterminate?: boolean;
  /** `md` (default): 16px box. `sm`: 14px box, for dense lists. */
  size?: 'sm' | 'md';
  /**
   * Cross-axis alignment of box and label. `center` (default) for one-line labels;
   * `start` pins the box to the first line of a wrapping label.
   */
  align?: 'center' | 'start';
  /** Extra classes on the outer element (the `<label>`, or the bare box wrapper). */
  className?: string;
}

/**
 * Shared checkbox (MS5). A native `<input type="checkbox">`, visually hidden, drives a drawn
 * box: 4px corners, a neutral-600 border, and when checked a bay-leaf-200 fill with a
 * bay-leaf-600 edge and a bay-leaf-900 tick. Keyboard, form and screen-reader behaviour stay
 * native. The focus ring shows on the drawn box when the input has `:focus-visible`.
 *
 * Every other prop (`id`, `name`, `disabled`, `aria-describedby`, `aria-label`, `data-*`, ...)
 * is passed to the input.
 */
export default function Checkbox({
  checked,
  onChange,
  label,
  children,
  indeterminate = false,
  size = 'md',
  align = 'center',
  className = '',
  disabled,
  ...inputProps
}: CheckboxProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (inputRef.current) inputRef.current.indeterminate = indeterminate;
  }, [indeterminate]);

  const filled = checked || indeterminate;
  const box = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';
  const glyph = size === 'sm' ? 'h-2.5 w-2.5' : 'h-3 w-3';
  const text = label ?? children;

  const control = (
    <span className={`relative inline-flex shrink-0 ${text == null ? className : ''}`}>
      <input
        {...inputProps}
        ref={inputRef}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked, e)}
        className="peer sr-only"
      />
      <span
        aria-hidden="true"
        className={`flex ${box} items-center justify-center rounded-md border transition-colors duration-150 motion-reduce:transition-none peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-1 peer-focus-visible:outline-bay-leaf-600 peer-disabled:opacity-60 ${
          filled
            ? 'border-bay-leaf-600 bg-bay-leaf-200 text-bay-leaf-900'
            : `border-neutral-600 bg-surface-elevated ${disabled ? '' : 'group-hover/cb:border-bay-leaf-600 hover:border-bay-leaf-600'}`
        }`}
      >
        {indeterminate ? (
          <Minus className={glyph} strokeWidth={3} />
        ) : checked ? (
          <Check className={glyph} strokeWidth={3} />
        ) : null}
      </span>
    </span>
  );

  if (text == null) return control;

  return (
    <label
      className={`group/cb inline-flex gap-2 ${align === 'start' ? 'items-start' : 'items-center'} ${
        disabled ? 'cursor-not-allowed' : 'cursor-pointer'
      } ${className}`}
    >
      {control}
      {text}
    </label>
  );
}
