# Taygeta UX Animation Components Library

Small, dependency-free UX animation components for React. Each component is self-contained: a piece of TypeScript, a piece of CSS, and a demo.

| Component | What it does |
|---|---|
| [**Text Sweep**](#text-sweep) | Animated typing for text inputs. New characters sweep in, removed characters sweep out. |

More components will be added under `src/`.

## Text Sweep

While someone types, each new character slides in with a small blur and stagger. Deleted characters slide out. Characters that stay put never re-animate.

- **The real `<input>` keeps control.** Typing, selection, the caret, IME, spellcheck and screen readers all work as normal. The input's own text is hidden and an `aria-hidden` overlay draws the animated copy.
- **Diff-based.** Only what changed animates. A character typed in the middle sweeps in without disturbing the rest.
- **Grapheme-aware.** Accents (`José`), flags and emoji sequences (`👩🏽‍💻`) animate as one unit instead of being torn apart.
- **Autofill-safe.** Browser autofill paints its own background and text, so the component detects it and covers it.
- **Follows the caret.** Long values scroll with the input, and the overlay's insets are measured from the input's padding.
- **Password-safe.** `type="password"` never gets an overlay, so masked characters are never revealed.
- **Accessible.** With `prefers-reduced-motion: reduce` the overlay is dropped and the plain input text shows (opt out with `reducedMotion="ignore"`).
- **Tunable with CSS variables**, no JavaScript options needed.

### Try the demo

```bash
git clone https://github.com/ReiHarumi/Taygeta-UX-Animation-Components-Library.git
cd Taygeta-UX-Animation-Components-Library
npm install
npm run demo
npx serve .
```

Then open `/demo/index.html` on the port `serve` prints. (`serve.json` turns off clean URLs so the demo's relative paths work.)

### Use it in your project

This repository is not published to the npm registry. Install it straight from GitHub, pinned to a tag or commit:

```bash
npm i github:ReiHarumi/Taygeta-UX-Animation-Components-Library#v0.2.0
```

npm runs the package's `prepare` script (`npm run build`) after a Git install, which writes `dist/` (ES module, type declarations, CSS). Import from `taygeta-ux-animation-components` and `taygeta-ux-animation-components/text-sweep.css`. You can also copy `src/text-sweep/` into your project (three files).

```tsx
import { useState } from "react";
import { SweepInput } from "./text-sweep";     // or from the built package
import "./text-sweep/text-sweep.css";

function NameField() {
  const [name, setName] = useState("");
  return (
    <SweepInput
      id="name"
      name="name"
      autoComplete="name"
      value={name}
      onChange={(event) => setName(event.target.value)}
    />
  );
}
```

`SweepInput` accepts every normal `<input>` prop (except `defaultValue`; it is controlled), plus:

| Prop | Default | Meaning |
|---|---|---|
| `value` | required | The controlled value. |
| `shellClassName` | none | Extra class for the wrapping element. |
| `exitDuration` | `220` | Exit animation length in milliseconds. |
| `autoInset` | `true` | Measure the input's content box and set `--text-sweep-inset-left/right` on the wrapper. Set `false` to control the insets with CSS. |
| `reducedMotion` | `"respect"` | `"respect"` drops the overlay under `prefers-reduced-motion: reduce`. `"ignore"` keeps animating. |

With `type="password"` the overlay is never rendered and the input's own (masked) text shows; the wrapper gets `data-text-sweep="off"`.

If you want the overlay without the input wrapper, use `TextSweep` directly: `<TextSweep value="Hello" direction="up" />`. Pass `scrollLeft` (px) to shift the characters left inside the clipped overlay. It is decorative and `aria-hidden`, so keep the real text somewhere accessible.

### Styling

**Set the font on the wrapper (`.text-sweep-shell`), not on the `<input>`.** The input and the overlay both inherit from the wrapper, which keeps the animated text exactly on top of the real caret. If the input has its own larger or smaller font size, the overlay will not match it.

```css
.text-sweep-shell { font-size: 1.125rem; line-height: 1.6; }
```

Tune the animation with CSS variables on the wrapper or any ancestor:

| Variable | Default | Meaning |
|---|---|---|
| `--text-sweep-color` | `currentColor` | Overlay text color. |
| `--text-sweep-caret-color` | `currentColor` | Caret color. |
| `--text-sweep-duration` | `360ms` | Enter animation length. |
| `--text-sweep-stagger` | `35ms` | Delay between characters. |
| `--text-sweep-stagger-cap` | `8` | How many characters stagger; the rest enter together. |
| `--text-sweep-distance` | `115%` | How far characters travel. |
| `--text-sweep-blur` | `4px` | Blur at the start of an enter. |
| `--text-sweep-easing` | `cubic-bezier(0.22, 1, 0.36, 1)` | Enter timing function. |
| `--text-sweep-exit-easing` | `cubic-bezier(0.4, 0, 1, 1)` | Exit timing function. |
| `--text-sweep-inset-left` | `2px` | Overlay left inset. `SweepInput` measures it unless `autoInset={false}`. |
| `--text-sweep-inset-right` | `20px` | Overlay right inset; text is clipped here. Measured like the left inset. |
| `--text-sweep-autofill-bg` | `Canvas` | Color that hides the browser's autofill background. Set it to your page background. |

Use `input:placeholder-shown` styling for placeholders as usual: the input's text is only hidden while it holds a value.

### Known limits

- Single-line text inputs only (no `<textarea>`, no `<select>`).
- Right-to-left text and vertical writing modes have not been tested.
- The autofill detection relies on `:-webkit-autofill`, so it applies to Chromium and Safari. Firefox autofill styling is not covered.

## Development

```bash
npm install
npm run typecheck   # TypeScript
npm run build       # dist/: index.js, index.d.ts, text-sweep.css
npm run demo        # demo/demo.js for the demo page
```

Requires Node.js 18 or newer.

```
src/
  index.ts                 public exports
  text-sweep/
    TextSweep.tsx          the overlay and the diffing logic
    SweepInput.tsx         input wrapper: direction, autofill, scroll and inset handling
    text-sweep.css         styles and animation variables
demo/                      a page that shows the component
```

## Contributing

Issues and pull requests are welcome. Please keep each pull request to one change, describe *why* in the description, and run `npm run typecheck` and `npm run build` before you open it.

## License

[MIT](./LICENSE) © 2026 ReiHarumi
