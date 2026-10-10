// Polaris FieldGroup (Timesheet spec L-3). A <fieldset> that groups related fields under one
// legend and shows one hint and one error for the whole group.
import { useId, type ReactNode } from 'react';
import { COMPACT_LABEL_CLASS, FieldMessages, describedBy, hasText } from './field/field';

export interface FieldGroupProps {
  /** Group name, rendered as the `<legend>`. */
  legend: ReactNode;
  /** `true` hides the legend visually (`sr-only`) but keeps it for assistive tech. `undefined`/`false`: visible. */
  legendHidden?: boolean;
  /** The grouped fields, usually `Input`s. Give each `invalid` and add `messageId` to its `aria-describedby`. */
  children: ReactNode;
  /** Helper text under the children, full width. `undefined`: none. */
  hint?: ReactNode;
  /** Error under the children, full width, with a leading alert icon. `undefined` or empty: none. */
  error?: ReactNode;
  /**
   * The id of the error message element. Children add it to their `aria-describedby` so the
   * error is read with each field. `undefined`: a generated id. The hint's id is `{messageId}-hint`.
   */
  messageId?: string;
  /** Extra classes on the fieldset (width, margins, grid). No border or padding is ever added. */
  className?: string;
}

/** Grouping container with compact message styles (12px, alert icon on the error). */
export function FieldGroup({ legend, legendHidden, children, hint, error, messageId, className = '' }: FieldGroupProps) {
  const auto = useId();
  const errorId = messageId ?? `${auto}-message`;
  const hintId = `${errorId}-hint`;
  return (
    <fieldset
      aria-describedby={describedBy(hasText(hint) && hintId, hasText(error) && errorId)}
      className={`m-0 flex min-w-0 flex-col gap-(--space-1) border-0 p-0 ${className}`}
    >
      <legend className={legendHidden ? 'sr-only' : `mb-(--space-1) p-0 ${COMPACT_LABEL_CLASS}`}>{legend}</legend>
      {children}
      <FieldMessages hintId={hintId} errorId={errorId} hint={hint} error={error} compact />
    </fieldset>
  );
}

export default FieldGroup;
