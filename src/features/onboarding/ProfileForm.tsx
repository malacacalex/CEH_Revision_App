import { useState, type FormEvent } from 'react';
import { addDays, toISODate } from '../../domain/dates.ts';
import type { Profile } from '../../schemas/progress.ts';
import { Button, Field, inputClass } from '../../ui/kit.tsx';

export type ProfileDraft = Omit<Profile, 'id' | 'createdAt' | 'disclaimerAcceptedAt' | 'phase0DoneAt'>;

export function defaultDraft(): ProfileDraft {
  const today = toISODate(new Date());
  return {
    name: '',
    level: 'beginner',
    exam: { mode: 'window', earliest: addDays(today, 7 * 12), latest: addDays(today, 7 * 17) },
    hoursPerWeek: 10,
    busyPeriods: [],
    hourOverrides: {},
    ownsCourseware: false,
    hasILabs: false,
    foundationsSkipped: false,
  };
}

function validate(d: ProfileDraft): string | null {
  if (!d.name.trim()) return 'Please enter a profile name.';
  if (d.exam.mode === 'fixed' && !d.exam.date) return 'Please enter your exam date.';
  if (d.exam.mode === 'window') {
    if (!d.exam.earliest || !d.exam.latest) return 'Please enter both dates of your exam window.';
    if (d.exam.earliest > d.exam.latest) return 'The earliest date must be before the latest date.';
  }
  if (!(d.hoursPerWeek >= 1 && d.hoursPerWeek <= 60)) return 'Weekly hours must be between 1 and 60.';
  for (const b of d.busyPeriods) {
    if (!b.start || !b.end) return 'Every busy period needs a start and an end date.';
    if (b.start > b.end) return 'A busy period ends before it starts.';
  }
  return null;
}

function Choice({ checked, onChange, title, text, name }: { checked: boolean; onChange: () => void; title: string; text: string; name: string }) {
  return (
    <label className={`flex cursor-pointer gap-3 rounded-lg border p-3 ${checked ? 'border-chestnut bg-chestnut-soft' : 'border-line bg-surface'}`}>
      <input type="radio" name={name} checked={checked} onChange={onChange} className="mt-1 accent-(--chestnut)" />
      <span>
        <span className="block font-semibold">{title}</span>
        <span className="block text-sm text-muted">{text}</span>
      </span>
    </label>
  );
}

