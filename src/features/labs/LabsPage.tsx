import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router';
import { ETHICS_NOTICE } from '../../config.ts';
import { content } from '../../content/bundle.ts';
import { formatMinutes, labRows, labSummary } from '../../domain/labs.ts';
import { LAB_STATUSES, LAB_STATUS_LABELS, type LabStatus } from '../../schemas/progress.ts';
import { useSnapshot } from '../../state/ProfileContext.tsx';
import { Card, Empty, PageHeader, ProgressBar, Stat } from '../../ui/kit.tsx';
import { LabRowItem } from './LabCard.tsx';

type Filter = 'all' | LabStatus;

/** Lab tracker (§6.3 feature 9): every lab of every module, with status, time spent and notes. */
export function LabsPage() {
  const s = useSnapshot();
  const [params, setParams] = useSearchParams();
  const filter: Filter = LAB_STATUSES.find((st) => st === params.get('show')) ?? 'all';

  const rows = useMemo(() => {
    if (!s) return [];
    const modules = content.modules.map((m) => ({ module: m.meta.module, title: m.meta.title, labs: m.meta.labs }));
    return labRows(modules, s.data.moduleProgress, s.profile.hasILabs);
  }, [s]);

  if (!s) return <p className="text-muted">Loading…</p>;
  const sum = labSummary(rows);
  const shown = rows.filter((r) => filter === 'all' || r.log.status === filter);
  const groups = [...new Set(shown.map((r) => r.module))].map((n) => ({ n, rows: shown.filter((r) => r.module === n) }));
  const filters: { key: Filter; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: sum.total },
    ...LAB_STATUSES.map((st) => ({ key: st, label: LAB_STATUS_LABELS[st], count: sum.byStatus[st] })),
  ];
  const finished = sum.byStatus.done + sum.byStatus.skipped;

  return (
    <>
      <PageHeader title="Lab tracker" subtitle="Hands-on practice for every module: mark each lab, log your time and keep notes." />
      <p className="mb-4 rounded-lg border border-burgundy/40 bg-burgundy-soft p-3 text-sm text-burgundy">
        <strong>Ethics.</strong> {ETHICS_NOTICE}
      </p>

      <Card>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Done" value={`${sum.byStatus.done}/${sum.total}`} hint={sum.byStatus.skipped ? `${sum.byStatus.skipped} skipped` : undefined} />
          <Stat label="In progress" value={sum.byStatus.doing} />
          <Stat label="Time logged" value={formatMinutes(sum.minutesSpent)} />
          <Stat label="Time left" value={formatMinutes(sum.minutesLeft)} hint="Estimate for the labs not finished" />
        </div>
        {sum.total > 0 && (
          <div className="mt-4">
            <ProgressBar value={finished / sum.total} tone="good" label="Labs done or skipped" />
            <p className="mt-1 text-sm text-muted">
              {finished} of {sum.total} labs done or skipped. The plan keeps a lab block on Saturdays; labs are practice, not a module gate.
            </p>
          </div>
        )}
      </Card>

      <div className="my-4 flex flex-wrap gap-2" role="group" aria-label="Show labs">
        {filters.map((f) => (
          <button
            key={f.key}
            type="button"
            aria-pressed={filter === f.key}
            onClick={() => setParams(f.key === 'all' ? {} : { show: f.key }, { replace: true })}
            className={`min-h-8 rounded-full border px-3 text-sm ${filter === f.key ? 'border-chestnut bg-chestnut-soft font-semibold' : 'border-line bg-surface'}`}
          >
            {f.label} ({f.count})
          </button>
        ))}
      </div>

      {groups.length === 0 ? (
        <Empty>{sum.total === 0 ? 'Labs arrive as modules are built.' : 'No lab with this status.'}</Empty>
      ) : (
        <div className="space-y-5">
          {groups.map((g) => (
            <section key={g.n} aria-labelledby={`labs-m${g.n}`}>
              <h2 id={`labs-m${g.n}`} className="mb-2 font-bold">
                <Link to={`/modules/${g.n}?tab=labs`} className="hover:underline">
                  M{g.n} · {g.rows[0]!.title}
                </Link>
              </h2>
              <div className="space-y-2">
                {g.rows.map((r) => (
                  <LabRowItem key={r.lab.name} profileId={s.profile.id} module={r.module} lab={r.lab} log={r.log} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
