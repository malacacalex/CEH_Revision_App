import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { content } from '../../content/bundle.ts';
import { finishSession, recordAnswer, saveProfile, startSession } from '../../db/repo.ts';
import type { Confidence } from '../../domain/fsrs/scheduler.ts';
import { assembleQuiz, QUIZ_MODES, type QuizMode } from '../../domain/quiz/assemble.ts';
import { openSession, sessionAnswers } from '../../domain/quiz/resume.ts';
import { scoreQuiz, type AnswerRecord } from '../../domain/quiz/score.ts';
import type { QuizSession } from '../../schemas/progress.ts';
import type { DomainId, Question } from '../../schemas/content.ts';
import { useSnapshot } from '../../state/ProfileContext.tsx';
import { Badge, Button, ButtonLink, Card, Empty, PageHeader, pct, ProgressBar, UnverifiedBadge } from '../../ui/kit.tsx';
import { Markdown } from '../../ui/Markdown.tsx';
import { GlossaryText, glossaryTerms, Term } from '../../ui/GlossaryText.tsx';
import { ReportError } from '../../ui/ReportError.tsx';

const LETTERS = ['A', 'B', 'C', 'D'];
const SKIPCHECK_PASS = 0.8;
const CONFIDENCE: { value: Confidence; label: string; key: string }[] = [
  { value: 'sure', label: 'Sure', key: 's' },
  { value: 'unsure', label: 'Unsure', key: 'u' },
  { value: 'guess', label: 'Guess', key: 'g' },
];

interface Run {
  session: QuizSession;
  questions: Question[];
}

