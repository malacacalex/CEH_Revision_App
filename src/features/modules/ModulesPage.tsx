import { Link } from 'react-router';
import { content } from '../../content/bundle.ts';
import { useSnapshot } from '../../state/ProfileContext.tsx';
import { Badge, Card, PageHeader, ProgressBar } from '../../ui/kit.tsx';

export function ModulesPage() {
  const s = useSnapshot();
  if (!s) return <p className="text-muted">Loading…</p>;
  const { profile, snap } = s;
  const domains = content.bundle.blueprint.domains.filter((d) => d.id !== 'D0' || !profile.foundationsSkipped);

  return (
    <>
      <PageHeader title="Modules" subtitle={`${snap.doneModules.filter((n) => n > 0).length} of 20 exam modules done`} />
      <div className="space-y-6">
        {domains.map((d) => (
          <section key={d.id}>
            <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted">
              {d.id} · {d.name} {d.weight > 0 && <span className="font-normal normal-case">({Math.round(d.weight * 100)}% of the exam)</span>}
            </h2>
            <ul className="grid gap-2 sm:grid-cols-2">
              {d.modules.map((n) => {
                const m = content.module(n)!;
                const gate = snap.gates.get(n)!;
                const done = snap.doneModules.includes(n);
                return (
                  <li key={n}>
                    <Link to={`/modules/${n}`} className="block h-full rounded-xl focus-visible:outline-offset-4">
                      <Card className="h-full transition hover:border-chestnut">
                        <div className="mb-2 flex items-start justify-between gap-2">
                          <span className="font-semibold">
                            <span className="text-chestnut">M{n}</span> {m.meta.title}
                          </span>
                          {done ? (
                            <Badge tone="good">done</Badge>
                          ) : m.meta.status === 'stub' ? (
                            <Badge>content coming</Badge>
                          ) : m.meta.status === 'sample' ? (
                            <Badge tone="warn">sample</Badge>
                          ) : null}
                        </div>
                        <ProgressBar value={gate.fraction} tone={done ? 'good' : 'accent'} label={`M${n} gate progress`} />
                        <div className="mt-1 text-xs text-muted">
                          {m.questions.filter((q) => q.pool === 'practice').length} questions · {m.flashcards.length} cards · {m.meta.effortUnits} units
                        </div>
                      </Card>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}
