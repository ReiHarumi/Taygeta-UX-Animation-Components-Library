// Preview of every @polaris/ui component in every design_spec §9 state.
// Its own Vite dev app: `npm run preview` in polaris-ui/ (not part of any consumer site).
import { useRef, useState, type ReactNode } from 'react';
import { AtSign, Lock, Mail, Phone, User } from 'lucide-react';
import {
  Checkbox,
  DateField,
  Input,
  MultiSelectDropdown,
  RadioGroup,
  SingleSelectDropdown,
  Switch,
  Textarea,
  TimeField,
  type DateRange,
} from '../src';

const LONG_VALUE =
  'maria.clara.de.los.santos-villanueva.operations.and.payroll@polaris-multidisciplinary-business-systems.example.ph';

const PEOPLE = [
  { value: 'ana', label: 'Ana Reyes' },
  { value: 'ben', label: 'Benjamin Cruz' },
  { value: 'carla', label: 'Carla Mendoza-Villanueva de los Santos, Operations and Payroll Lead' },
  { value: 'dan', label: 'Dan Lim', disabled: true },
  { value: 'ella', label: 'Ella Tan' },
];

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-(--space-2) rounded-xl border border-line bg-elevated p-(--space-3)">
      <h2 className="font-body text-section font-semibold text-fg">{title}</h2>
      <div className="grid grid-cols-1 gap-(--space-3) md:grid-cols-2">{children}</div>
    </section>
  );
}

/** One state, captioned with what it shows. */
function State({ name, children }: { name: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-(--space-1)">
      <p className="text-caption font-semibold uppercase text-fg-muted">{name}</p>
      {children}
    </div>
  );
}

function InputSection() {
  const [email, setEmail] = useState('');
  const focusRef = useRef<HTMLInputElement>(null);
  return (
    <Section title="Input">
      <State name="Default (animated)">
        <Input label="Email" type="email" placeholder="name@company.ph" hint="We only use it to send the report." value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
      </State>
      <State name="Hover (point at the field)">
        <Input label="Full name" placeholder="Hover to see the border darken" />
      </State>
      <State name="Focus-visible (ref forwarded)">
        <Input ref={focusRef} label="Workspace" defaultValue="Polaris" />
        <button type="button" onClick={() => focusRef.current?.focus()} className="self-start text-(length:--font-size-body-sm) font-semibold text-fg underline">
          Focus this field
        </button>
      </State>
      <State name="Disabled">
        <Input label="Employee ID" defaultValue="EMP-00042" disabled hint="Set by an admin." />
      </State>
      <State name="Error">
        <Input label="Email" type="email" defaultValue="maria@" error="Enter a full email address, like name@company.ph." />
      </State>
      <State name="Success">
        <Input label="Username" defaultValue="maria.santos" success hint="That username is free." />
      </State>
      <State name="Large (48px)">
        <Input label="Company name" size="large" prefix={User} placeholder="Polaris Inc." />
      </State>
      <State name="Prefix and suffix icons">
        <Input label="Phone" type="text" prefix={Phone} suffix={Lock} defaultValue="+63 917 555 0142" />
      </State>
      <State name="Password (never animated)">
        <Input label="Password" type="password" defaultValue="correct horse" autoComplete="current-password" />
      </State>
      <State name="Search">
        <Input aria-label="Search people" type="search" placeholder="Search people" />
      </State>
      <State name="Number (not animated)">
        <Input label="Hours" type="number" defaultValue="160" min={0} />
      </State>
      <State name="Long value">
        <Input label="Email" type="email" prefix={Mail} suffix={AtSign} defaultValue={LONG_VALUE} />
      </State>
      <State name="Animation off">
        <Input label="Notes title" animated={false} defaultValue="Plain input, no Text Sweep" />
      </State>
    </Section>
  );
}

function TextareaSection() {
  return (
    <Section title="Textarea">
      <State name="Default">
        <Textarea label="Notes" placeholder="Anything the approver should know" hint="Visible to your manager." />
      </State>
      <State name="Auto-resize (stops at 320px)">
        <Textarea
          label="Description"
          autoResize
          defaultValue={Array.from({ length: 18 }, (_, i) => `Line ${i + 1}: overtime approved for the payroll cut-off.`).join('\n')}
        />
      </State>
      <State name="Disabled">
        <Textarea label="Locked note" disabled defaultValue="This period is locked." />
      </State>
      <State name="Error">
        <Textarea label="Reason" defaultValue="" error="Add a reason before you submit." />
      </State>
      <State name="Success">
        <Textarea label="Reason" success defaultValue="Client meeting ran past 6 PM." />
      </State>
    </Section>
  );
}

function CheckboxSection() {
  const [days, setDays] = useState<Record<string, boolean>>({ Mon: true, Tue: false, Wed: true });
  const values = Object.values(days);
  const all = values.every(Boolean);
  const some = values.some(Boolean);
  const [single, setSingle] = useState(false);
  return (
    <Section title="Checkbox">
      <State name="Unchecked / checked">
        <div className="flex flex-col gap-(--space-1)">
          <Checkbox checked={single} onChange={setSingle} label="Send me a copy" />
          <Checkbox checked onChange={() => {}} label="Always checked" />
        </div>
      </State>
      <State name="Group with indeterminate toggle">
        <div className="flex flex-col gap-(--space-1)">
          <Checkbox
            checked={all}
            indeterminate={some && !all}
            onChange={(next) => setDays(Object.fromEntries(Object.keys(days).map((d) => [d, next])))}
            label="All weekdays"
          />
          <div className="flex flex-col gap-(--space-1) pl-(--space-3)">
            {Object.keys(days).map((d) => (
              <Checkbox key={d} checked={days[d]} onChange={(next) => setDays({ ...days, [d]: next })} label={d} />
            ))}
          </div>
        </div>
      </State>
      <State name="Disabled">
        <div className="flex flex-col gap-(--space-1)">
          <Checkbox checked={false} onChange={() => {}} disabled label="Disabled, off" />
          <Checkbox checked onChange={() => {}} disabled label="Disabled, on" />
        </div>
      </State>
      <State name="Small, wrapping label">
        <Checkbox checked={false} onChange={() => {}} size="sm" align="start" label="I confirm these hours are accurate for the whole bi-monthly cut-off period, including overtime." />
      </State>
    </Section>
  );
}

