import { useState, type ReactNode } from 'react';
import { content } from '../../content/bundle.ts';
import {
  accuracyBreakdown,
  attemptsSince,
  calibration,
  CONFIDENTLY_WRONG_GATE,
  MOCK_DOMAIN_FLOOR,
  MOCK_TARGET,
  mockHistory,
  periodStart,
  timeBreakdown,
  weeklyTrend,
  type AccuracyRow,
  type Calibration,
  type Difficulty,
  type MockMode,
  type MockResult,
  type TimeStats,
  type WeekPoint,
} from '../../domain/analytics.ts';
import { formatDate, toISODate } from '../../domain/dates.ts';
import type { QuestionType } from '../../schemas/content.ts';
import { useSnapshot } from '../../state/ProfileContext.tsx';
import { Badge, ButtonLink, Card, Empty, PageHeader, pct, Stat } from '../../ui/kit.tsx';

type Period = 'all' | '30d';
const TAG_LIMIT = 20;

const TYPE_LABELS: Record<QuestionType, string> = {
  recall: 'Recall',
  scenario: 'Scenario',
  tool: 'Tool',
  'command-output': 'Command output',
  'ec-council-term': 'EC-Council term',
};
const DIFFICULTY_LABELS: Record<Difficulty, string> = { 1: 'Easy', 2: 'Medium', 3: 'Hard' };
const CONFIDENCE_LABELS = { sure: 'Sure', unsure: 'Unsure', guess: 'Guess' } as const;
const MOCK_LABELS: Record<MockMode, string> = { 'half-mock': 'Half mock', 'full-mock': 'Full mock' };

/** Text colour for an accuracy: olive at the mock target, burgundy under the per-domain floor. */
const accuracyTone = (x: number) => (x >= MOCK_TARGET ? 'text-olive' : x < MOCK_DOMAIN_FLOOR ? 'text-burgundy' : '');
const seconds = (s: number) => (s < 60 ? `${Math.round(s)} s` : `${Math.floor(s / 60)} min ${String(Math.round(s % 60)).padStart(2, '0')} s`);
const day = (t: number) => formatDate(toISODate(new Date(t)));

