import { content } from '../../content/bundle.ts';
import { daysBetween, formatDate } from '../../domain/dates.ts';
import { saveProfile } from '../../db/repo.ts';
import { useSnapshot } from '../../state/ProfileContext.tsx';
import { Badge, Button, ButtonLink, Card, PageHeader, pct, ProgressBar, Stat } from '../../ui/kit.tsx';
import type { PlanStatus } from '../../domain/planner/planner.ts';

const STATUS: Record<PlanStatus, { label: string; tone: 'good' | 'warn' | 'bad' }> = {
  'on-track': { label: 'On track', tone: 'good' },
  tight: { label: 'Tight: ready inside your window', tone: 'warn' },
  behind: { label: 'Behind', tone: 'bad' },
};

export function Dashboard() {
  const s = useSnapshot();
  if (!s) return <p className="text-muted">Loading…</p>;
  const { profile, snap } = s;
  const { plan, prediction, today } = snap;
  const exam = profile.exam;
  const todayPlan = plan.days.find((d) => d.date === today);
  const status = STATUS[plan.status];
  const hasDiagnostic = content.questions.some((q) => q.pool === 'diagnostic');

  const countdown =
    exam.mode === 'fixed'
      ? { value: `${daysBetween(today, exam.date)} days`, hint: `Exam on ${formatDate(exam.date)}` }
      : {
          value: `${Math.max(0, daysBetween(today, exam.earliest))}–${daysBetween(today, exam.latest)} days`,
          hint: `Window ${formatDate(exam.earliest, { day: 'numeric', month: 'short' })} → ${formatDate(exam.latest)}`,
        };

  return (
    <>
      <PageHeader title={`Hi ${profile.name}`} subtitle={todayPlan ? `Today · ${formatDate(today, { weekday: 'long', day: 'numeric', month: 'long' })}` : undefined} />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card>
          <Stat label="Exam" value={countdown.value} hint={countdown.hint} />
        </Card>
        <Card>
          <Stat label="Predicted" value={pct(prediction.score)} hint={`${pct(prediction.low)}–${pct(prediction.high)} range`} />
        </Card>
        <Card>
          <Stat label="Due reviews" value={snap.dueCards + snap.dueQuestions.length} hint={`${snap.dueCards} cards · ${snap.dueQuestions.length} questions`} />
        </Card>
        <Card>
          <Stat label="Streak" value={`${snap.streak} d`} hint={snap.streak ? 'Keep it going' : 'Study today to start one'} />
        </Card>
      </div>

      <Card className="mb-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-bold">Plan status</h2>
          <Badge tone={status.tone}>{status.label}</Badge>
        </div>
        <p className="mt-2">
          {plan.readyDate ? (
            <>
              At your pace you will be exam-ready on <strong>{formatDate(plan.readyDate)}</strong>
              {exam.mode === 'window' && <> (target: {formatDate(exam.earliest)})</>}.
            </>
          ) : (
            'At this pace the plan does not finish. Increase your weekly hours.'
          )}
        </p>
        {plan.status !== 'on-track' && snap.tradeOff.normal !== null && (
          <p className="mt-1 text-sm text-muted">
            To be ready by {formatDate(snap.tradeOff.target)} you need about <strong>{snap.tradeOff.normal} h/week</strong>
            {snap.tradeOff.compressed !== null && (
              <>
                , or {snap.tradeOff.compressed} h/week with a compressed finish (3–4 days of consolidation, 3 full mocks minimum)
              </>
            )}
            .
          </p>
        )}
      </Card>

      <Card className="mb-4">
        <h2 className="mb-3 text-lg font-bold">Today</h2>
        {!todayPlan || todayPlan.items.length === 0 ? (
          <p className="text-muted">Nothing planned today{todayPlan?.capacity === 0 ? ' (rest day)' : ''}. Clear your due reviews if you have a moment.</p>
        ) : (
          <ul className="space-y-3">
            {todayPlan.items.map((item, i) => (
              <li key={i} className="rounded-lg border border-line p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold">{item.label}</span>
                  {item.hours > 0 && <span className="text-sm text-muted">≈ {Math.round(item.hours * 60)} min</span>}
                </div>
                {item.routine && item.routine.length > 0 && <p className="mt-1 text-sm text-muted">{item.routine.join(' · ')}</p>}
                <div className="mt-2 flex flex-wrap gap-2">
                  {item.kind === 'module' && item.module !== undefined && <ButtonLink to={`/modules/${item.module}`}>Open M{item.module}</ButtonLink>}
                  {item.kind === 'diagnostic' && hasDiagnostic && <ButtonLink to="/quiz/run?mode=diagnostic">Start the diagnostic</ButtonLink>}
                  {(item.kind === 'diagnostic' || item.kind === 'setup') && (
                    <Button variant="secondary" onClick={() => void saveProfile({ ...profile, phase0DoneAt: Date.now() })}>
                      Mark setup done, start Phase 1
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          <ButtonLink to="/cards" variant={snap.dueCards ? 'primary' : 'secondary'}>
            Flashcards{snap.dueCards ? ` (${snap.dueCards} due)` : ''}
          </ButtonLink>
          {snap.dueQuestions.length > 0 && (
            <ButtonLink to="/quiz/run?mode=review" variant="secondary">
              {snap.dueQuestions.length} missed question{snap.dueQuestions.length > 1 ? 's' : ''} due
            </ButtonLink>
          )}
        </div>
      </Card>

      <Card>
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-bold">Readiness by domain</h2>
          <span className="text-sm text-muted">Weighted by the exam blueprint · target ≥ 85% on mocks</span>
        </div>
        <ul className="space-y-3">
          {prediction.domains.map((d) => (
            <li key={d.domain}>
              <div className="mb-1 flex justify-between gap-2 text-sm">
                <span className="min-w-0 truncate">
                  <strong>{d.domain}</strong> {d.name} <span className="text-muted">· {pct(d.weight)}</span>
                </span>
                <span className="shrink-0 tabular-nums text-muted">{d.answered ? `${pct(d.estimate)} · ${d.answered} q` : 'no data'}</span>
              </div>
              <ProgressBar value={d.estimate} tone={d.answered === 0 ? 'warn' : d.estimate >= 0.75 ? 'good' : d.estimate >= 0.5 ? 'accent' : 'bad'} label={`${d.name} readiness`} />
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm text-muted">
          Estimates start at 25% (random guessing) and move with your latest answer to each question. Confidently-wrong rate: {pct(prediction.confidentlyWrongRate)} (gate: under 5%).
        </p>
      </Card>
    </>
  );
}
