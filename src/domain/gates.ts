import type { ModuleProgress } from '../schemas/progress.ts';

export interface GateItem {
  key: 'pretest' | 'notes' | 'reading' | 'quiz' | 'feynman' | 'cards';
  label: string;
  done: boolean;
}

export interface GateStatus {
  items: GateItem[];
  done: boolean;
  /** Share of gate items done, used by the planner to shrink the remaining effort. */
  fraction: number;
  started: boolean;
}

export function sentenceCount(text: string): number {
  return text
    .split(/[.!?]+(?:\s|$)/)
    .map((s) => s.trim())
    .filter((s) => s.split(/\s+/).length >= 3).length;
}

export const FEYNMAN_MIN_SENTENCES = 5;

/**
 * §5.5 module gate: notes reviewed (+ Reading Map if the user owns the courseware), a fresh module
 * quiz ≥ 80%, a Feynman summary, and every flashcard introduced. The pre-test is tracked but not required.
 */
export function moduleGate(
  mp: ModuleProgress | undefined,
  opts: { ownsCourseware: boolean; cardsTotal: number; cardsIntroduced: number },
): GateStatus {
  const items: GateItem[] = [
    { key: 'pretest', label: 'Pre-test taken', done: !!mp?.pretestDoneAt },
    { key: 'notes', label: 'Notes reviewed', done: !!mp?.notesReviewedAt },
    ...(opts.ownsCourseware ? [{ key: 'reading' as const, label: 'Reading Map done', done: !!mp?.readingMapDoneAt }] : []),
    { key: 'quiz', label: 'Module quiz ≥ 80%', done: !!mp?.moduleQuizPassedAt },
    { key: 'feynman', label: `Feynman summary (${FEYNMAN_MIN_SENTENCES}+ sentences)`, done: sentenceCount(mp?.feynman ?? '') >= FEYNMAN_MIN_SENTENCES },
    {
      key: 'cards',
      label: `All flashcards introduced (${Math.min(opts.cardsIntroduced, opts.cardsTotal)}/${opts.cardsTotal})`,
      done: opts.cardsIntroduced >= opts.cardsTotal,
    },
  ];
  const required = items.filter((i) => i.key !== 'pretest');
  const done = required.every((i) => i.done);
  return {
    items,
    done,
    fraction: items.filter((i) => i.done).length / items.length,
    started: !!mp?.startedAt || items.some((i) => i.done && i.key !== 'cards'),
  };
}

export interface ReadinessItem {
  key: string;
  label: string;
  done: boolean;
  /** What stands behind the tick, e.g. "last two: 81%, 88%". */
  detail: string;
}

/** What the go/no-go needs from each finished full mock (see mockOutcomes). */
export interface MockResult {
  pct: number;
  /** Accuracy per exam domain answered in this mock. */
  byDomain: Map<string, number>;
  answered: number;
  confidentlyWrong: number;
}

/**
 * §5.5 "Enter Phase 3": every module with content is done, and the review backlog is under a day
 * (nothing has been due for more than 24 hours).
 */
export function phase3Gate(opts: { modulesWithContent: number[]; doneModules: number[]; oldestDueMs: number | null; now: number }): ReadinessItem[] {
  const left = opts.modulesWithContent.filter((m) => !opts.doneModules.includes(m));
  const backlogDays = opts.oldestDueMs === null ? 0 : Math.max(0, (opts.now - opts.oldestDueMs) / 86_400_000);
  return [
    {
      key: 'modules',
      label: 'Every module done',
      done: left.length === 0,
      detail: left.length === 0 ? 'all modules pass their gate' : `${left.length} to go: ${left.map((m) => `M${m}`).join(', ')}`,
    },
    {
      key: 'backlog',
      label: 'Review backlog under one day',
      done: backlogDays < 1,
      detail: backlogDays < 1 ? 'reviews are up to date' : `oldest review is ${Math.floor(backlogDays)} day(s) overdue`,
    },
  ];
}

/**
 * §5.5 exam-ready go/no-go: the last two full mocks ≥ 85%, no domain under 75% in the latest one,
 * confidently wrong under 5% over those mocks, and at least one external practice exam ≥ 80%.
 * `fullMocks` is sorted oldest first.
 */
export function examReadyGate(fullMocks: MockResult[], external: { score: number }[], opts: { target: number; floor: number }): ReadinessItem[] {
  const lastTwo = fullMocks.slice(-2);
  const latest = fullMocks.at(-1);
  const weak = latest ? [...latest.byDomain].filter(([, acc]) => acc < opts.floor) : [];
  const answered = lastTwo.reduce((s, m) => s + m.answered, 0);
  const sureWrong = lastTwo.reduce((s, m) => s + m.confidentlyWrong, 0);
  const cwRate = answered === 0 ? null : sureWrong / answered;
  const bestExternal = external.length === 0 ? null : Math.max(...external.map((e) => e.score));
  const pctText = (x: number) => `${Math.round(x * 100)}%`;
  return [
    {
      key: 'mocks',
      label: `Two full mocks in a row ≥ ${pctText(opts.target)}`,
      done: lastTwo.length === 2 && lastTwo.every((m) => m.pct >= opts.target),
      detail: lastTwo.length === 0 ? 'no full mock yet' : `last ${lastTwo.length === 2 ? 'two' : 'one'}: ${lastTwo.map((m) => pctText(m.pct)).join(', ')}`,
    },
    {
      key: 'domains',
      label: `No domain under ${pctText(opts.floor)}`,
      done: !!latest && weak.length === 0,
      detail: !latest ? 'no full mock yet' : weak.length === 0 ? 'every domain clears it in the latest full mock' : `below: ${weak.map(([d, acc]) => `${d} ${pctText(acc)}`).join(', ')}`,
    },
    {
      key: 'calibration',
      label: 'Confidently wrong under 5%',
      done: cwRate !== null && cwRate < 0.05,
      detail: cwRate === null ? 'no full mock yet' : `${pctText(cwRate)} of answers in the last full mocks`,
    },
    {
      key: 'external',
      label: 'An external practice exam ≥ 80%',
      done: bestExternal !== null && bestExternal >= 0.8,
      detail: bestExternal === null ? 'none recorded yet' : `best: ${pctText(bestExternal)}`,
    },
  ];
}