export function AnalyticsPage() {
  const s = useSnapshot();
  const [period, setPeriod] = useState<Period>('all');
  const [allTags, setAllTags] = useState(false);
  if (!s) return <p className="text-muted">Loading…</p>;
  const { data, snap } = s;

  if (data.attempts.length === 0) {
    return (
      <>
        <PageHeader title="Analytics" subtitle="Accuracy, speed, calibration and mock results from your quiz answers." />
        <Empty>
          No answers yet. Take a quiz and your analytics show up here.
          <span className="mt-3 flex justify-center">
            <ButtonLink to="/quiz">Go to quizzes</ButtonLink>
          </span>
        </Empty>
      </>
    );
  }

  const questions = content.questionById;
  const inPeriod = period === 'all' ? data.attempts : attemptsSince(data.attempts, periodStart(snap.today, 30));
  const acc = accuracyBreakdown(inPeriod, questions);
  const time = timeBreakdown(inPeriod, questions);
  const calib = calibration(inPeriod);
  const trend = weeklyTrend(data.attempts, snap.today);
  const mocks = mockHistory(data.sessions, data.attempts, questions);
  const tags = allTags ? acc.tags : acc.tags.slice(0, TAG_LIMIT);
  const cwOk = calib.confidentlyWrongRate < CONFIDENTLY_WRONG_GATE;

  return (
    <>
      <PageHeader
        title="Analytics"
        subtitle="Every answer counts here, re-drills included. The dashboard prediction uses only your latest answer to each question."
        actions={
          <div role="group" aria-label="Period" className="flex gap-1 rounded-full border border-line p-1">
            {(['all', '30d'] as const).map((p) => (
              <button
                key={p}
                type="button"
                aria-pressed={period === p}
                onClick={() => setPeriod(p)}
                className={`min-h-9 rounded-full px-3 text-sm ${period === p ? 'bg-chestnut-soft font-semibold text-chestnut' : 'text-muted hover:text-ink'}`}
              >
                {p === 'all' ? 'All time' : 'Last 30 days'}
              </button>
            ))}
          </div>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card>
          <Stat label="Answered" value={acc.answered} hint={period === 'all' ? 'all time' : 'last 30 days'} />
        </Card>
        <Card>
          <Stat label="Accuracy" value={acc.accuracy === null ? '–' : pct(acc.accuracy)} hint={`${acc.correct} correct`} />
        </Card>
        <Card>
          <Stat label="Median time" value={time.overall ? seconds(time.overall.medianSec) : '–'} hint="per question" />
        </Card>
        <Card>
          <Stat
            label="Confidently wrong"
            value={
              <span className={calib.answered ? (cwOk ? 'text-olive' : 'text-burgundy') : ''}>
                {calib.answered ? pct(calib.confidentlyWrongRate) : '–'}
              </span>
            }
            hint={`gate: under ${pct(CONFIDENTLY_WRONG_GATE)}`}
          />
        </Card>
      </div>

      {acc.answered === 0 ? (
        <Empty>No answers in the last 30 days. Switch to “All time” to see your earlier work.</Empty>
      ) : (
        <>
          <Card className="mb-4">
            <SectionTitle title="Accuracy" note={`olive ≥ ${pct(MOCK_TARGET)} (mock target) · burgundy < ${pct(MOCK_DOMAIN_FLOOR)}`} />
            <div className="grid gap-5 lg:grid-cols-2">
              <AccuracyTable
                caption="By module"
                rows={acc.modules}
                label={(m) => (
                  <>
                    <strong>M{m}</strong> {content.module(m)?.meta.title}
                  </>
                )}
              />
              <AccuracyTable
                caption="By domain"
                rows={acc.domains}
                label={(d) => (
                  <>
                    <strong>{d}</strong> {content.domainName(d)}
                  </>
                )}
              />
              <AccuracyTable caption="By difficulty" rows={acc.difficulty} label={(d) => DIFFICULTY_LABELS[d]} />
              <AccuracyTable caption="By question type" rows={acc.types} label={(t) => TYPE_LABELS[t]} />
            </div>
            <div className="mt-5">
              <AccuracyTable caption="By tag" rows={tags} label={(t) => t} note="most answered first, then weakest" />
              {acc.tags.length > TAG_LIMIT && (
                <button
                  type="button"
                  onClick={() => setAllTags(!allTags)}
                  className="mt-2 min-h-9 text-sm font-semibold text-chestnut hover:underline"
                >
                  {allTags ? `Show the top ${TAG_LIMIT}` : `Show all ${acc.tags.length} tags`}
                </button>
              )}
            </div>
          </Card>

          <div className="mb-4 grid gap-4 lg:grid-cols-2">
            <Card>
              <SectionTitle title="Time per question" note="median · mean (each time capped at 10 min)" />
              <TimeTable overall={time.overall} types={time.types} difficulty={time.difficulty} />
            </Card>
            <Card>
              <SectionTitle title="Calibration" note="how often you are right at each confidence rating" />
              <CalibrationChart calib={calib} />
              <ul className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
                {calib.points.map((p) => (
                  <li key={p.confidence} className="rounded-lg bg-surface-2 p-2">
                    <div className="font-semibold">{CONFIDENCE_LABELS[p.confidence]}</div>
                    <div className={`tabular-nums ${p.accuracy === null ? 'text-muted' : ''}`}>{p.accuracy === null ? '–' : pct(p.accuracy)}</div>
                    <div className="text-xs text-muted">
                      {p.answered} answer{p.answered === 1 ? '' : 's'} · ideal {pct(p.ideal)}
                    </div>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-sm">
                Confidently wrong: <strong className={cwOk ? 'text-olive' : 'text-burgundy'}>{pct(calib.confidentlyWrongRate)}</strong> of answers
                {` (${calib.confidentlyWrong} of ${calib.answered}) `}were wrong while rated “sure”.{' '}
                <Badge tone={cwOk ? 'good' : 'bad'}>
                  {cwOk ? `under the ${pct(CONFIDENTLY_WRONG_GATE)} gate` : `gate: under ${pct(CONFIDENTLY_WRONG_GATE)}`}
                </Badge>
              </p>
            </Card>
          </div>
        </>
      )}

      <Card className="mb-4">
        <SectionTitle title="Weekly trend" note="last 12 weeks, all answers, weeks start on Monday" />
        <TrendChart weeks={trend} />
      </Card>

      <Card>
        <SectionTitle title="Mock history" note={`target ≥ ${pct(MOCK_TARGET)} · domains under ${pct(MOCK_DOMAIN_FLOOR)} flagged`} />
        {mocks.length === 0 ? (
          <Empty>No finished mock exam yet. Half and full mocks show up here once you finish one.</Empty>
        ) : (
          <MockList mocks={mocks} />
        )}
      </Card>
    </>
  );
}

function SectionTitle({ title, note }: { title: string; note?: string }) {
  return (
    <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
      <h2 className="text-lg font-bold">{title}</h2>
      {note && <span className="text-sm text-muted">{note}</span>}
    </div>
  );
}

function AccuracyTable<K extends string | number>({
  caption,
  rows,
  label,
  note,
}: {
  caption: string;
  rows: AccuracyRow<K>[];
  label: (k: K) => ReactNode;
  note?: string;
}) {
  return (
    <div className="max-w-full overflow-x-auto">
      <table className="w-full text-sm">
        <caption className="mb-1 text-left font-semibold">
          {caption}
          {note && <span className="font-normal text-muted"> · {note}</span>}
        </caption>
        <thead>
          <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
            <th scope="col" className="py-1.5 pr-2 font-semibold">
              Name
            </th>
            <th scope="col" className="px-2 py-1.5 text-right font-semibold">
              Answered
            </th>
            <th scope="col" className="py-1.5 pl-2 text-right font-semibold">
              Accuracy
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key} className="border-b border-line/60 last:border-0">
              <td className="py-1.5 pr-2">{label(r.key)}</td>
              <td className="px-2 py-1.5 text-right tabular-nums text-muted">{r.answered}</td>
              <td className={`py-1.5 pl-2 text-right font-semibold tabular-nums ${accuracyTone(r.accuracy)}`}>{pct(r.accuracy)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TimeTable({
  overall,
  types,
  difficulty,
}: {
  overall: TimeStats | null;
  types: ({ key: QuestionType } & TimeStats)[];
  difficulty: ({ key: Difficulty } & TimeStats)[];
}) {
  if (!overall) return <p className="text-muted">No timed answers in this period.</p>;
  const groups: { title: string; rows: { key: string; label: string; stats: TimeStats }[] }[] = [
    { title: 'Overall', rows: [{ key: 'all', label: 'All questions', stats: overall }] },
    { title: 'By question type', rows: types.map((t) => ({ key: t.key, label: TYPE_LABELS[t.key], stats: t })) },
    { title: 'By difficulty', rows: difficulty.map((d) => ({ key: String(d.key), label: DIFFICULTY_LABELS[d.key], stats: d })) },
  ];
  return (
    <div className="max-w-full overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
            <th scope="col" className="py-1.5 pr-2 font-semibold">
              Questions
            </th>
            <th scope="col" className="px-2 py-1.5 text-right font-semibold">
              n
            </th>
            <th scope="col" className="px-2 py-1.5 text-right font-semibold">
              Median
            </th>
            <th scope="col" className="py-1.5 pl-2 text-right font-semibold">
              Mean
            </th>
          </tr>
        </thead>
        {groups.map((g) => (
          <tbody key={g.title}>
            <tr>
              <th scope="rowgroup" colSpan={4} className="pt-3 pb-1 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                {g.title}
              </th>
            </tr>
            {g.rows.map((r) => (
              <tr key={r.key} className="border-b border-line/60 last:border-0">
                <td className="py-1.5 pr-2">{r.label}</td>
                <td className="px-2 py-1.5 text-right tabular-nums text-muted">{r.stats.count}</td>
                <td className="px-2 py-1.5 text-right font-semibold tabular-nums">{seconds(r.stats.medianSec)}</td>
                <td className="py-1.5 pl-2 text-right tabular-nums">{seconds(r.stats.meanSec)}</td>
              </tr>
            ))}
          </tbody>
        ))}
      </table>
    </div>
  );
}

// Shared chart frame: viewBox units, scaled to the card width.
const W = 320;
const PAD = { top: 12, right: 12, bottom: 34, left: 36 };
const GRID = [0, 0.25, 0.5, 0.75, 1];

function YAxis({ plotH, plotW }: { plotH: number; plotW: number }) {
  return (
    <g className="text-muted">
      {GRID.map((g) => {
        const y = PAD.top + plotH * (1 - g);
        return (
          <g key={g}>
            <line x1={PAD.left} x2={PAD.left + plotW} y1={y} y2={y} className="stroke-line" strokeWidth={0.75} />
            <text x={PAD.left - 5} y={y + 3} textAnchor="end" fontSize={9} fill="currentColor">
              {g * 100}%
            </text>
          </g>
        );
      })}
    </g>
  );
}

function CalibrationChart({ calib }: { calib: Calibration }) {
  const H = 170;
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (plotW * (i + 0.5)) / calib.points.length;
  const y = (v: number) => PAD.top + plotH * (1 - v);
  const actual = calib.points.flatMap((p, i) => (p.accuracy === null ? [] : [{ i, v: p.accuracy, p }]));
  const summary = calib.points
    .map((p) => `${CONFIDENCE_LABELS[p.confidence]}: ${p.accuracy === null ? 'no answers' : pct(p.accuracy)}, ideal ${pct(p.ideal)}`)
    .join('; ');
  return (
    <figure className="max-w-md">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`Calibration. ${summary}.`}>
        <YAxis plotH={plotH} plotW={plotW} />
        <polyline
          points={calib.points.map((p, i) => `${x(i)},${y(p.ideal)}`).join(' ')}
          fill="none"
          className="stroke-muted"
          strokeWidth={1.5}
          strokeDasharray="4 3"
        />
        {actual.length > 1 && (
          <polyline points={actual.map((a) => `${x(a.i)},${y(a.v)}`).join(' ')} fill="none" className="stroke-chestnut" strokeWidth={2} />
        )}
        {actual.map((a) => (
          <circle key={a.p.confidence} cx={x(a.i)} cy={y(a.v)} r={4} className="fill-chestnut">
            <title>{`${CONFIDENCE_LABELS[a.p.confidence]}: ${pct(a.v)} of ${a.p.answered}`}</title>
          </circle>
        ))}
        {calib.points.map((p, i) => (
          <text key={p.confidence} x={x(i)} y={H - PAD.bottom + 14} textAnchor="middle" fontSize={10} fill="currentColor">
            {CONFIDENCE_LABELS[p.confidence]}
          </text>
        ))}
      </svg>
      <figcaption className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        <LegendLine className="stroke-chestnut">your accuracy</LegendLine>
        <LegendLine className="stroke-muted" dashed>
          well calibrated
        </LegendLine>
      </figcaption>
    </figure>
  );
}

function TrendChart({ weeks }: { weeks: WeekPoint[] }) {
  const H = 190;
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const slot = plotW / weeks.length;
  const x = (i: number) => PAD.left + slot * (i + 0.5);
  const y = (v: number) => PAD.top + plotH * (1 - v);
  const maxN = Math.max(1, ...weeks.map((w) => w.answered));
  const points = weeks.flatMap((w, i) => (w.accuracy === null ? [] : [{ i, v: w.accuracy, w }]));
  const shortDate = (d: string) => formatDate(d, { day: 'numeric', month: 'short' });
  if (points.length === 0) return <p className="text-muted">No answers in the last 12 weeks.</p>;
  return (
    <figure className="max-w-md">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label="Weekly accuracy over the last 12 weeks (details in the table below)"
      >
        <YAxis plotH={plotH} plotW={plotW} />
        {/* Volume bars, scaled to the busiest week (not to the % axis). */}
        {weeks.map((w, i) => {
          const h = (plotH * w.answered) / maxN;
          return w.answered > 0 ? (
            <rect key={w.week} x={x(i) - slot * 0.3} y={PAD.top + plotH - h} width={slot * 0.6} height={h} rx={1.5} className="fill-surface-2" />
          ) : null;
        })}
        <line
          x1={PAD.left}
          x2={PAD.left + plotW}
          y1={y(MOCK_TARGET)}
          y2={y(MOCK_TARGET)}
          className="stroke-olive"
          strokeWidth={1}
          strokeDasharray="4 3"
        />
        {points.length > 1 && (
          <polyline points={points.map((p) => `${x(p.i)},${y(p.v)}`).join(' ')} fill="none" className="stroke-chestnut" strokeWidth={2} />
        )}
        {points.map((p) => (
          <circle key={p.w.week} cx={x(p.i)} cy={y(p.v)} r={3} className="fill-chestnut">
            <title>{`Week of ${shortDate(p.w.week)}: ${pct(p.v)} of ${p.w.answered}`}</title>
          </circle>
        ))}
        {weeks.map((w, i) => (
          <text key={w.week} x={x(i)} y={H - PAD.bottom + 12} textAnchor="middle" fontSize={8} fill="currentColor" className="text-muted">
            {w.answered || ''}
          </text>
        ))}
        {weeks.map((w, i) =>
          (weeks.length - 1 - i) % 3 === 0 ? (
            <text key={w.week} x={x(i)} y={H - 6} textAnchor="middle" fontSize={9} fill="currentColor">
              {shortDate(w.week)}
            </text>
          ) : null,
        )}
      </svg>
      <figcaption className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        <LegendLine className="stroke-chestnut">accuracy</LegendLine>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-3 rounded-sm bg-surface-2" aria-hidden /> questions answered (number under each week)
        </span>
        <LegendLine className="stroke-olive" dashed>
          {pct(MOCK_TARGET)} target
        </LegendLine>
      </figcaption>
      <table className="sr-only">
        <caption>Weekly accuracy</caption>
        <thead>
          <tr>
            <th scope="col">Week of</th>
            <th scope="col">Answered</th>
            <th scope="col">Accuracy</th>
          </tr>
        </thead>
        <tbody>
          {weeks.map((w) => (
            <tr key={w.week}>
              <td>{shortDate(w.week)}</td>
              <td>{w.answered}</td>
              <td>{w.accuracy === null ? 'none' : pct(w.accuracy)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

function LegendLine({ className, dashed, children }: { className: string; dashed?: boolean; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <svg width="18" height="6" aria-hidden>
        <line x1="0" x2="18" y1="3" y2="3" className={className} strokeWidth={2} strokeDasharray={dashed ? '4 3' : undefined} />
      </svg>
      {children}
    </span>
  );
}

function MockList({ mocks }: { mocks: MockResult[] }) {
  return (
    <ul className="space-y-3">
      {mocks.map((m) => (
        <li key={m.sessionId} className="rounded-lg border border-line p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="flex flex-wrap items-center gap-2">
              <strong>{day(m.finishedAt)}</strong>
              <Badge>{MOCK_LABELS[m.mode]}</Badge>
            </span>
            <span className="flex items-center gap-2">
              <span className="text-sm tabular-nums text-muted">
                {m.correct} / {m.total} questions
              </span>
              <Badge tone={m.passed ? 'good' : 'bad'} title={m.passed ? 'At or above the target' : `Under the ${pct(MOCK_TARGET)} target`}>
                {pct(m.score)}
              </Badge>
              <ButtonLink to={`/mock/result/${m.sessionId}`} variant="ghost">
                Debrief
              </ButtonLink>
            </span>
          </div>
          {m.domains.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-1.5 text-xs" aria-label="Accuracy by domain">
              {m.domains.map((d) => {
                const weak = d.accuracy < MOCK_DOMAIN_FLOOR;
                return (
                  <li
                    key={d.domain}
                    title={`${content.domainName(d.domain)}: ${d.correct}/${d.questions}`}
                    className={`rounded-full px-2 py-0.5 tabular-nums ${weak ? 'bg-burgundy-soft font-semibold text-burgundy' : 'bg-surface-2 text-muted'}`}
                  >
                    {d.domain} {pct(d.accuracy)}
                    {weak && <span className="sr-only"> (under {pct(MOCK_DOMAIN_FLOOR)})</span>}
                  </li>
                );
              })}
            </ul>
          )}
        </li>
      ))}
    </ul>
  );
}
