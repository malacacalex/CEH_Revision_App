import { useState, type ReactNode } from 'react';
import { content } from '../../content/bundle.ts';
import { assembleQuiz, QUIZ_MODES, type QuizMode } from '../../domain/quiz/assemble.ts';
import { useSnapshot } from '../../state/ProfileContext.tsx';
import { Badge, ButtonLink, Card, inputClass, PageHeader } from '../../ui/kit.tsx';

export function QuizHome() {
  const s = useSnapshot();
  const modulesWithPractice = content.modules.filter((m) => m.questions.some((q) => q.pool === 'practice'));
  const [module, setModule] = useState(modulesWithPractice[0]?.meta.module ?? 1);
  const domains = content.bundle.blueprint.domains.filter((d) => content.questions.some((q) => q.domain === d.id && q.pool === 'practice'));
  const [domain, setDomain] = useState(domains[0]?.id ?? 'D1');
  if (!s) return <p className="text-muted">Loading…</p>;
  const { data, snap } = s;

  const count = (mode: QuizMode, extra: { module?: number; domain?: typeof domain } = {}) =>
    assembleQuiz({
      mode,
      questions: content.questions,
      blueprint: content.bundle.blueprint,
      attempts: data.attempts,
      studiedModules: snap.startedModules,
      dueQuestionIds: snap.dueQuestions,
      ...extra,
    }).length;

  const tile = (mode: QuizMode, href: string, n: number, extra?: ReactNode) => (
    <Card key={mode} className="flex flex-col">
      <div className="mb-1 flex items-center justify-between gap-2">
        <h2 className="font-bold">{QUIZ_MODES[mode].title}</h2>
        <Badge tone={n ? 'accent' : 'neutral'}>{n} q</Badge>
      </div>
      <p className="mb-3 flex-1 text-sm text-muted">{QUIZ_MODES[mode].blurb}</p>
      {extra}
      {n > 0 ? (
        <ButtonLink to={href}>Start</ButtonLink>
      ) : (
        <span className="rounded-lg bg-surface-2 p-2 text-center text-sm text-muted">Nothing to practise here yet</span>
      )}
    </Card>
  );

  return (
    <>
      <PageHeader title="Quiz" subtitle="Rate your confidence before each answer is revealed. Every miss goes to your mistake log." />
      <div className="grid gap-3 sm:grid-cols-2">
        {tile(
          'module',
          `/quiz/run?mode=module&module=${module}`,
          count('module', { module }),
          <select className={`${inputClass} mb-3`} value={module} onChange={(e) => setModule(Number(e.target.value))} aria-label="Module">
            {modulesWithPractice.map((m) => (
              <option key={m.meta.module} value={m.meta.module}>
                M{m.meta.module} · {m.meta.title}
              </option>
            ))}
          </select>,
        )}
        {tile(
          'domain',
          `/quiz/run?mode=domain&domain=${domain}`,
          count('domain', { domain }),
          <select className={`${inputClass} mb-3`} value={domain} onChange={(e) => setDomain(e.target.value as typeof domain)} aria-label="Domain">
            {domains.map((d) => (
              <option key={d.id} value={d.id}>
                {d.id} · {d.name}
              </option>
            ))}
          </select>,
        )}
        {tile('mixed', '/quiz/run?mode=mixed', count('mixed'))}
        {tile('weak', '/quiz/run?mode=weak', count('weak'))}
        {tile('confident-wrong', '/quiz/run?mode=confident-wrong', count('confident-wrong'))}
        {tile('review', '/quiz/run?mode=review', count('review'))}
        {content.questions.some((q) => q.pool === 'diagnostic') && tile('diagnostic', '/quiz/run?mode=diagnostic', count('diagnostic'))}
        <Card className="opacity-70">
          <h2 className="mb-1 font-bold">Half-mock and full mock</h2>
          <p className="text-sm text-muted">
            63 q / 2 h and 125 q / 4 h from a held-out pool that never appears in practice. They unlock once the mock pool is written (Milestone 5).
          </p>
        </Card>
      </div>
    </>
  );
}