export function QuizRun() {
  const s = useSnapshot();
  const [params, setParams] = useSearchParams();
  const mode = (params.get('mode') ?? 'mixed') as QuizMode | 'retest';
  const module = params.get('module') === null ? undefined : Number(params.get('module'));
  const domain = (params.get('domain') ?? undefined) as DomainId | undefined;
  const idsParam = params.get('ids') ?? '';
  const fresh = params.get('new') === '1';

  const [run, setRun] = useState<Run | null>(null);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState<AnswerRecord | null>(null);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [finished, setFinished] = useState(false);
  const started = useRef(false);
  const shownAt = useRef(0);

  useEffect(() => {
    if (!s || started.current) return;
    started.current = true;
    const retestIds =
      mode === 'retest'
        ? idsParam.split(',').filter(Boolean).filter((id) => {
            const q = content.questionById.get(id);
            return !!q && q.pool !== 'mock';
          })
        : undefined;

    // Coming back to a quiz left mid-way (another tab of the app, a reload): pick up where it stopped.
    const open = fresh ? undefined : openSession(s.data.sessions, { mode, module, domain, ids: retestIds }, (id) => content.questionById.has(id));
    const init = async (): Promise<{ run: Run; done: AnswerRecord[] }> => {
      if (open) {
        const questions = open.questionIds.map((id) => content.questionById.get(id)!);
        return { run: { session: open, questions }, done: sessionAnswers(s.data.attempts, open.id).slice(0, questions.length) };
      }
      const questions =
        retestIds !== undefined
          ? retestIds.map((id) => content.questionById.get(id)!)
          : assembleQuiz({
              mode: mode as QuizMode,
              questions: content.questions,
              blueprint: content.bundle.blueprint,
              attempts: s.data.attempts,
              module,
              domain,
              studiedModules: s.snap.startedModules,
              dueQuestionIds: s.snap.dueQuestions,
            });
      const session = await startSession(
        { profileId: s.profile.id, mode, module, domain, questionIds: questions.map((q) => q.id), total: questions.length },
        new Date(),
      );
      return { run: { session, questions }, done: [] };
    };
    if (fresh) {
      const next = new URLSearchParams(params);
      next.delete('new');
      setParams(next, { replace: true });
    }
    void init().then(({ run, done }) => {
      setRun(run);
      setAnswers(done);
      const last = done.at(-1);
      if (last) {
        // Show the last answered question again with its explanation; "Next" continues.
        setIndex(done.length - 1);
        setSelected(last.chosen);
        setSubmitted(last);
      }
      shownAt.current = performance.now();
    });
  }, [s, mode, module, domain, idsParam, fresh, params, setParams]);

  const q = run?.questions[index];

  const submit = useCallback(
    async (confidence: Confidence) => {
      if (!run || !q || selected === null || submitted || !s) return;
      const rec: AnswerRecord = { questionId: q.id, chosen: selected, confidence };
      setSubmitted(rec);
      setAnswers((a) => [...a, rec]);
      await recordAnswer({
        profileId: s.profile.id,
        session: run.session,
        question: q,
        chosen: selected,
        confidence,
        timeMs: performance.now() - shownAt.current,
        now: new Date(),
        maxIntervalDays: s.snap.maxIntervalDays,
      });
    },
    [run, q, selected, submitted, s],
  );

  const next = useCallback(async () => {
    if (!run || !submitted) return;
    if (index + 1 >= run.questions.length) {
      const report = scoreQuiz(run.questions, [...answers]);
      await finishSession(run.session, report.correct, new Date(), content.bundle.blueprint.moduleQuizPass);
      // §4.1: intermediate users skip M0 by passing its 20-question check.
      if (mode === 'skipcheck' && s && report.pct >= SKIPCHECK_PASS) await saveProfile({ ...s.profile, foundationsSkipped: true });
      setFinished(true);
    } else {
      setIndex((i) => i + 1);
      setSelected(null);
      setSubmitted(null);
      shownAt.current = performance.now();
    }
  }, [run, submitted, index, answers, mode, s]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
      const k = e.key.toLowerCase();
      if (!submitted) {
        const i = ['1', '2', '3', '4'].indexOf(k) >= 0 ? Number(k) - 1 : ['a', 'b', 'c', 'd'].indexOf(k);
        if (i >= 0) setSelected(i);
        const c = CONFIDENCE.find((x) => x.key === k);
        if (c && selected !== null) void submit(c.value);
      } else if ((e.key === 'Enter' && !(e.target instanceof HTMLButtonElement)) || k === 'n') {
        e.preventDefault();
        void next();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [submitted, selected, submit, next]);

  const title = mode === 'retest' ? 'Re-test' : `${QUIZ_MODES[mode].title}${module !== undefined ? ` · M${module}` : ''}${domain ? ` · ${domain}` : ''}`;
  if (!s || !run) return <p className="text-muted">Loading…</p>;

  if (run.questions.length === 0) {
    return (
      <>
        <PageHeader title={title} />
        <Empty>No questions available for this mode yet.</Empty>
        <div className="mt-3">
          <ButtonLink to="/quiz" variant="secondary">
            Back to quizzes
          </ButtonLink>
        </div>
      </>
    );
  }

  if (finished) return <Summary run={run} answers={answers} mode={mode} module={module} />;

  const correct = submitted ? submitted.chosen === q!.answer : false;
  // Terms in the stem are clickable in place; the ones only found in the options get chips (options are buttons).
  const stemSeen = new Set<string>();
  const stem = <GlossaryText text={q!.stem} seen={stemSeen} />;
  const optionTerms = glossaryTerms(q!.options, stemSeen);
  return (
    <>
      <PageHeader title={title} subtitle={`Question ${index + 1} of ${run.questions.length}`} />
      <div className="mb-4">
        <ProgressBar value={index / run.questions.length} label="Quiz progress" />
      </div>
      <Card className="mx-auto max-w-3xl">
        <div className="mb-3 flex flex-wrap items-center gap-2 text-sm text-muted">
          <span className="font-semibold text-chestnut">M{q!.module}</span>
          <span>{q!.section}</span>
          <Badge title={`Difficulty ${q!.difficulty} of 3`}>{'●'.repeat(q!.difficulty)}</Badge>
          {q!.tags.includes('ec-council-specific') && <Badge tone="accent">EC-Council framing</Badge>}
          {q!.verify && <UnverifiedBadge />}
        </div>
        <p className="mb-4 font-serif text-lg leading-relaxed">{stem}</p>
        {optionTerms.length > 0 && (
          <div className="-mt-2 mb-4 flex flex-wrap items-center gap-2 text-sm text-muted">
            <span>Terms:</span>
            {optionTerms.map((e) => (
              <Term key={e.term} entry={e} chip />
            ))}
          </div>
        )}

        <div className="space-y-2" role="radiogroup" aria-label="Answer options">
          {q!.options.map((opt, i) => {
            const isChosen = selected === i;
            const isAnswer = q!.answer === i;
            let cls = 'border-line bg-surface hover:bg-surface-2';
            if (!submitted && isChosen) cls = 'border-chestnut bg-chestnut-soft';
            if (submitted && isAnswer) cls = 'border-olive bg-olive-soft';
            if (submitted && isChosen && !isAnswer) cls = 'border-burgundy bg-burgundy-soft';
            return (
              <button
                key={i}
                type="button"
                role="radio"
                aria-checked={isChosen}
                disabled={!!submitted}
                onClick={() => setSelected(i)}
                className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left transition disabled:cursor-default ${cls}`}
              >
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-current text-sm font-bold">{LETTERS[i]}</span>
                <span className="min-w-0 flex-1 pt-0.5">
                  {opt}
                  {submitted && <span className="mt-1 block text-sm text-muted">{q!.optionNotes[i]}</span>}
                </span>
              </button>
            );
          })}
        </div>

        {!submitted && selected !== null && (
          <div className="mt-4 rounded-lg border border-line bg-surface-2 p-3">
            <p className="mb-2 text-sm font-semibold">How sure are you? (this locks your answer)</p>
            <div className="grid grid-cols-3 gap-2">
              {CONFIDENCE.map((c) => (
                <Button key={c.value} variant={c.value === 'sure' ? 'primary' : 'secondary'} onClick={() => void submit(c.value)}>
                  {c.label} <span className="hidden text-xs font-normal opacity-70 sm:inline">({c.key.toUpperCase()})</span>
                </Button>
              ))}
            </div>
          </div>
        )}
        {!submitted && selected === null && <p className="mt-4 text-sm text-muted">Pick an answer (A–D or 1–4), then rate your confidence.</p>}

        {submitted && (
          <div className="mt-4">
            <p role="status" className={`mb-2 text-lg font-bold ${correct ? 'text-olive' : 'text-burgundy'}`}>
              {correct ? 'Correct' : `Not quite: the answer is ${LETTERS[q!.answer]}`}
              {!correct && submitted.confidence === 'sure' && <span className="ml-2 text-sm font-semibold">· confidently wrong, fix this one first</span>}
            </p>
            <Markdown source={q!.explanation} />
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm text-muted">
              <span>
                {q!.id} · Sources:{' '}
                {q!.sources.map((u, i) => (
                  <a key={u} href={u} target="_blank" rel="noreferrer" className="underline">
                    [{i + 1}]
                  </a>
                ))}
              </span>
              <ReportError item={q!} />
            </div>
            <Button className="mt-4 w-full" onClick={() => void next()}>
              {index + 1 >= run.questions.length ? 'See results' : 'Next question'} <span className="hidden text-xs font-normal opacity-80 sm:inline">(Enter)</span>
            </Button>
          </div>
        )}
      </Card>
    </>
  );
}

function Summary({ run, answers, mode, module }: { run: Run; answers: AnswerRecord[]; mode: QuizMode | 'retest'; module?: number }) {
  const r = scoreQuiz(run.questions, answers);
  const pass = content.bundle.blueprint.moduleQuizPass;
  return (
    <>
      <PageHeader title="Results" subtitle={`${r.correct} / ${r.total} correct`} />
      <Card className="mb-4">
        <div className="text-5xl font-bold tabular-nums">{pct(r.pct)}</div>
        {mode === 'module' && (
          <p className={`mt-2 font-semibold ${r.pct >= pass ? 'text-olive' : 'text-burgundy'}`}>
            {r.pct >= pass ? `Module quiz passed (≥ ${pct(pass)}).` : `Below ${pct(pass)}: review your misses, then take a fresh quiz.`}
          </p>
        )}
        {mode === 'pretest' && <p className="mt-2 text-muted">Pre-test scores are meant to be low. Now read the notes; this primed your attention.</p>}
        {mode === 'skipcheck' && (
          <p className={`mt-2 font-semibold ${r.pct >= SKIPCHECK_PASS ? 'text-olive' : 'text-burgundy'}`}>
            {r.pct >= SKIPCHECK_PASS
              ? 'Passed: M0 Foundations is skipped and your plan starts at M1. You can undo this in Settings.'
              : `Below ${pct(SKIPCHECK_PASS)}: M0 stays in your plan. Study the sections you missed, it only takes a few sessions.`}
          </p>
        )}
        {mode === 'diagnostic' && (
          <p className="mt-2 text-muted">This is your baseline, not a grade. Your weakest domains are now visible on the dashboard, and misses are in the mistake log.</p>
        )}
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {(['sure', 'unsure', 'guess'] as const).map((c) => (
            <div key={c} className="rounded-lg bg-surface-2 p-3">
              <div className="text-sm font-semibold capitalize">{c}</div>
              <div className="tabular-nums">
                {r.byConfidence[c].correct}/{r.byConfidence[c].total} right
              </div>
            </div>
          ))}
        </div>
        {r.confidentlyWrong.length > 0 && (
          <p className="mt-3 rounded-lg bg-burgundy-soft p-3 text-sm text-burgundy">
            {r.confidentlyWrong.length} confidently wrong answer{r.confidentlyWrong.length > 1 ? 's' : ''}. These are misconceptions; fix them first.
          </p>
        )}
      </Card>
      <div className="flex flex-wrap gap-2">
        <ButtonLink to="/mistakes">Open mistake log</ButtonLink>
        {module !== undefined && (
          <ButtonLink to={`/modules/${module}`} variant="secondary">
            Back to M{module}
          </ButtonLink>
        )}
        <ButtonLink to="/quiz" variant="secondary">
          Other quizzes
        </ButtonLink>
      </div>
    </>
  );
}
