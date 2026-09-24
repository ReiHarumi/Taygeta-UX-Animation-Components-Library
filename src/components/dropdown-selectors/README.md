# Dropdown selectors

Copied from Timer MVP `src/ui/dropdown-selectors/` on 2026-09-25 (owner ruling DS1, 2026-09-24). Timer keeps its own copy. Import from the package:

```ts
import { SingleSelectDropdown, MultiSelectDropdown, TimeField, DateField } from '@polaris/ui';
```

Dev preview of every module: `/_ui` in `free-app-gallery` (dev server only).

| Module | Use it when |
|---|---|
| `SingleSelectDropdown` | The user picks exactly one value from a list: a person, a status, a group-by, a weekday. Replaces every native `<select>` in Views. `searchable` for long lists (people). |
| `MultiSelectDropdown` | The user picks any number of values: report filters, tags. `searchable`, `bulkActions` (Select all / Clear), `triggerDisplay="chips"`. |
| `TimeField` | A clock time in a form. Shows 12-hour `HH:MM` plus AM/PM; the value in and out is 24h `HH:MM`. |
| `DateField` | A date or a date range in a form. Opens the calendar picker in a popover (a sheet below 1024px). |
| `WeekPicker` (`WeekCalendarPicker`, `MonthGrid`, date helpers) | The calendar grid itself: week mode (Dashboard), range mode (Calendar), single mode (inside DateField). |

`Checkbox` lives in `../Checkbox.tsx`: it is used outside dropdowns, and `MultiSelectDropdown`
imports it from there. The date helpers WeekPicker needs are in `../../utils/dates.ts`.
