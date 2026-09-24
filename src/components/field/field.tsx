// Shared field parts for Input, Textarea and RadioGroup: the label above the control and
// the hint / error text below it. Internal to @polaris/ui (not exported from the barrel).
import type { ReactNode } from 'react';

/** Visual state of a text field's frame. Error wins over success. */
export type FieldTone = 'default' | 'error' | 'success';

export function fieldTone(error: ReactNode, success: boolean | undefined): FieldTone {
  if (error != null && error !== false && error !== '') return 'error';
  return success ? 'success' : 'default';
}

/** Ids of the hint and error elements, joined for `aria-describedby` with the caller's own. */
export function describedBy(...ids: Array<string | undefined | false>): string | undefined {
  const joined = ids.filter(Boolean).join(' ');
  return joined || undefined;
}

// design_spec §3 Label: Public Sans 500, --font-size-label, line-height 1.5; §2 text-secondary "labels".
export const LABEL_CLASS =
  'block text-(length:--font-size-label) leading-(--line-height-normal) font-medium text-text-secondary';

// design_spec §3 Body Small: --font-size-body-sm, line-height 1.5.
const MESSAGE_CLASS = 'text-(length:--font-size-body-sm) leading-(--line-height-normal)';

/**
 * The frame border for each tone (design_spec §11 2026-09-25 ruling: resting edge uses
 * border-default so it does not vanish against dark-mode card surfaces; §10 Tailwind
 * `error` = error-600, `success` = success-600). Hover darkens only the default tone.
 */
export const TONE_BORDER: Record<FieldTone, string> = {
  default: 'border-border-default',
  error: 'border-error-600',
  success: 'border-success-600',
};

interface FieldMessagesProps {
  hintId: string;
  errorId: string;
  hint?: ReactNode;
  error?: ReactNode;
}

/** Hint then error, below the control. The error is announced when it appears (`role="alert"` is avoided so it is not re-read on every render; `aria-live="polite"` instead). */
export function FieldMessages({ hintId, errorId, hint, error }: FieldMessagesProps) {
  const hasError = error != null && error !== false && error !== '';
  return (
    <>
      {hint != null && hint !== '' && (
        <p id={hintId} className={`${MESSAGE_CLASS} text-text-secondary`}>
          {hint}
        </p>
      )}
      <p id={errorId} aria-live="polite" className={`${MESSAGE_CLASS} text-error-text ${hasError ? '' : 'sr-only'}`}>
        {hasError ? error : null}
      </p>
    </>
  );
}

export function hasText(node: ReactNode): boolean {
  return node != null && node !== false && node !== '';
}
