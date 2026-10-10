// Preview sections for the QA1 additions: FilterChip, ChipGroup, Input compact/invalid,
// FieldGroup, Select, IconButton and the MultiSelectDropdown chip trigger.
import { useState, type ReactNode } from 'react';
import { AlertCircle, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { ChipGroup, FieldGroup, FilterChip, IconButton, Input, MultiSelectDropdown, Select, type ChipGroupItem } from '../src';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-(--space-2) rounded-xl border border-line bg-elevated p-(--space-3)">
      <h2 className="font-body text-section font-semibold text-fg">{title}</h2>
      <div className="grid grid-cols-1 gap-(--space-3) md:grid-cols-2">{children}</div>
    </section>
  );
}

function State({ name, wide, children }: { name: string; wide?: boolean; children: ReactNode }) {
  return (
    <div className={`flex min-w-0 flex-col gap-(--space-1) ${wide ? 'md:col-span-2' : ''}`}>
      <p className="text-caption font-semibold uppercase text-fg-muted">{name}</p>
      {children}
    </div>
  );
}

const Dot = ({ tone }: { tone: string }) => <span className="block h-3 w-3 rounded-full" style={{ background: tone }} />;
const DOT_COLOURS = ['#38634a', '#1d6fb8', '#b45309', '#7c3aed', '#be123c', '#0f766e'];

const NAMES = [
  ['Atlas rebrand', '31:20'], ['Northwind retainer', '22:05'], ['Harbor site', '14:45'], ['Internal ops', '9:10'],
  ['Birchwood audit', '7:56'], ['Pilot onboarding with a very long project name', '6:30'], ['Kestrel', '5:00'],
  ['Lumen docs', '4:12'], ['Maple support', '3:40'], ['Orchid QA', '2:25'], ['Quarry migration', '1:15'], ['Zenith', '0:45'],
];

function makeItems(n: number, pressedIds: string[] = [], allPressed = false): ChipGroupItem[] {
  const projects = NAMES.slice(0, n - 1).map(([label, count], i) => ({
    id: `p${i}`,
    label,
    count,
    leading: <Dot tone={DOT_COLOURS[i % DOT_COLOURS.length]} />,
    trailing: i === 2 ? <AlertCircle size={14} strokeWidth={1.5} aria-hidden="true" /> : undefined,
    accessibleName: `${label}, ${count}${i === 2 ? ', has a conflict' : ''}`,
    pressed: pressedIds.includes(`p${i}`),
  }));
  return [{ id: 'all', label: 'All', count: '119:23', stableWidth: true, pressed: allPressed || pressedIds.length === 0 }, ...projects];
}