function YesNo({ label, hint, value, onChange }: { label: string; hint: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <fieldset>
      <legend className="mb-1 text-sm font-semibold">{label}</legend>
      <div className="flex gap-2">
        {[true, false].map((v) => (
          <label key={String(v)} className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-4 ${value === v ? 'border-chestnut bg-chestnut-soft' : 'border-line bg-surface'}`}>
            <input type="radio" checked={value === v} onChange={() => onChange(v)} className="accent-(--chestnut)" />
            {v ? 'Yes' : 'No'}
          </label>
        ))}
      </div>
      <p className="mt-1 text-sm text-muted">{hint}</p>
    </fieldset>
  );
}

export function ProfileForm({
  initial,
  submitLabel,
  requireDisclaimer,
  onSubmit,
}: {
  initial: ProfileDraft;
  submitLabel: string;
  requireDisclaimer?: boolean;
  onSubmit: (d: ProfileDraft) => Promise<void> | void;
}) {
  const [d, setD] = useState<ProfileDraft>(initial);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (patch: Partial<ProfileDraft>) => setD((cur) => ({ ...cur, ...patch }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    const err = validate(d) ?? (requireDisclaimer && !accepted ? 'Please confirm you have read the disclaimer.' : null);
    setError(err);
    if (!err) await onSubmit({ ...d, name: d.name.trim() });
  }

  const exam = d.exam;
  return (
    <form onSubmit={submit} className="space-y-6" noValidate>
      <Field label="Profile name" hint="Several people can share this device: each gets their own profile.">
        <input className={inputClass} value={d.name} onChange={(e) => set({ name: e.target.value })} maxLength={60} autoComplete="nickname" />
      </Field>

      <fieldset className="space-y-2">
        <legend className="mb-1 text-sm font-semibold">Your level in ethical hacking</legend>
        <Choice
          name="level"
          checked={d.level === 'beginner'}
          onChange={() => set({ level: 'beginner', foundationsSkipped: false })}
          title="Beginner"
          text="Starts with M0 Foundations (networking, OS, security basics, lab setup). Notes open with a plain-English layer."
        />
        <Choice
          name="level"
          checked={d.level === 'intermediate'}
          onChange={() => set({ level: 'intermediate' })}
          title="Intermediate"
          text="You can skip M0 by passing its 20-question check."
        />
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="mb-1 text-sm font-semibold">Exam date</legend>
        <div className="flex flex-wrap gap-2">
          <Choice name="exam" checked={exam.mode === 'fixed'} onChange={() => set({ exam: { mode: 'fixed', date: exam.mode === 'window' ? exam.earliest : exam.date } })} title="I have a date" text="The plan targets that day." />
          <Choice
            name="exam"
            checked={exam.mode === 'window'}
            onChange={() => set({ exam: { mode: 'window', earliest: exam.mode === 'fixed' ? exam.date : exam.earliest, latest: exam.mode === 'fixed' ? addDays(exam.date, 35) : exam.latest } })}
            title="Not fixed yet"
            text="Give a window; the plan aims to be ready by its start."
          />
        </div>
        {exam.mode === 'fixed' ? (
          <Field label="Exam date">
            <input type="date" className={inputClass} value={exam.date} onChange={(e) => set({ exam: { mode: 'fixed', date: e.target.value } })} />
          </Field>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Earliest date">
              <input type="date" className={inputClass} value={exam.earliest} onChange={(e) => set({ exam: { ...exam, earliest: e.target.value } })} />
            </Field>
            <Field label="Latest date">
              <input type="date" className={inputClass} value={exam.latest} onChange={(e) => set({ exam: { ...exam, latest: e.target.value } })} />
            </Field>
          </div>
        )}
      </fieldset>

      <Field label={`Study hours per week: ${d.hoursPerWeek} h`} hint="A baseline. You can override single weeks later in the Plan.">
        <input
          type="range"
          min={2}
          max={30}
          step={0.5}
          value={d.hoursPerWeek}
          onChange={(e) => set({ hoursPerWeek: Number(e.target.value) })}
          className="w-full accent-(--chestnut)"
          aria-valuetext={`${d.hoursPerWeek} hours per week`}
        />
      </Field>

      <fieldset>
        <legend className="mb-1 text-sm font-semibold">Busy periods (reduced study load)</legend>
        <div className="space-y-2">
          {d.busyPeriods.map((b, i) => (
            <div key={i} className="grid grid-cols-2 items-end gap-2 rounded-lg border border-line p-2 sm:grid-cols-[1fr_1fr_auto_auto]">
              <Field label="From">
                <input type="date" className={inputClass} value={b.start} onChange={(e) => set({ busyPeriods: d.busyPeriods.map((x, j) => (j === i ? { ...x, start: e.target.value } : x)) })} />
              </Field>
              <Field label="To">
                <input type="date" className={inputClass} value={b.end} onChange={(e) => set({ busyPeriods: d.busyPeriods.map((x, j) => (j === i ? { ...x, end: e.target.value } : x)) })} />
              </Field>
              <Field label="Load">
                <select className={inputClass} value={b.factor} onChange={(e) => set({ busyPeriods: d.busyPeriods.map((x, j) => (j === i ? { ...x, factor: Number(e.target.value) } : x)) })}>
                  <option value={0}>None</option>
                  <option value={0.25}>25%</option>
                  <option value={0.5}>50%</option>
                  <option value={0.75}>75%</option>
                </select>
              </Field>
              <Button variant="ghost" onClick={() => set({ busyPeriods: d.busyPeriods.filter((_, j) => j !== i) })} aria-label="Remove busy period">
                Remove
              </Button>
            </div>
          ))}
          <Button
            variant="secondary"
            onClick={() => {
              const t = toISODate(new Date());
              set({ busyPeriods: [...d.busyPeriods, { start: t, end: addDays(t, 13), factor: 0.5 }] });
            }}
          >
            + Add a busy period
          </Button>
        </div>
      </fieldset>

      <YesNo
        label="Do you own the official CEH v13 courseware?"
        hint="If yes, each module shows a Reading Map (what to read, skim or skip). The app never includes courseware content."
        value={d.ownsCourseware}
        onChange={(v) => set({ ownsCourseware: v })}
      />
      <YesNo label="Do you have access to the official iLabs?" hint="If not, labs point to free alternatives only." value={d.hasILabs} onChange={(v) => set({ hasILabs: v })} />

      {requireDisclaimer && (
        <label className="flex cursor-pointer gap-3 rounded-lg border border-amber/50 bg-amber-soft p-3">
          <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="mt-1 h-5 w-5 accent-(--chestnut)" />
          <span className="text-sm">
            I understand that this is an <strong>unofficial</strong> study app, not affiliated with or endorsed by EC-Council, and that its questions are original
            practice items, not real exam questions.
          </span>
        </label>
      )}

      {error && (
        <p role="alert" className="rounded-lg bg-burgundy-soft p-3 font-semibold text-burgundy">
          {error}
        </p>
      )}
      <Button type="submit" className="w-full sm:w-auto">
        {submitLabel}
      </Button>
    </form>
  );
}
