import { Link } from 'react-router';
import { content } from '../../content/bundle.ts';
import { sectionGaps, type SectionGap } from '../../domain/coverage.ts';
import { Card, Empty, PageHeader } from '../../ui/kit.tsx';

export function SelfStudyPage() {
  const items = content.bundle.selfStudy;
  const partial = content.modules.filter((m) => m.meta.status !== 'built').map((m) => ({ m, gaps: sectionGaps(m) }));

  return (
    <>
      <PageHeader
        title="Self-study"
        subtitle="Exam topics ShieldUp doesn't cover, or covers only in part. Study them from your course or the free links on each module page, so nothing on the exam slips through."
      />
      {items.length === 0 ? (
        <Empty>Everything on the exam blueprint is covered in the app.</Empty>
      ) : (
        <Card className="mb-4">
          <ul className="divide-y divide-line">
            {items.map((s) => (
              <li key={s.topic} className="grid gap-1 py-3 first:pt-0 last:pb-0 sm:grid-cols-[12rem_1fr] sm:gap-4">
                <div>
                  <p className="font-semibold uppercase tracking-wide">{s.topic}</p>
                  <p className="text-sm">
                    {s.modules.map((n, i) => (
                      <span key={n}>
                        {i > 0 && ', '}
                        <Link to={`/modules/${n}`} className="text-chestnut underline">
                          M{n}
                        </Link>
                      </span>
                    ))}
                  </p>
                </div>
                <p className="text-sm leading-relaxed">{s.what}</p>
              </li>
            ))}
          </ul>
        </Card>
      )}
      {partial.length > 0 && (
        <Card>
          <details>
            <summary className="cursor-pointer font-semibold">Exactly what's missing, section by section</summary>
            <div className="mt-3 space-y-4">
              {partial.map(({ m, gaps }) => (
                <div key={m.meta.module}>
                  <Link to={`/modules/${m.meta.module}`} className="font-semibold text-chestnut underline">
                    M{m.meta.module} · {m.meta.title}
                  </Link>
                  <ul className="mt-1 space-y-0.5 text-sm">
                    {sameEverywhere(m.meta.sections.length, gaps) ? (
                      <li>
                        All {gaps.length} sections: <span className="text-muted">{missingText(gaps[0]!)}</span>
                      </li>
                    ) : (
                      gaps.map((g) => (
                        <li key={g.section}>
                          {g.section}: <span className="text-muted">{missingText(g)}</span>
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              ))}
            </div>
          </details>
        </Card>
      )}
    </>
  );
}

const missingText = (g: SectionGap) => g.missing.map((k) => `${(g.few as string[]).includes(k) ? 'few' : 'no'} ${k}`).join(', ');

/** Every section lacks the same things (a stub, typically): one line says it. */
function sameEverywhere(sectionCount: number, gaps: SectionGap[]): boolean {
  return gaps.length === sectionCount && gaps.length > 1 && gaps.every((g) => missingText(g) === missingText(gaps[0]!));
}