function Chips({
  count,
  layout,
  size,
  initial = [],
  withOverflow,
  boxClass = '',
}: {
  count: number;
  layout: 'scroll' | 'wrap';
  size: 'sm' | 'md';
  initial?: string[];
  withOverflow?: boolean;
  boxClass?: string;
}) {
  const [sel, setSel] = useState<string[]>(initial);
  const items = makeItems(count, sel);
  const toggle = (id: string) => setSel((s) => (id === 'all' ? [] : s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  return (
    <div className={`min-w-0 ${boxClass}`}>
      <ChipGroup
        label="Filter by project"
        items={items}
        onToggle={toggle}
        onEscape={() => setSel([])}
        layout={layout}
        size={size}
        renderOverflow={
          withOverflow
            ? (hidden) => (
                <MultiSelectDropdown
                  label="Projects"
                  size={size}
                  triggerVariant="chip"
                  triggerLabel={`+${hidden.length} more`}
                  triggerAriaLabel={`${hidden.length} more projects`}
                  options={items.slice(1).map((i) => ({ value: i.id, label: `${i.label} · ${i.count}` }))}
                  value={sel}
                  onChange={setSel}
                  searchable
                  popupAlign="left"
                  popupWidth="w-72"
                />
              )
            : undefined
        }
      />
    </div>
  );
}

export function ChipSection() {
  const [on, setOn] = useState(true);
  const [off, setOff] = useState(false);
  return (
    <Section title="FilterChip">
      <State name="Idle, hover (point at it), sm 32px">
        <div className="flex flex-wrap gap-2 p-1">
          <FilterChip pressed={off} onPressedChange={setOff} label="Atlas rebrand" count="31:20" leading={<Dot tone={DOT_COLOURS[0]} />} />
        </div>
      </State>
      <State name="Pressed (check replaces dot), md 40px">
        <div className="flex flex-wrap gap-2 p-1">
          <FilterChip pressed={on} onPressedChange={setOn} size="md" label="Northwind" count="22:05" leading={<Dot tone={DOT_COLOURS[1]} />} />
        </div>
      </State>
      <State name="With marker (conflict)">
        <div className="flex flex-wrap gap-2 p-1">
          <FilterChip pressed={false} onPressedChange={() => {}} label="Harbor site" count="14:45" leading={<Dot tone={DOT_COLOURS[2]} />} trailing={<AlertCircle size={14} strokeWidth={1.5} aria-hidden="true" />} accessibleName="Harbor site, 14:45, has a conflict" />
          <FilterChip pressed onPressedChange={() => {}} label="Harbor site" count="14:45" leading={<Dot tone={DOT_COLOURS[2]} />} trailing={<AlertCircle size={14} strokeWidth={1.5} aria-hidden="true" />} accessibleName="Harbor site, 14:45, has a conflict" />
        </div>
      </State>
      <State name="Truncated label (128px, title on hover)">
        <div className="flex flex-wrap gap-2 p-1">
          <FilterChip pressed={false} onPressedChange={() => {}} label="Pilot onboarding with a very long project name" count="6:30" leading={<Dot tone={DOT_COLOURS[3]} />} />
        </div>
      </State>
      <State name="stableWidth (All): idle and pressed, same width">
        <div className="flex flex-wrap gap-2 p-1">
          <FilterChip pressed={false} onPressedChange={() => {}} label="All" count="119:23" stableWidth />
          <FilterChip pressed onPressedChange={() => {}} label="All" count="119:23" stableWidth />
        </div>
      </State>
      <State name="Focus-visible (Tab to it)">
        <div className="flex flex-wrap gap-2 p-1">
          <FilterChip pressed={false} onPressedChange={() => {}} label="Tab here" count="0:45" />
          <FilterChip pressed onPressedChange={() => {}} label="Then here" count="0:45" />
        </div>
      </State>
    </Section>
  );
}

export function ChipGroupSection() {
  return (
    <Section title="ChipGroup">
      <State name="4 items, wrap, plain Tab stops" wide>
        <Chips count={4} layout="wrap" size="sm" />
      </State>
      <State name="13 items, wrap, overflow slot (resize the window)" wide>
        <Chips count={13} layout="wrap" size="sm" withOverflow />
      </State>
      <State name="13 items, wrap, pressed item promoted from overflow" wide>
        <Chips count={13} layout="wrap" size="sm" withOverflow initial={['p10']} />
      </State>
      <State name="13 items, scroll at 375, md 40px, roving">
        <Chips count={13} layout="scroll" size="md" boxClass="max-w-[375px]" />
      </State>
      <State name="6 chips (every chip a Tab stop)">
        <Chips count={6} layout="wrap" size="sm" />
      </State>
      <State name="7 chips (roving: one Tab stop, arrows, Home/End, Esc = All)" wide>
        <Chips count={7} layout="wrap" size="sm" />
      </State>
    </Section>
  );
}

export function FieldAdditionsSection() {
  const [name, setName] = useState('');
  return (
    <Section title="Input compact, FieldGroup, Select, IconButton">
      <State name="Input compact (40px phone / 32px from 768)">
        <Input size="compact" label="Hours" placeholder="0" hint="Whole hours." />
      </State>
      <State name="Input compact, error with icon">
        <Input size="compact" label="Minutes" defaultValue="75" error="Minutes must be 0 to 59." />
      </State>
      <State name="Input compact, disabled / success">
        <div className="flex flex-col gap-(--space-2)">
          <Input size="compact" label="Locked" defaultValue="8" disabled />
          <Input size="compact" label="Saved" defaultValue="8" success />
        </div>
      </State>
      <State name="Input compact with value (controlled)">
        <Input size="compact" label="Note" value={name} onChange={(e) => setName(e.target.value)} placeholder="Type here" />
      </State>
      <State name="FieldGroup: invalid inputs, one error" wide>
        <FieldGroup legend="Time to add" hint="Up to 24 hours per day." error="Enter at least one minute." messageId="fg-demo-error">
          <div className="grid grid-cols-2 gap-(--space-2)">
            <Input size="compact" label="Hours" invalid defaultValue="0" aria-describedby="fg-demo-error" />
            <Input size="compact" label="Minutes" invalid defaultValue="0" aria-describedby="fg-demo-error" />
          </div>
        </FieldGroup>
      </State>
      <State name="FieldGroup: hidden legend, no messages">
        <FieldGroup legend="Dates" legendHidden>
          <Input size="compact" label="From" defaultValue="Mon" />
        </FieldGroup>
      </State>
      <State name="Select default / compact above">
        <div className="flex flex-col gap-(--space-2)">
          <Select label="Day"><option>Monday</option><option>Tuesday</option></Select>
          <Select label="Day" size="compact" hint="Within this week."><option>Monday</option><option>Tuesday</option></Select>
        </div>
      </State>
      <State name="Select compact, label at start (person picker)">
        <Select label="Person" size="compact" labelPlacement="start"><option>Ana Reyes</option><option>Ben Cruz</option></Select>
      </State>
      <State name="Select error / disabled">
        <div className="flex flex-col gap-(--space-2)">
          <Select label="Day" size="compact" error="Pick a day."><option value="">Choose</option><option>Monday</option></Select>
          <Select label="Day" size="compact" disabled><option>Monday</option></Select>
        </div>
      </State>
      <State name="IconButton sm 24 / md 28 / lg 32 (hover, Tab)">
        <div className="flex items-center gap-(--space-2)">
          <IconButton size="sm" icon={X} label="Dismiss" />
          <IconButton size="md" icon={ChevronLeft} label="Previous week" />
          <IconButton size="md" icon={ChevronRight} label="Next week" />
          <IconButton size="md" icon={X} iconSize={20} label="Close dialog" />
          <IconButton size="lg" icon={X} label="Close" />
        </div>
      </State>
      <State name="IconButton disabled (aria-disabled, 60%)">
        <IconButton icon={ChevronRight} label="Next week" disabled />
      </State>
      <State name="MultiSelectDropdown chip trigger (fixed label) vs field">
        <div className="flex flex-wrap items-center gap-(--space-2)">
          <MultiSelectDropdown label="Projects" triggerVariant="chip" triggerLabel="+3 more" triggerAriaLabel="3 more projects" searchable popupAlign="left" options={NAMES.map(([l, c]) => ({ value: l, label: `${l} · ${c}` }))} />
          <MultiSelectDropdown label="Projects" size="md" triggerVariant="chip" triggerLabel="+3 more" triggerAriaLabel="3 more projects" popupAlign="left" options={NAMES.slice(0, 4).map(([l]) => ({ value: l, label: l }))} defaultValue={[NAMES[0][0]]} />
          <MultiSelectDropdown label="Team" triggerLabel="Fixed text, field look" options={NAMES.slice(0, 4).map(([l]) => ({ value: l, label: l }))} defaultValue={[NAMES[0][0]]} className="max-w-48" />
        </div>
      </State>
    </Section>
  );
}
