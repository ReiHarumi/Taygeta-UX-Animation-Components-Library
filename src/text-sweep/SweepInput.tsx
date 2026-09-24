import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type {
  AnimationEvent,
  InputHTMLAttributes,
  SyntheticEvent,
} from "react";
import { TextSweep } from "./TextSweep";
import type { SweepDirection } from "./TextSweep";

// useLayoutEffect warns during server rendering in React 18; fall back there.
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

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
  /**
   * Measure the input's content box and set `--text-sweep-inset-left/right`
   * on the wrapper so the overlay lines up with the input's padding. Turn off
   * to set the insets yourself with CSS.
   */
  autoInset?: boolean;
  /**
   * "respect" drops the overlay under `prefers-reduced-motion: reduce` and
   * shows the input's own text. "ignore" keeps animating.
   */
  reducedMotion?: "respect" | "ignore";
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
 * The overlay follows the input's horizontal scroll, so long values track the
 * caret. `type="password"` never gets an overlay: the plain input renders
 * inside the wrapper so masked characters are never revealed.
 *
 * Give the input and its wrapper the same font (the stylesheet sets
 * `font: inherit` on the input) so the overlay lines up with the caret.
 */
export function SweepInput({
  value,
  shellClassName,
  exitDuration,
  autoInset = true,
  reducedMotion = "respect",
  onAnimationStart,
  onScroll,
  onSelect,
  onKeyUp,
  onClick,
  ...inputProps
}: SweepInputProps) {
  // "Adjust state while rendering" (https://react.dev/reference/react/useState):
  // the direction is derived from how the controlled value changed.
  const [previousValue, setPreviousValue] = useState(value);
  const [direction, setDirection] = useState<SweepDirection>("up");
  const [autofilled, setAutofilled] = useState(false);
  const [scrollLeft, setScrollLeft] = useState(0);
  const shellRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const sweepOff = inputProps.type === "password";

  if (value !== previousValue) {
    setPreviousValue(value);
    setDirection(value.length < previousValue.length ? "down" : "up");
  }
  if (value.length === 0 && autofilled) setAutofilled(false);

  const syncScroll = () => {
    if (inputRef.current) setScrollLeft(inputRef.current.scrollLeft);
  };

  // The browser scrolls the input to the caret after a value change; re-read.
  useIsomorphicLayoutEffect(syncScroll, [value]);

  // Measure the input's content box relative to the wrapper and expose it as
  // the overlay insets. Re-measured whenever either box resizes.
  useIsomorphicLayoutEffect(() => {
    const shell = shellRef.current;
    const input = inputRef.current;
    if (!shell || !input) return;
    if (!autoInset || sweepOff) {
      shell.style.removeProperty("--text-sweep-inset-left");
      shell.style.removeProperty("--text-sweep-inset-right");
      return;
    }
    const measure = () => {
      const style = getComputedStyle(input);
      const contentLeft =
        input.offsetLeft + input.clientLeft + parseFloat(style.paddingLeft);
      const contentRight =
        input.offsetLeft +
        input.clientLeft +
        input.clientWidth -
        parseFloat(style.paddingRight);
      shell.style.setProperty("--text-sweep-inset-left", `${contentLeft}px`);
      shell.style.setProperty(
        "--text-sweep-inset-right",
        `${shell.clientWidth - contentRight}px`,
      );
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(shell);
    observer.observe(input);
    return () => observer.disconnect();
  }, [autoInset, sweepOff]);

  const handleAnimationStart = (event: AnimationEvent<HTMLInputElement>) => {
    if (event.animationName === "text-sweep-autofill-start") {
      setAutofilled(true);
    } else if (event.animationName === "text-sweep-autofill-cancel") {
      setAutofilled(false);
    }
    onAnimationStart?.(event);
  };

  // Caret moves can scroll the input without a scroll event in some browsers,
  // so selection, key and click events re-read the offset too.
  const withScrollSync =
    <E extends SyntheticEvent<HTMLInputElement>>(handler?: (event: E) => void) =>
    (event: E) => {
      syncScroll();
      handler?.(event);
    };

  // One tree for both modes, so toggling a password's visibility keeps focus.
  const className = shellClassName
    ? `text-sweep-shell ${shellClassName}`
    : "text-sweep-shell";

  return (
    <div
      ref={shellRef}
      className={className}
      data-text-sweep={sweepOff ? "off" : undefined}
      data-reduced-motion={reducedMotion}
    >
      <input
        {...inputProps}
        ref={inputRef}
        value={value}
        data-autofilled={autofilled}
        onAnimationStart={handleAnimationStart}
        onScroll={withScrollSync(onScroll)}
        onSelect={withScrollSync(onSelect)}
        onKeyUp={withScrollSync(onKeyUp)}
        onClick={withScrollSync(onClick)}
      />
      {!sweepOff && (
        <TextSweep
          value={value}
          direction={direction}
          exitDuration={exitDuration}
          scrollLeft={scrollLeft}
        />
      )}
    </div>
  );
}
