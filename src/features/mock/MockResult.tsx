import { useMemo, useState } from 'react';
import { useParams } from 'react-router';
import { content } from '../../content/bundle.ts';
import { DOMAIN_FLOOR, isMockMode, MOCK_TARGET, mockOutcomes, mockSpec } from '../../domain/quiz/mock.ts';
import { useSnapshot } from '../../state/ProfileContext.tsx';
import { Badge, ButtonLink, Card, Empty, PageHeader, pct, Stat, UnverifiedBadge } from '../../ui/kit.tsx';
import { Markdown } from '../../ui/Markdown.tsx';
import { ReportError } from '../../ui/ReportError.tsx';
import { formatClock } from './MockRun.tsx';

const LETTERS = ['A', 'B', 'C', 'D'];
type Filter = 'all' | 'wrong' | 'flagged' | 'unanswered' | 'sure-wrong';

/** Score report of one finished mock: score vs target, domains vs floor, calibration, then a question-by-question debrief. */
export function MockResult() {
  const s = useSnapshot();
  const { id } = useParams();
  const [filter, setFilter] = useState<Filter>('wrong');

  const view = useMemo(() => {
    if (!s) return undefined;
    const session = s.data.sessions.find((x) => x.id === id);
    if (!session || !isMockMode(session.mode) || session.finishedAt === undefined) return null;
    const outcome = mockOutcomes(session.mode, s.data.sessions, s.data.attempts, content.questionById).find((o) => o.session.id === id)!;
    const attempts = new Map(s.data.attempts.filter((a) => a.sessionId === id).map((a) => [a.questionId, a]));
    const rows = session.questionIds.flatMap((qid, i) => {
      const q = content.questionById.get(qid);
      return q ? [{ n: i + 1, q, a: attempts.get(qid), flagged: session.draft?.[qid]?.flagged ?? false }] : [];
    });
    return { session, kind: session.mode, outcome, rows };
  }, [s, id]);

  if (view === undefined) return <p className="text-muted">Loading…</p>;
  if (view === null) {
    return (
      <>
        <PageHeader title="Mock result" />
        <Empty>This mock was not found or is not finished yet.</Empty>
      </>
    );
  }

  const { session, kind, outcome, rows } = view;
  const spec = mockSpec(content.bundle.blueprint, kind);
  const passed = outcome.pct >= MOCK_TARGET;
  const answered = rows.filter((r) => r.a && r.a.chosen !== null);
  const conf = (['sure', 'unsure', 'guess'] as const).map((c) => {
    const mine = answered.filter((r) => r.a!.confidence === c);
    return { c, n: mine.length, ok: mine.filter((r) => r.a!.correct).length };
  });
  const domainName = new Map(content.bundle.blueprint.domains.map((d) => [d.id as string, d.name]));
  const perDomain = [...outcome.byDomain].map(([d, p]) => ({ d, p, n: rows.filter((r) => r.q.domain === d).length }));
  const topped = session.composition?.filter((c) => c.practice > 0 || c.extra > 0 || c.mock < c.target) ?? [];
  const practiceUsed = session.composition?.reduce((t, c) => t + c.practice, 0) ?? 0;

  const shown = rows.filter((r) => {
    if (filter === 'wrong') return !r.a?.correct;
    if (filter === 'flagged') return r.flagged;
    if (filter === 'unanswered') return !r.a || r.a.chosen === null;
    if (filter === 'sure-wrong') return r.a && !r.a.correct && r.a.chosen !== null && r.a.confidence === 'sure';
    return true;
  });
  const counts: Record<Filter, number> = {
    all: rows.length,
    wrong: rows.filter((r) => !r.a?.correct).length,
    'sure-wrong': outcome.confidentlyWrong,
    flagged: rows.filter((r) => r.flagged).length,
    unanswered: rows.length - outcome.answered,
  };
  const FILTERS: { key: Filter; label: string }[] = [
    { key: 'wrong', label: 'Wrong' },
    { key: 'sure-wrong', label: 'Confidently wrong' },
    { key: 'flagged', label: 'Flagged' },
    { key: 'unanswered', label: 'Unanswered' },
    { key: 'all', label: 'All' },
  ];

  return (
    <>
      <PageHeader
        title={`${spec.title} result`}
        subtitle={new Date(outcome.finishedAt).toLocaleString()}
        actions={
          <div className="flex flex-wrap gap-2">
            <ButtonLink to="/quiz" variant="secondary">
              Quizzes
            </ButtonLink>
            <ButtonLink to="/analytics" variant="secondary">
              Analytics
            </ButtonLink>
          </div>
        }
      />

      <Card>
        <p role="status" className={`text-2xl font-bold ${passed ? 'text-olive' : 'text-burgundy'}`}>
          {pct(outcome.pct)} · {outcome.correct}/{outcome.total} {passed ? '· on target' : `· below the ${pct(MOCK_TARGET)} target`}
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Answered" value={`${outcome.answered}/${outcome.total}`} hint="Unanswered count as wrong" />
          <Stat label="Time used" value={formatClock(session.elapsedMs ?? 0)} hint={`of ${formatClock(session.timeLimitMs ?? spec.minutes * 60_000)}`} />
          <Stat label="Confidently wrong" value={outcome.answered ? pct(outcome.confidentlyWrong / outcome.answered) : '—'} hint="Goal: under 5%" />
          <Stat label="Weakest domain" value={perDomain.length ? pct(Math.min(...perDomain.map((x) => x.p))) : '—'} hint={`Floor: ${pct(DOMAIN_FLOOR)}`} />
        </div>
        {kind === 'half-mock' && <p className="mt-3 text-sm text-muted">Half-mocks train pace and stamina. Only full mocks count toward the exam-ready check.</p>}
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 font-bold">By domain</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted">
                <th className="pb-2 font-semibold">Domain</th>
                <th className="pb-2 pl-3 text-right font-semibold">Qs</th>
                <th className="pb-2 pl-3 text-right font-semibold">Score</th>
              </tr>
            </thead>
            <tbody>
              {perDomain.map(({ d, p, n }) => (
                <tr key={d} className="border-t border-line">
                  <td className="py-1.5 pr-2">
                    {d} · {domainName.get(d) ?? d}
                  </td>
                  <td className="py-1.5 text-right tabular-nums">{n}</td>
                  <td className={`py-1.5 text-right font-semibold tabular-nums ${p < DOMAIN_FLOOR ? 'text-burgundy' : 'text-olive'}`}>{pct(p)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <Card>
          <h2 className="mb-3 font-bold">Confidence</h2>
          <ul className="space-y-1.5 text-sm">
            {conf.map(({ c, n, ok }) => (
              <li key={c} className="flex justify-between gap-2">
                <span className="capitalize">{c}</span>
                <span className="tabular-nums">{n === 0 ? '—' : `${ok}/${n} right (${pct(ok / n)})`}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm text-muted">Well calibrated means "Sure" answers are almost always right and "Guess" answers are near chance.</p>
          {(topped.length > 0 || practiceUsed > 0) && (
            <div className="mt-4 border-t border-line pt-3 text-sm">
              <p className="font-semibold">How this mock was put together</p>
              <p className="text-muted">
                The held-out mock pool is still short in some domains, so {practiceUsed > 0 ? `${practiceUsed} unseen practice question(s) and ` : ''}
                extra items from other domains filled the gaps. The domain mix is only close to the exam blueprint.
              </p>
            </div>
          )}
        </Card>
      </div>

      <Card className="mt-4">
        <h2 className="mb-3 font-bold">Debrief</h2>
        <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Show questions">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              aria-pressed={filter === f.key}
              onClick={() => setFilter(f.key)}
              className={`min-h-8 rounded-full border px-3 text-sm ${filter === f.key ? 'border-chestnut bg-chestnut-soft font-semibold' : 'border-line bg-surface'}`}
            >
              {f.label} ({counts[f.key]})
            </button>
          ))}
        </div>
        {shown.length === 0 ? (
          <Empty>Nothing here.</Empty>
        ) : (
          <ol className="space-y-3">
            {shown.map(({ n, q, a, flagged }) => {
              const chosen = a?.chosen ?? null;
              return (
                <li key={q.id}>
                  <details className="rounded-lg border border-line p-3">
                    <summary className="cursor-pointer">
                      <span className="mr-2 font-semibold tabular-nums">{n}.</span>
                      {chosen === null ? (
                        <Badge tone="warn">Unanswered</Badge>
                      ) : a!.correct ? (
                        <Badge tone="good">Right</Badge>
                      ) : (
                        <Badge tone="bad">Wrong</Badge>
                      )}
                      {flagged && (
                        <span className="ml-1">
                          <Badge tone="warn">Flagged</Badge>
                        </span>
                      )}
                      <span className="ml-2">{q.stem}</span>
                    </summary>
                    <div className="mt-3">
                      <div className="mb-2 flex flex-wrap gap-2 text-sm text-muted">
                        <span>
                          {q.domain} · M{q.module}
                        </span>
                        {a && <span>· you said {a.confidence}</span>}
                        {q.verify && <UnverifiedBadge />}
                      </div>
                      <ul className="mb-3 space-y-1">
                        {q.options.map((opt, i) => (
                          <li
                            key={i}
                            className={`rounded-md border px-2 py-1 ${i === q.answer ? 'border-olive bg-olive-soft' : i === chosen ? 'border-burgundy bg-burgundy-soft' : 'border-line'}`}
                          >
                            <span className="mr-2 font-bold">{LETTERS[i]}</span>
                            {opt}
                            {i === q.answer && <span className="ml-2 text-sm font-semibold">(answer)</span>}
                            {i === chosen && i !== q.answer && <span className="ml-2 text-sm font-semibold">(yours)</span>}
                          </li>
                        ))}
                      </ul>
                      <Markdown source={q.explanation} />
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-muted">
                        <span>
                          {q.id} · Sources:{' '}
                          {q.sources.map((u, i) => (
                            <a key={u} href={u} target="_blank" rel="noreferrer" className="underline">
                              [{i + 1}]
                            </a>
                          ))}
                        </span>
                        <ReportError item={q} />
                      </div>
                    </div>
                  </details>
                </li>
              );
            })}
          </ol>
        )}
      </Card>
    </>
  );
}