function RadioSection() {
  const [freq, setFreq] = useState<string | null>('semi');
  const [shift, setShift] = useState<string | null>(null);
  const opts = [
    { value: 'weekly', label: 'Weekly' },
    { value: 'semi', label: 'Twice a month', description: '1st to 15th and 16th to month end.' },
    { value: 'monthly', label: 'Monthly' },
  ];
  return (
    <Section title="Radio">
      <State name="Stacked, checked (arrow keys move)">
        <RadioGroup label="Pay frequency" options={opts} value={freq} onChange={setFreq} hint="Applies from the next cut-off." />
      </State>
      <State name="Inline, nothing selected">
        <RadioGroup
          label="Shift"
          orientation="inline"
          options={[
            { value: 'am', label: 'Morning' },
            { value: 'pm', label: 'Afternoon' },
            { value: 'night', label: 'Night', disabled: true },
          ]}
          value={shift}
          onChange={setShift}
        />
      </State>
      <State name="Error">
        <RadioGroup label="Leave type" options={[{ value: 'vl', label: 'Vacation' }, { value: 'sl', label: 'Sick' }]} value={null} onChange={() => {}} error="Choose a leave type." required />
      </State>
      <State name="Disabled">
        <RadioGroup label="Pay frequency" options={opts} value="monthly" onChange={() => {}} disabled />
      </State>
    </Section>
  );
}

function SwitchSection() {
  const [a, setA] = useState(false);
  const [b, setB] = useState(true);
  return (
    <Section title="Switch">
      <State name="Off / on">
        <div className="flex flex-col gap-(--space-2)">
          <Switch checked={a} onChange={setA} label="Email reminders" />
          <Switch checked={b} onChange={setB} label="Show weekends" description="Adds Saturday and Sunday to the timesheet." />
        </div>
      </State>
      <State name="Disabled off / on">
        <div className="flex flex-col gap-(--space-2)">
          <Switch checked={false} onChange={() => {}} disabled label="Locked off" />
          <Switch checked onChange={() => {}} disabled label="Locked on" />
        </div>
      </State>
      <State name="Label first, no visible label">
        <div className="flex flex-col gap-(--space-2)">
          <Switch checked={a} onChange={setA} labelPosition="start" label="Dark charts" />
          <Switch checked={b} onChange={setB} aria-label="Compact rows" />
        </div>
      </State>
    </Section>
  );
}

function SelectorSection() {
  const [person, setPerson] = useState<string | null>('carla');
  const [tags, setTags] = useState<string[]>(['ana', 'ella']);
  const [time, setTime] = useState('17:30');
  const [badTime, setBadTime] = useState('25:00');
  const [day, setDay] = useState<string | null>('2026-08-20');
  const [range, setRange] = useState<DateRange | null>({ start: '2026-08-16', end: '2026-08-31' });
  return (
    <Section title="Selectors (ported from Timer)">
      <State name="Single select, long label">
        <SingleSelectDropdown label="Approver" options={PEOPLE} value={person} onChange={setPerson} />
      </State>
      <State name="Single select, searchable, invalid">
        <SingleSelectDropdown label="Assignee" options={PEOPLE} value={null} onChange={setPerson} searchable invalid placeholder="Choose a person" />
      </State>
      <State name="Single select, disabled">
        <SingleSelectDropdown label="Team" options={PEOPLE} value="ana" disabled />
      </State>
      <State name="Multi select, chips, bulk actions">
        <MultiSelectDropdown label="People" options={PEOPLE} value={tags} onChange={setTags} triggerDisplay="chips" bulkActions searchable />
      </State>
      <State name="Time field">
        <TimeField label="Clock out" value={time} onChange={setTime} />
      </State>
      <State name="Time field, invalid">
        <TimeField label="Clock in" value={badTime} onChange={setBadTime} invalid />
      </State>
      <State name="Date field, single">
        <DateField mode="single" label="Date" value={day} onChange={setDay} align="start" />
      </State>
      <State name="Date field, range">
        <DateField mode="range" label="Period" value={range} onChange={setRange} align="start" />
      </State>
    </Section>
  );
}

export default function UiPreviewPage() {
  return (
    <main className="mx-auto flex w-full max-w-(--breakpoint-wide) flex-col gap-(--space-3) px-(--space-2) py-(--space-4) md:px-(--space-4)">
      <header className="flex flex-col gap-(--space-1)">
        <h1 className="text-title">@polaris/ui preview</h1>
        <p className="text-(length:--font-size-body-sm) text-fg-muted">
          Dev only. Every component in every design_spec §9 state. Switch the OS or browser to dark mode to check dark tokens.
        </p>
      </header>
      <InputSection />
      <TextareaSection />
      <CheckboxSection />
      <RadioSection />
      <SwitchSection />
      <SelectorSection />
    </main>
  );
}
