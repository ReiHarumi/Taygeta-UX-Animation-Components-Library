import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";

export type SweepDirection = "up" | "down";

type SweepChar = {
  ch: string;
  key: number;
  exiting: boolean;
  direction: SweepDirection;
  /**
   * Stagger slot for this character, relative to the batch it entered with
   * (0 for the first character of a batch). Keeping it batch-relative means a
   * newly typed character never inherits the delay of a long existing string,
   * and still-present exiting spans never inflate it.
   */
  sweepIndex: number;
};

type SweepStyle = CSSProperties & {
  "--text-sweep-char-index": number;
};

type OverlayStyle = CSSProperties & {
  "--text-sweep-exit-duration": string;
};

type GraphemeSegmenter = {
  segment: (input: string) => Iterable<{ segment: string }>;
};

const graphemeSegmenter: GraphemeSegmenter | null = (() => {
  const SegmenterCtor = (
    Intl as unknown as {
      Segmenter?: new (
        locales?: string | string[] | undefined,
        options?: { granularity?: string },
      ) => GraphemeSegmenter;
    }
  ).Segmenter;
  if (typeof SegmenterCtor !== "function") return null;
  try {
    return new SegmenterCtor(undefined, { granularity: "grapheme" });
  } catch {
    return null;
  }
})();

/**
 * Split a string into user-perceived characters (grapheme clusters) so that
 * combining-mark sequences (NFD "José") and multi-code-point emoji (flags,
 * ZWJ sequences) stay atomic instead of being torn into separate spans.
 */
export function splitGraphemes(value: string): string[] {
  if (!graphemeSegmenter) return Array.from(value);
  const result: string[] = [];
  for (const entry of graphemeSegmenter.segment(value)) {
    result.push(entry.segment);
  }
  return result;
}

export type TextSweepProps = {
  /** The text to display. Changes are diffed: only new characters animate in. */
  value: string;
  /**
   * Which way new characters sweep in from. "up" enters from below, "down"
   * enters from above. Removed characters always leave downward.
   */
  direction?: SweepDirection;
  /** Exit animation length in ms. Also written to a CSS variable so they stay in sync. */
  exitDuration?: number;
  className?: string;
};

/**
 * Animated, non-interactive copy of a string. Characters that stay put are left
 * alone; inserted characters sweep in with a small stagger; removed characters
 * sweep out. It is `aria-hidden`: pair it with the real text input (see
 * SweepInput) so assistive tech reads the actual value.
 */
export function TextSweep({
  value,
  direction = "up",
  exitDuration = 220,
  className,
}: TextSweepProps) {
  const nextKeyRef = useRef(0);
  const [chars, setChars] = useState<SweepChar[]>(() =>
    splitGraphemes(value).map((ch, index) => ({
      ch,
      key: nextKeyRef.current++,
      exiting: false,
      direction,
      sweepIndex: index,
    })),
  );
  const previousValueRef = useRef(value);
  const exitTimeoutIdRef = useRef<number | null>(null);
  const exitGenerationRef = useRef(0);
  const directionRef = useRef(direction);
  directionRef.current = direction;
  const exitDurationRef = useRef(exitDuration);
  exitDurationRef.current = exitDuration;

  useEffect(
    () => () => {
      if (exitTimeoutIdRef.current !== null) {
        window.clearTimeout(exitTimeoutIdRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    const previousValue = previousValueRef.current;
    previousValueRef.current = value;
    if (value === previousValue) return;

    const previousChars = splitGraphemes(previousValue);
    const nextChars = splitGraphemes(value);
    const maxCommon = Math.min(previousChars.length, nextChars.length);

    // Common prefix.
    let prefixLength = 0;
    while (
      prefixLength < maxCommon &&
      previousChars[prefixLength] === nextChars[prefixLength]
    ) {
      prefixLength++;
    }

    // Common suffix, restricted to the still-unmatched middle of both strings
    // so prefix and suffix can never overlap.
    let suffixLength = 0;
    const maxSuffix = maxCommon - prefixLength;
    while (
      suffixLength < maxSuffix &&
      previousChars[previousChars.length - 1 - suffixLength] ===
        nextChars[nextChars.length - 1 - suffixLength]
    ) {
      suffixLength++;
    }

    const removedStart = prefixLength;
    const removedEnd = previousChars.length - suffixLength;
    const removedCount = removedEnd - removedStart;
    const insertedChars = nextChars.slice(
      prefixLength,
      nextChars.length - suffixLength,
    );
    // A middle insertion should read as an insert, not inherit "down" just
    // because the string shrank somewhere else.
    const enterDirection: SweepDirection =
      suffixLength > 0 ? "up" : directionRef.current;

    setChars((current) => {
      const entering: SweepChar[] = insertedChars.map((ch, index) => ({
        ch,
        key: nextKeyRef.current++,
        exiting: false,
        direction: enterDirection,
        sweepIndex: index,
      }));
      const next: SweepChar[] = [];
      let aliveIndex = 0;
      let inserted = false;
      for (const entry of current) {
        if (entry.exiting) {
          next.push(entry);
          continue;
        }
        if (!inserted && aliveIndex === removedStart) {
          next.push(...entering);
          inserted = true;
        }
        const index = aliveIndex;
        aliveIndex++;
        if (index < removedStart || index >= removedEnd) {
          // Untouched prefix or untouched suffix: leave completely alone.
          next.push(entry);
        } else {
          next.push({ ...entry, exiting: true });
        }
      }
      if (!inserted) next.push(...entering);
      return next;
    });

    if (removedCount > 0) {
      const generation = ++exitGenerationRef.current;
      if (exitTimeoutIdRef.current !== null) {
        window.clearTimeout(exitTimeoutIdRef.current);
      }
      exitTimeoutIdRef.current = window.setTimeout(() => {
        if (exitGenerationRef.current !== generation) return;
        exitTimeoutIdRef.current = null;
        setChars((current) => current.filter((entry) => !entry.exiting));
      }, exitDurationRef.current);
    }
  }, [value]);

  if (chars.length === 0) return null;

  const overlayStyle: OverlayStyle = {
    "--text-sweep-exit-duration": `${exitDuration}ms`,
  };

  return (
    <span
      className={className ? `text-sweep ${className}` : "text-sweep"}
      style={overlayStyle}
      aria-hidden="true"
    >
      {chars.map((entry) => {
        const style: SweepStyle = { "--text-sweep-char-index": entry.sweepIndex };
        const charClassName = entry.exiting
          ? "text-sweep__char text-sweep__char--exiting"
          : "text-sweep__char";
        return (
          <span
            className={charClassName}
            style={style}
            key={entry.key}
            data-sweep-direction={entry.direction}
          >
            {entry.ch === " " ? " " : entry.ch}
          </span>
        );
      })}
    </span>
  );
}
