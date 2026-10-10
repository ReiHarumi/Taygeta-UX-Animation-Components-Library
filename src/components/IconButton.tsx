// Polaris IconButton (Timesheet spec L-5). An icon-only button with a required accessible name.
import type { ButtonHTMLAttributes, MouseEvent, Ref } from 'react';
import type { LucideIcon } from 'lucide-react';

export interface IconButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'aria-label' | 'className' | 'type' | 'disabled'> {
  /** Lucide icon component drawn inside, decorative (`aria-hidden`), stroke 1.5. */
  icon: LucideIcon;
  /** Accessible name of the button (for example "Previous week"). Required: there is no visible text. */
  label: string;
  /** Square size: `sm` 24px, `md` 28px, `lg` 32px. Phones get a 40 x 40 hit area on every size. Defaults to `md`. */
  size?: 'sm' | 'md' | 'lg';
  /** Icon size in px. `undefined`: 14 for `sm`, 16 for `md` and `lg`. Use 20 for a dialog close X. */
  iconSize?: 14 | 16 | 20;
  /**
   * Disabled look and behaviour. Uses `aria-disabled` (the button stays focusable) with 60%
   * opacity, and swallows clicks. `undefined` or `false`: enabled.
   */
  disabled?: boolean;
  /** Button type. Defaults to `button`, so it never submits a surrounding form. */
  type?: 'button' | 'submit' | 'reset';
  /** Extra classes on the button. Use it for margins or placement, not for look. */
  className?: string;
  /** Ref to the native `<button>`. */
  ref?: Ref<HTMLButtonElement>;
}

const BOX = { sm: 'h-6 w-6', md: 'h-7 w-7', lg: 'h-8 w-8' } as const;

/**
 * Icon-only button. Every other prop (`onClick`, `title`, `aria-*`, `id` ...) goes to the native `<button>`.
 */
export function IconButton({
  icon: Icon,
  label,
  size = 'md',
  iconSize,
  disabled,
  type = 'button',
  className = '',
  onClick,
  ref,
  ...rest
}: IconButtonProps) {
  const px = iconSize ?? (size === 'sm' ? 14 : 16);
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (disabled) {
      event.preventDefault();
      return;
    }
    onClick?.(event);
  };
  return (
    <button
      {...rest}
      ref={ref}
      type={type}
      aria-label={label}
      aria-disabled={disabled ? true : undefined}
      onClick={handleClick}
      className={[
        'relative inline-flex shrink-0 items-center justify-center rounded-lg text-text-secondary',
        BOX[size],
        'transition-colors duration-(--duration-fast) ease-(--ease-standard) motion-reduce:transition-none',
        size === 'sm' ? 'pui-iconbtn-sm' : 'hover:bg-surface-muted',
        disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
        'focus-visible:outline-2 focus-visible:outline-(--color-focus-ring)',
        size === 'lg' ? 'focus-visible:outline-offset-2' : 'focus-visible:outline-offset-1',
        // Phone hit area: 40 x 40 around the visible box, off from 768.
        "before:absolute before:left-1/2 before:top-1/2 before:h-10 before:w-10 before:-translate-x-1/2 before:-translate-y-1/2 before:content-[''] tablet:before:hidden",
        className,
      ].join(' ')}
    >
      <Icon aria-hidden="true" size={px} strokeWidth={1.5} />
    </button>
  );
}

export default IconButton;
