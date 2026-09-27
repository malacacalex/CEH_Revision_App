import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { content } from '../../content/bundle.ts';
import { finishSession, recordAnswer, saveMockProgress, startSession } from '../../db/repo.ts';
import type { Confidence } from '../../domain/fsrs/scheduler.ts';
import { assembleMock, mockSpec, type MockKind } from '../../domain/quiz/mock.ts';
import { openSession } from '../../domain/quiz/resume.ts';
import type { Question } from '../../schemas/content.ts';
import type { MockAnswer, QuizSession } from '../../schemas/progress.ts';
import { useSnapshot } from '../../state/ProfileContext.tsx';
import { Button, ButtonLink, Card, Empty, PageHeader, ProgressBar } from '../../ui/kit.tsx';

const LETTERS = ['A', 'B', 'C', 'D'];
const CONFIDENCE: { value: Confidence; label: string; key: string }[] = [
  { value: 'sure', label: 'Sure', key: 's' },
  { value: 'unsure', label: 'Unsure', key: 'u' },
  { value: 'guess', label: 'Guess', key: 'g' },
];
const EMPTY: MockAnswer = { chosen: null, confidence: null, flagged: false, timeMs: 0 };
const SAVE_EVERY_MS = 3_000;

export function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * Exam-like mock (§6.3): timer, flag for review, answers can change until submit, no feedback before it.
 * The clock only runs while the page is visible, so leaving the app pauses the mock.
 */
