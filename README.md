# @polaris/ui

The shared form-control library for every Polaris project, built to `References/design.md` (design_spec) §9.
Source-only TSX: no build step. Consumers compile it with their own Vite and Tailwind v4.

- Project card: `.claude/polaris-ui-project.md`
- Token source: `References/design.md` §10, generated into `src/styles/tokens.css`

## What is in it

| Export | What it is |
|---|---|
| `Input` | Single-line field (text, email, password, number, search), 40px or 48px, prefix/suffix icons, label/hint/error, Text Sweep typing animation. |
| `Textarea` | Multi-line field with the same states as Input; optional `autoResize` capped at 320px. |
| `Radio`, `RadioGroup` | Exclusive choice, stacked or inline; native arrow-key movement within the group. |
| `Switch` | On/off toggle, `role="switch"`, no intermediate state. |
| `Checkbox` | Drawn checkbox with checked, unchecked and indeterminate (group toggle). Ported from Timer. |
| `SingleSelectDropdown` | Pick one value from a list; optional search. Ported from Timer. |
| `MultiSelectDropdown` | Pick any number of values; search, bulk actions, chips. Ported from Timer. |
| `TimeField` | 12-hour time entry with AM/PM; value is 24h `HH:MM`. Ported from Timer. |
| `DateField` | Date or date-range field opening the calendar picker. Ported from Timer. |
| `WeekCalendarPicker`, `MonthGrid` | The calendar grid (week, range, single). Ported from Timer. |
| `useDismiss` | Close-on-outside-click / Escape hook used by the popovers. Ported from Timer. |
| date helpers | `MONTH_SHORT`, `isoToDate`, `toIso`, `weekFromAnyDate`, `shiftWeek`, ... (`src/utils/dates.ts`, copied from Timer). |

Ported files are copies of Timer MVP (`Polaris-MDBS UI-UX Frontend/src/ui/`) as of 2026-09-25. Timer keeps its
own copies and is never edited from here. `src/utils/dates.ts` can drift from Timer's `src/lib/dates.ts`.

## Using it in a project

1. Dependency, linked from the vault root:
   ```json
   "dependencies": { "@polaris/ui": "file:../polaris-ui" },
   "scripts": { "postinstall": "npm install --prefix ../polaris-ui --no-audit --no-fund" }
   ```
   npm 9+ does not install the dependencies of a `file:` link, so the `postinstall` installs the library's own
   dependencies (Taygeta from GitHub, built by its `prepare` script) into `polaris-ui/node_modules`.
2. CSS, in the project's entry stylesheet:
   ```css
   @import "tailwindcss";
   @import "@polaris/ui/styles.css";
   @source "../../polaris-ui/src"; /* path from this CSS file to polaris-ui/src */
   ```
   `styles.css` brings the token layer, Taygeta's `text-sweep.css` and the library CSS.
3. Vite config, so there is one React at runtime and the linked source is served in dev:
   ```ts
   resolve: { dedupe: ["react", "react-dom", "lucide-react"] },
   server: { fs: { allow: [".", "../polaris-ui"] } },
   ```
4. Import components: `import { Input, RadioGroup } from "@polaris/ui";`

Peer dependencies: `react` and `react-dom` 19+, `lucide-react`.

## Preview

Every component in every §9 state, in its own Vite dev app (`preview/`, not part of any site):

```bash
npm install
npm run preview -- --port 5320 --strictPort
```

The launch configuration `polaris-ui-preview` runs the same command on port 5320. Dark mode follows the OS
or browser colour scheme.

## Tokens

`src/styles/tokens.css` is the single copy of the Polaris token layer. Its `@theme`, `:root` and dark blocks are
generated from design_spec §10; the `@theme inline` alias block at the end is hand-maintained (short gallery
names such as `bg-page`, `text-fg`, and Timer's names such as `bg-surface-default`, `text-text-secondary`).

```bash
npm run tokens         # regenerate from References/design.md §10
npm run tokens:check   # exit 1 if tokens.css drifts from the spec
```

## Typecheck

```bash
npx tsc --noEmit -p .
```

## Dependencies

- `taygeta-ux-animation-components` (Text Sweep, `SweepInput`) is pinned to commit `5f5628d` on the owner's
  `fix/text-sweep-refinements` branch (PR #1), the first commit where `SweepInput` forwards its ref to the
  native `<input>`. Repin to `#v0.2.0` once that PR is merged and tagged.

## Open values (design_spec does not define them)

- Switch track and thumb size (built from §4 spacing: 40 x 24px track, 16px thumb, 4px inset) and its corners.
- Focus ring width (2px, as in the ported selectors) and the Switch disabled-on fill (bay-leaf-200).
- Text Sweep stagger (35ms), stagger cap (8), travel distance (115%) and blur (4px): Taygeta defaults.
