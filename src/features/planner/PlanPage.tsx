import { useState } from 'react';
import { addDays, formatDate } from '../../domain/dates.ts';
import { saveProfile } from '../../db/repo.ts';
import type { Phase, WeekPlan } from '../../domain/planner/planner.ts';
import { useSnapshot } from '../../state/ProfileContext.tsx';
import { Badge, ButtonLink, Card, inputClass, PageHeader } from '../../ui/kit.tsx';

const PHASE_LABEL: Record<string, string> = { '0': 'Setup', '1': 'Learn', '2': 'Consolidate', '3': 'Simulate', buffer: 'Buffer' };
const PHASE_TONE: Record<string, 'neutral' | 'accent' | 'good' | 'warn'> = { '0': 'neutral', '1': 'accent', '2': 'good', '3': 'warn', buffer: 'neutral' };

function PhaseBadges({ phases }: { phases: Phase[] }) {
  return (
    <span className="flex flex-wrap gap-1">
      {phases.map((p) => (
        <Badge key={String(p)} tone={PHASE_TONE[String(p)]}>
          {PHASE_LABEL[String(p)]}
        </Badge>
      ))}
    </span>
  );
}

export function PlanPage() {
  const s = useSnapshot();
  const [open, setOpen] = useState<string | null>(null);
  if (!s) return <p className="text-muted">Loading…</p>;
  const { profile, snap } = s;
  const { plan, tradeOff } = snap;

  async function setOverride(week: WeekPlan, value: string) {
    const overrides = { ...profile.hourOverrides };
    const n = Number(value);
    if (value === '' || Number.isNaN(n) || n === profile.hoursPerWeek) delete overrides[week.start];
    else overrides[week.start] = Math.max(0, Math.min(80, n));
    await saveProfile({ ...profile, hourOverrides: overrides });
  }

  return (
    <>
      <PageHeader
        title="Study plan"
        subtitle={`${profile.hoursPerWeek} h/week baseline · re-plans automatically as you progress`}
        actions={
          <ButtonLink to="/settings" variant="secondary">
            Edit exam date & hours
          </ButtonLink>
        }
      />

      <Card className="mb-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-muted">Ready on</div>
            <div className="text-xl font-bold">{plan.readyDate ? formatDate(plan.readyDate) : '—'}</div>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-muted">Phase 1 ends</div>
            <div className="text-xl font-bold">{plan.phase1End ? formatDate(plan.phase1End) : '—'}</div>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-muted">Full mocks planned</div>
            <div className="text-xl font-bold">{plan.mocksPlanned}</div>
          </div>
        </div>
        {plan.warnings.map((w) => (
          <p key={w} className="mt-3 rounded-lg bg-amber-soft p-3 text-sm text-amber">
            {w}
          </p>
        ))}
        {tradeOff.normal !== null && (
          <div className="mt-3 rounded-lg border border-line p-3 text-sm">
            <strong>To be ready by {formatDate(tradeOff.target)}:</strong> about {tradeOff.normal} h/week with the full plan
            {tradeOff.compressed !== null && <>, or {tradeOff.compressed} h/week if you shrink consolidation to 3–4 days and sit 3 full mocks (never fewer)</>}. You
            currently plan {profile.hoursPerWeek} h/week.
          </div>
        )}
        {tradeOff.normal === null && <p className="mt-3 text-sm text-muted">Being ready by {formatDate(tradeOff.target)} would need more than 60 h/week.</p>}
      </Card>

      <ol className="space-y-2">
        {plan.weeks.map((w) => {
          const isOpen = open === w.start;
          const days = plan.days.filter((d) => d.date >= w.start && d.date <= addDays(w.start, 6));
          const override = profile.hourOverrides[w.start];
          return (
            <li key={w.start}>
              <Card className="!p-0">
                <button
                  type="button"
                  className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 p-3 text-left sm:p-4"
                  aria-expanded={isOpen}
                  onClick={() => setOpen(isOpen ? null : w.start)}
                >
                  <span className="w-10 shrink-0 font-bold text-chestnut">W{w.index}</span>
                  <span className="w-32 shrink-0 text-sm text-muted">{formatDate(w.start, { day: 'numeric', month: 'short' })} →</span>
                  <span className="min-w-0 flex-1 font-semibold">{w.label || 'Rest'}</span>
                  <PhaseBadges phases={w.phases} />
                  <span className="w-14 shrink-0 text-right text-sm tabular-nums text-muted">{w.hours.toFixed(1)} h</span>
                </button>
                {isOpen && (
                  <div className="border-t border-line p-3 sm:p-4">
                    <label className="mb-3 flex flex-wrap items-center gap-2 text-sm">
                      <span className="font-semibold">Hours this week</span>
                      <input
                        type="number"
                        min={0}
                        max={80}
                        step={0.5}
                        defaultValue={override ?? profile.hoursPerWeek}
                        onBlur={(e) => void setOverride(w, e.target.value)}
                        className={`${inputClass} !w-24`}
                      />
                      {override !== undefined && <Badge tone="accent">override</Badge>}
                    </label>
                    <ul className="space-y-2">
                      {days.map((d) => (
                        <li key={d.date} className="text-sm">
                          <span className="font-semibold">{formatDate(d.date, { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                          <span className="text-muted"> · {Math.round(d.capacity * 60)} min</span>
                          <ul className="ml-4 list-disc">
                            {d.items.map((i, k) => (
                              <li key={k}>
                                {i.label}
                                {i.hours > 0 && <span className="text-muted"> ({Math.round(i.hours * 60)} min)</span>}
                              </li>
                            ))}
                          </ul>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </Card>
            </li>
          );
        })}
      </ol>
    </>
  );
}
