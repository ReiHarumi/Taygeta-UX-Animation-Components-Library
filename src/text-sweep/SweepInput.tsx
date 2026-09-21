import { useState } from "react";
import type {
  AnimationEvent,
  InputHTMLAttributes,
} from "react";
import { TextSweep } from "./TextSweep";
import type { SweepDirection } from "./TextSweep";

export type SweepInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "value" | "defaultValue"
> & {
  /** Controlled value (required). */
  value: string;
  /** Class for the wrapping element (the input keeps `className`). */
  shellClassName?: string;
  /** Exit animation length in ms. */
  exitDuration?: number;
};

/**
 * A text input whose typed characters animate in and out.
 *
 * The real `<input>` stays in charge of typing, selection, the caret, IME and
 * accessibility; its own text is made transparent and a `TextSweep` overlay
 * draws the animated copy on top. Direction is derived from the value: growing
 * sweeps up, shrinking sweeps down. Browser autofill is detected so the
 * autofill background never paints over the overlay.
 *
 * Give the input and its wrapper the same font (the stylesheet sets
 * `font: inherit` on the input) so the overlay lines up with the caret.
 */
export function SweepInput({
  value,
  shellClassName,
  exitDuration,
  onAnimationStart,
  ...inputProps
}: SweepInputProps) {
  // "Adjust state while rendering" (https://react.dev/reference/react/useState):
  // the direction is derived from how the controlled value changed.
  const [previousValue, setPreviousValue] = useState(value);
  const [direction, setDirection] = useState<SweepDirection>("up");
  const [autofilled, setAutofilled] = useState(false);

  if (value !== previousValue) {
    setPreviousValue(value);
    setDirection(value.length < previousValue.length ? "down" : "up");
  }
  if (value.length === 0 && autofilled) setAutofilled(false);

  const handleAnimationStart = (event: AnimationEvent<HTMLInputElement>) => {
    if (event.animationName === "text-sweep-autofill-start") {
      setAutofilled(true);
    } else if (event.animationName === "text-sweep-autofill-cancel") {
      setAutofilled(false);
    }
    onAnimationStart?.(event);
  };

  return (
    <div
      className={
        shellClassName ? `text-sweep-shell ${shellClassName}` : "text-sweep-shell"
      }
    >
      <input
        {...inputProps}
        value={value}
        data-autofilled={autofilled}
        onAnimationStart={handleAnimationStart}
      />
      <TextSweep
        value={value}
        direction={direction}
        exitDuration={exitDuration}
      />
    </div>
  );
}