export function MockRun() {
  const s = useSnapshot();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const kind: MockKind = params.get('kind') === 'half-mock' ? 'half-mock' : 'full-mock';
  const fresh = params.get('new') === '1';
  const spec = mockSpec(content.bundle.blueprint, kind);

  const [session, setSession] = useState<QuizSession | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [draft, setDraft] = useState<Record<string, MockAnswer>>({});
  const [index, setIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [reviewing, setReviewing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const started = useRef(false);
  // Refs mirror the state the clock and the saver read, so they don't restart on every change.
  const draftRef = useRef(draft);
  const elapsedRef = useRef(0);
  const currentId = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!s || started.current) return;
    started.current = true;
    const open = fresh ? undefined : openSession(s.data.sessions, { mode: kind }, (id) => content.questionById.has(id));
    const init = async (): Promise<{ session: QuizSession; questions: Question[] }> => {
      if (open) return { session: open, questions: open.questionIds.map((id) => content.questionById.get(id)!) };
      const plan = assembleMock({ kind, questions: content.questions, blueprint: content.bundle.blueprint, attempts: s.data.attempts });
      const created = await startSession(
        {
          profileId: s.profile.id,
          mode: kind,
          questionIds: plan.questions.map((q) => q.id),
          total: plan.questions.length,
          timeLimitMs: plan.minutes * 60_000,
          elapsedMs: 0,
          draft: {},
          composition: plan.slots,
        },
        new Date(),
      );
      return { session: created, questions: plan.questions };
    };
    if (fresh) {
      const next = new URLSearchParams(params);
      next.delete('new');
      setParams(next, { replace: true });
    }
    void init().then((r) => {
      const d = r.session.draft ?? {};
      draftRef.current = d;
      elapsedRef.current = r.session.elapsedMs ?? 0;
      setSession(r.session);
      setQuestions(r.questions);
      setDraft(d);
      setElapsed(elapsedRef.current);
      // Reopen on the first unanswered question.
      const firstOpen = r.questions.findIndex((q) => d[q.id]?.chosen == null);
      setIndex(firstOpen < 0 ? 0 : firstOpen);
    });
  }, [s, kind, fresh, params, setParams]);

  const q = questions[index];
  useEffect(() => {
    currentId.current = q?.id;
  }, [q]);
  const limit = session?.timeLimitMs ?? spec.minutes * 60_000;

  const save = useCallback(async () => {
    if (!session) return;
    await saveMockProgress(session.id, { draft: draftRef.current, elapsedMs: Math.round(elapsedRef.current) });
  }, [session]);

  const update = useCallback((id: string, patch: Partial<MockAnswer>) => {
    const next = { ...draftRef.current, [id]: { ...EMPTY, ...draftRef.current[id], ...patch } };
    draftRef.current = next;
    setDraft(next);
  }, []);

  // Persist each answer change right away (a reload or another tab must not lose it).
  useEffect(() => {
    if (session && !submitting) void save();
  }, [draft, session, submitting, save]);

  const submit = useCallback(async () => {
    if (!s || !session || submitting) return;
    setSubmitting(true);
    await save();
    const now = new Date();
    let correct = 0;
    for (const question of questions) {
      const a = draftRef.current[question.id] ?? EMPTY;
      const attempt = await recordAnswer({
        profileId: s.profile.id,
        session,
        question,
        chosen: a.chosen,
        // Answers left without a rating count as "unsure": neither inflates nor hides calibration errors.
        confidence: a.confidence ?? 'unsure',
        timeMs: a.timeMs,
        now,
        maxIntervalDays: s.snap.maxIntervalDays,
      });
      if (attempt.correct) correct++;
    }
    await finishSession({ ...session, draft: draftRef.current, elapsedMs: Math.round(elapsedRef.current) }, correct, now);
    navigate(`/mock/result/${session.id}`, { replace: true });
  }, [s, session, submitting, questions, save, navigate]);

  const submitRef = useRef(submit);
  useEffect(() => {
    submitRef.current = submit;
  }, [submit]);

  // The clock: active time only, per-question time too; saved every few seconds and when the page hides.
  // When time is up it submits what there is, like the real exam.
  useEffect(() => {
    if (!session || submitting) return;
    let last = performance.now();
    let sinceSave = 0;
    const id = window.setInterval(() => {
      const now = performance.now();
      const d = now - last;
      last = now;
      if (document.hidden) return;
      elapsedRef.current += d;
      sinceSave += d;
      const cur = currentId.current;
      if (cur) draftRef.current = { ...draftRef.current, [cur]: { ...EMPTY, ...draftRef.current[cur], timeMs: (draftRef.current[cur]?.timeMs ?? 0) + d } };
      setElapsed(elapsedRef.current);
      if (elapsedRef.current >= limit) {
        void submitRef.current();
        return;
      }
      if (sinceSave >= SAVE_EVERY_MS) {
        sinceSave = 0;
        void save();
      }
    }, 1000);
    const onHide = () => document.hidden && void save();
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', onHide);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', onHide);
      void save();
    };
  }, [session, submitting, save, limit]);

  const go = useCallback((i: number) => {
    setReviewing(false);
    setConfirming(false);
    setIndex(Math.max(0, Math.min(questions.length - 1, i)));
  }, [questions.length]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!q || reviewing || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const k = e.key.toLowerCase();
      const opt = ['1', '2', '3', '4'].indexOf(k) >= 0 ? Number(k) - 1 : ['a', 'b', 'c', 'd'].indexOf(k);
      if (opt >= 0) update(q.id, { chosen: opt });
      const c = CONFIDENCE.find((x) => x.key === k);
      if (c) update(q.id, { confidence: c.value });
      if (k === 'f') update(q.id, { flagged: !draftRef.current[q.id]?.flagged });
      if (e.key === 'ArrowRight' || k === 'n') go(index + 1);
      if (e.key === 'ArrowLeft' || k === 'p') go(index - 1);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [q, reviewing, index, update, go]);

  if (!s || !session) return <p className="text-muted">{submitting ? 'Scoring…' : 'Loading…'}</p>;
  if (questions.length === 0) {
    return (
      <>
        <PageHeader title={spec.title} />
        <Empty>The mock pool has no questions yet.</Empty>
      </>
    );
  }

  const answered = questions.filter((x) => draft[x.id]?.chosen != null).length;
  const flagged = questions.filter((x) => draft[x.id]?.flagged).length;
  const remaining = limit - elapsed;
  const clock = (
    <div
      role="timer"
      aria-label="Time left"
      className={`rounded-lg border px-3 py-1.5 font-mono text-lg font-bold tabular-nums ${remaining < 5 * 60_000 ? 'border-burgundy text-burgundy' : 'border-line'}`}
    >
      {formatClock(remaining)}
    </div>
  );
  const header = (
    <PageHeader
      title={spec.title}
      subtitle={`${answered}/${questions.length} answered · ${flagged} flagged · the clock pauses when you leave this page`}
      actions={
        <div className="flex items-center gap-2">
          {clock}
          {!reviewing && (
            <Button variant="secondary" onClick={() => setReviewing(true)}>
              Review and submit
            </Button>
          )}
        </div>
      }
    />
  );

  const grid = (
    <Card className="mt-4">
      <details open={questions.length <= 70}>
        <summary className="cursor-pointer font-semibold">All questions</summary>
        <div className="mt-3 grid grid-cols-[repeat(auto-fill,minmax(2.5rem,1fr))] gap-1.5">
          {questions.map((x, i) => {
            const a = draft[x.id];
            const done = a?.chosen != null;
            return (
              <button
                key={x.id}
                type="button"
                onClick={() => go(i)}
                aria-label={`Question ${i + 1}${done ? ', answered' : ''}${a?.flagged ? ', flagged' : ''}`}
                aria-current={i === index && !reviewing ? 'step' : undefined}
                className={`relative h-9 rounded-md border text-sm font-semibold tabular-nums ${done ? 'border-olive bg-olive-soft' : 'border-line bg-surface'} ${i === index && !reviewing ? 'ring-2 ring-chestnut' : ''}`}
              >
                {i + 1}
                {a?.flagged && <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-amber" aria-hidden />}
              </button>
            );
          })}
        </div>
      </details>
    </Card>
  );

  if (reviewing) {
    const unanswered = questions.map((x, i) => ({ x, i })).filter(({ x }) => draft[x.id]?.chosen == null);
    const flaggedList = questions.map((x, i) => ({ x, i })).filter(({ x }) => draft[x.id]?.flagged);
    const unrated = questions.filter((x) => draft[x.id]?.chosen != null && !draft[x.id]?.confidence).length;
    const jump = (list: { i: number }[]) => (
      <div className="mt-1 flex flex-wrap gap-1.5">
        {list.map(({ i }) => (
          <button key={i} type="button" onClick={() => go(i)} className="h-8 min-w-8 rounded-md border border-line bg-surface px-2 text-sm font-semibold tabular-nums">
            {i + 1}
          </button>
        ))}
      </div>
    );
    return (
      <>
        {header}
        <Card className="mx-auto max-w-3xl space-y-4">
          <h2 className="text-lg font-bold">Before you submit</h2>
          <p>
            {answered} of {questions.length} answered, {formatClock(remaining)} left. Unanswered questions count as wrong.
          </p>
          {unanswered.length > 0 && (
            <div>
              <p className="font-semibold">Unanswered ({unanswered.length})</p>
              {jump(unanswered)}
            </div>
          )}
          {flaggedList.length > 0 && (
            <div>
              <p className="font-semibold">Flagged for review ({flaggedList.length})</p>
              {jump(flaggedList)}
            </div>
          )}
          {unrated > 0 && <p className="text-sm text-muted">{unrated} answer(s) have no confidence rating; they count as Unsure.</p>}
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => go(index)}>
              Back to the questions
            </Button>
            {confirming ? (
              <Button onClick={() => void submit()} disabled={submitting}>
                {submitting ? 'Scoring…' : 'Yes, submit: answers are final'}
              </Button>
            ) : (
              <Button onClick={() => setConfirming(true)}>Submit the mock</Button>
            )}
          </div>
        </Card>
        {grid}
      </>
    );
  }

  const a = draft[q!.id] ?? EMPTY;
  return (
    <>
      {header}
      <div className="mb-4">
        <ProgressBar value={elapsed / limit} tone={remaining < 5 * 60_000 ? 'bad' : 'accent'} label="Time used" />
      </div>
      <Card className="mx-auto max-w-3xl">
        <div className="mb-3 flex items-center justify-between gap-2">
          <span className="font-semibold">
            Question {index + 1} of {questions.length}
          </span>
          <Button variant={a.flagged ? 'primary' : 'secondary'} aria-pressed={a.flagged} onClick={() => update(q!.id, { flagged: !a.flagged })}>
            {a.flagged ? 'Flagged' : 'Flag for review'} <span className="hidden text-xs font-normal opacity-70 sm:inline">(F)</span>
          </Button>
        </div>
        <p className="mb-4 font-serif text-lg leading-relaxed">{q!.stem}</p>
        <div className="space-y-2" role="radiogroup" aria-label="Answer options">
          {q!.options.map((opt, i) => (
            <button
              key={i}
              type="button"
              role="radio"
              aria-checked={a.chosen === i}
              onClick={() => update(q!.id, { chosen: i })}
              className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left transition ${a.chosen === i ? 'border-chestnut bg-chestnut-soft' : 'border-line bg-surface hover:bg-surface-2'}`}
            >
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-current text-sm font-bold">{LETTERS[i]}</span>
              <span className="min-w-0 flex-1 pt-0.5">{opt}</span>
            </button>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted">How sure?</span>
          {CONFIDENCE.map((c) => (
            <button
              key={c.value}
              type="button"
              aria-pressed={a.confidence === c.value}
              onClick={() => update(q!.id, { confidence: c.value })}
              className={`min-h-8 rounded-full border px-3 ${a.confidence === c.value ? 'border-chestnut bg-chestnut-soft font-semibold' : 'border-line bg-surface'}`}
            >
              {c.label} <span className="hidden opacity-60 sm:inline">({c.key.toUpperCase()})</span>
            </button>
          ))}
        </div>
        <div className="mt-5 flex justify-between gap-2">
          <Button variant="secondary" onClick={() => go(index - 1)} disabled={index === 0}>
            Previous
          </Button>
          {index + 1 < questions.length ? (
            <Button onClick={() => go(index + 1)}>Next</Button>
          ) : (
            <Button onClick={() => setReviewing(true)}>Review and submit</Button>
          )}
        </div>
      </Card>
      {grid}
      <p className="mt-3 text-center text-sm text-muted">
        Keys: A–D or 1–4 answer · S / U / G confidence · F flag · ← → move. No feedback until you submit.
      </p>
      <div className="mt-2 text-center">
        <ButtonLink to="/quiz" variant="ghost">
          Leave (your answers and time are kept)
        </ButtonLink>
      </div>
    </>
  );
}
