import { useState, type FormEvent } from 'react';
import { saveProfile } from '../../db/repo.ts';
import { toISODate } from '../../domain/dates.ts';
import type { ReadinessItem } from '../../domain/gates.ts';
import { useSnapshot } from '../../state/ProfileContext.tsx';
import { Badge, Button, ButtonLink, Card, inputClass, pct } from '../../ui/kit.tsx';

function Checklist({ items }: { items: ReadinessItem[] }) {
  return (
    <ul className="space-y-2">
      {items.map((i) => (
        <li key={i.key} className="flex items-start gap-2">
          <span aria-hidden className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-xs font-bold ${i.done ? 'bg-olive text-paper' : 'border border-line text-muted'}`}>
            {i.done ? '✓' : ''}
          </span>
          <span className="min-w-0">
            <span className="font-semibold">{i.label}</span>
            <span className="sr-only">{i.done ? ' (met)' : ' (not yet)'}</span>
            <span className="block text-sm text-muted">{i.detail}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

/** The two go/no-go checks of the method (§5.5): ready for mock phase, then ready to book the exam. */
export function ReadinessGates() {
  const s = useSnapshot();
  const [source, setSource] = useState('');
  const [score, setScore] = useState('');
  if (!s) return null;
  const { profile, snap } = s;
  const external = profile.externalPractice ?? [];
  const phase3 = snap.phase3Gate.every((i) => i.done);
  const ready = snap.examReadyGate.every((i) => i.done);

  const add = (e: FormEvent) => {
    e.preventDefault();
    const n = Number(score);
    if (!source.trim() || !Number.isFinite(n) || n < 0 || n > 100) return;
    void saveProfile({
      ...profile,
      externalPractice: [...external, { date: toISODate(new Date()), source: source.trim().slice(0, 80), score: n / 100 }],
    });
    setSource('');
    setScore('');
  };
  const remove = (i: number) => void saveProfile({ ...profile, externalPractice: external.filter((_, j) => j !== i) });

  return (
    <Card className="mt-4">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-bold">Go / no-go</h2>
        <ButtonLink to="/analytics" variant="ghost">
          Analytics
        </ButtonLink>
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <h3 className="mb-2 flex items-center gap-2 font-semibold">
            Ready for full mocks <Badge tone={phase3 ? 'good' : 'neutral'}>{phase3 ? 'yes' : 'not yet'}</Badge>
          </h3>
          <Checklist items={snap.phase3Gate} />
        </div>
        <div>
          <h3 className="mb-2 flex items-center gap-2 font-semibold">
            Ready to sit the exam <Badge tone={ready ? 'good' : 'neutral'}>{ready ? 'yes' : 'not yet'}</Badge>
          </h3>
          <Checklist items={snap.examReadyGate} />
        </div>
      </div>
      <details className="mt-4 border-t border-line pt-3">
        <summary className="cursor-pointer font-semibold">External practice exam scores ({external.length})</summary>
        <p className="mt-2 text-sm text-muted">
          A score from a practice exam outside this app (for example the official practice test, if you buy it) is the last check. Stored on this device only.
        </p>
        {external.length > 0 && (
          <ul className="mt-2 space-y-1 text-sm">
            {external.map((x, i) => (
              <li key={i} className="flex items-center justify-between gap-2">
                <span className="min-w-0 truncate">
                  {x.date} · {x.source}
                </span>
                <span className="flex items-center gap-2">
                  <strong className="tabular-nums">{pct(x.score)}</strong>
                  <Button variant="ghost" onClick={() => remove(i)} aria-label={`Remove ${x.source} ${x.date}`}>
                    Remove
                  </Button>
                </span>
              </li>
            ))}
          </ul>
        )}
        <form onSubmit={add} className="mt-3 flex flex-wrap items-end gap-2">
          <label className="min-w-0 flex-1 text-sm">
            <span className="mb-1 block font-semibold">Source</span>
            <input className={inputClass} value={source} onChange={(e) => setSource(e.target.value)} maxLength={80} placeholder="Practice exam name" required />
          </label>
          <label className="w-24 text-sm">
            <span className="mb-1 block font-semibold">Score %</span>
            <input className={inputClass} value={score} onChange={(e) => setScore(e.target.value)} inputMode="decimal" type="number" min={0} max={100} step="any" required />
          </label>
          <Button type="submit">Add</Button>
        </form>
      </details>
    </Card>
  );
}
