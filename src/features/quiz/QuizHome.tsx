import { useState, type ReactNode } from 'react';
import { content } from '../../content/bundle.ts';
import { assembleQuiz, QUIZ_MODES, type QuizMode } from '../../domain/quiz/assemble.ts';
import { assembleMock, freshMockCount, isMockMode, MOCK_KINDS, MOCK_TARGET, mockOutcomes, mockSpec, type MockKind } from '../../domain/quiz/mock.ts';
import { openSession, quizHref, quizzesInProgress, sessionAnswers } from '../../domain/quiz/resume.ts';
import { useSnapshot } from '../../state/ProfileContext.tsx';
import { Badge, ButtonLink, Card, inputClass, PageHeader, pct } from '../../ui/kit.tsx';

const exists = (id: string) => content.questionById.has(id);

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

  // A quiz left mid-way resumes from its tile; "Start over" opens a fresh one.
  const resumeOf = (mode: QuizMode, key: { module?: number; domain?: string } = {}) => {
    const open = openSession(data.sessions, { mode, ...key }, exists);
    const answered = open ? sessionAnswers(data.attempts, open.id).length : 0;
    return open && answered > 0 ? { answered, total: open.questionIds.length } : undefined;
  };
  const inProgress = quizzesInProgress(data.sessions, data.attempts, exists);

  const tile = (mode: QuizMode, href: string, n: number, extra?: ReactNode, key: { module?: number; domain?: string } = {}) => {
    const resume = resumeOf(mode, key);
    return (
    <Card key={mode} className="flex flex-col">
      <div className="mb-1 flex items-center justify-between gap-2">
        <h2 className="font-bold">{QUIZ_MODES[mode].title}</h2>
        <Badge tone={n ? 'accent' : 'neutral'}>{n} q</Badge>
      </div>
      <p className="mb-3 flex-1 text-sm text-muted">{QUIZ_MODES[mode].blurb}</p>
      {extra}
      {resume ? (
        <div className="flex flex-wrap gap-2">
          <ButtonLink to={href} className="flex-1">
            Resume ({resume.answered}/{resume.total})
          </ButtonLink>
          <ButtonLink to={`${href}&new=1`} variant="secondary">
            Start over
          </ButtonLink>
        </div>
      ) : n > 0 ? (
        <ButtonLink to={href}>Start</ButtonLink>
      ) : (
        <span className="rounded-lg bg-surface-2 p-2 text-center text-sm text-muted">Nothing to practise here yet</span>
      )}
    </Card>
    );
  };

  const mockTile = (kind: MockKind) => {
    const spec = mockSpec(content.bundle.blueprint, kind);
    const plan = assembleMock({ kind, questions: content.questions, blueprint: content.bundle.blueprint, attempts: data.attempts });
    const fromPool = plan.slots.reduce((t, x) => t + x.mock + x.extra, 0) - plan.repeated;
    const practice = plan.slots.reduce((t, x) => t + x.practice, 0);
    const open = openSession(data.sessions, { mode: kind }, exists);
    const answered = open ? Object.values(open.draft ?? {}).filter((a) => a.chosen !== null).length : 0;
    const history = mockOutcomes(kind, data.sessions, data.attempts, content.questionById).reverse();
    const href = `/mock/run?kind=${kind}`;
    return (
      <Card key={kind} className="flex flex-col">
        <div className="mb-1 flex items-center justify-between gap-2">
          <h3 className="font-bold">{spec.title}</h3>
          <Badge tone={plan.questions.length ? 'accent' : 'neutral'}>
            {plan.questions.length} q · {plan.minutes} min
          </Badge>
        </div>
        <p className="text-sm text-muted">
          {kind === 'full-mock'
            ? `The exam's format: ${spec.questions} questions in ${spec.minutes / 60} hours. Two in a row at ${pct(MOCK_TARGET)} or more is the exam-ready signal.`
            : `Half the exam: ${spec.questions} questions in ${spec.minutes / 60} hours, to train pace and focus.`}
        </p>
        <p className="mb-3 mt-1 flex-1 text-sm text-muted">
          {freshMockCount(content.questions, data.attempts)} unseen mock questions left.
          {(practice > 0 || plan.repeated > 0 || plan.questions.length < spec.questions) && (
            <>
              {' '}
              The next one uses {fromPool} from the mock pool
              {practice > 0 && `, ${practice} unseen practice questions`}
              {plan.repeated > 0 && `, ${plan.repeated} repeats`}
              {plan.questions.length < spec.questions && `, and is shortened to fit the bank`}.
            </>
          )}
        </p>
        {open ? (
          <div className="flex flex-wrap gap-2">
            <ButtonLink to={href} className="flex-1">
              Resume ({answered}/{open.questionIds.length})
            </ButtonLink>
            <ButtonLink to={`${href}&new=1`} variant="secondary">
              Start over
            </ButtonLink>
          </div>
        ) : plan.questions.length > 0 ? (
          <ButtonLink to={href}>Start</ButtonLink>
        ) : (
          <span className="rounded-lg bg-surface-2 p-2 text-center text-sm text-muted">No mock questions yet</span>
        )}
        {history.length > 0 && (
          <ul className="mt-3 space-y-1 border-t border-line pt-2 text-sm">
            {history.slice(0, 4).map((o) => (
              <li key={o.session.id} className="flex justify-between gap-2">
                <span className="text-muted">{new Date(o.finishedAt).toLocaleDateString()}</span>
                <a href={`#/mock/result/${o.session.id}`} className={`font-semibold underline ${o.pct >= MOCK_TARGET ? 'text-olive' : 'text-burgundy'}`}>
                  {pct(o.pct)}
                </a>
              </li>
            ))}
          </ul>
        )}
      </Card>
    );
  };

  return (
    <>
      <PageHeader title="Quiz" subtitle="Rate your confidence before each answer is revealed. Every miss goes to your mistake log." />
      {inProgress.length > 0 && (
        <Card className="mb-4">
          <h2 className="mb-2 font-bold">In progress</h2>
          <ul className="space-y-2">
            {inProgress.slice(0, 5).map(({ session, answered }) => (
              <li key={session.id} className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  {session.mode === 'retest'
                    ? 'Re-test'
                    : isMockMode(session.mode)
                      ? mockSpec(content.bundle.blueprint, session.mode).title
                      : (QUIZ_MODES[session.mode as QuizMode]?.title ?? session.mode)}
                  {session.module !== undefined && ` · M${session.module}`}
                  {session.domain !== undefined && ` · ${session.domain}`}
                  <span className="text-sm text-muted">
                    {' '}
                    · {answered}/{session.questionIds.length} answered
                  </span>
                </span>
                <ButtonLink to={quizHref(session)} variant="secondary">
                  Resume
                </ButtonLink>
              </li>
            ))}
          </ul>
        </Card>
      )}
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
          { module },
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
          { domain },
        )}
        {tile('mixed', '/quiz/run?mode=mixed', count('mixed'))}
        {tile('weak', '/quiz/run?mode=weak', count('weak'))}
        {tile('confident-wrong', '/quiz/run?mode=confident-wrong', count('confident-wrong'))}
        {tile('review', '/quiz/run?mode=review', count('review'))}
        {content.questions.some((q) => q.pool === 'diagnostic') && tile('diagnostic', '/quiz/run?mode=diagnostic', count('diagnostic'))}
      </div>
      <h2 className="mb-2 mt-6 text-lg font-bold">Mock exams</h2>
      <p className="mb-3 text-sm text-muted">
        Timed, exam-like, from a held-out pool that never appears in practice or review. No feedback until you submit. Aim for {pct(MOCK_TARGET)}.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">{MOCK_KINDS.map((kind) => mockTile(kind))}</div>
    </>
  );
}
