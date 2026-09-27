import { QuestionTypeSchema, type DomainId, type Question, type QuestionType } from '../schemas/content.ts';
import type { Attempt, QuizSession } from '../schemas/progress.ts';
import type { Confidence } from './fsrs/scheduler.ts';
import { isMockMode, MOCK_KINDS, MOCK_TARGET, type MockKind } from './quiz/mock.ts';
import { addDays, localMidnight, startOfWeek, toISODate, type ISODate } from './dates.ts';

/**
 * Analytics page (§6.3 feature 8): accuracy breakdowns, time per question, calibration, weekly trend and
 * mock history. Unlike the readiness prediction (latest answer per question), these count every attempt:
 * they describe how you practised, not what you know now. Attempts with no answer (`chosen: null`) are left
 * out everywhere except mock scores, where an unanswered question counts as wrong, as on the exam.
 */

export type AnalyticsAttempt = Pick<Attempt, 'questionId' | 'sessionId' | 'chosen' | 'correct' | 'confidence' | 'timeMs' | 'at'>;
export type AnalyticsQuestion = Pick<Question, 'module' | 'domain' | 'type' | 'difficulty' | 'tags'>;
export type QuestionLookup = ReadonlyMap<string, AnalyticsQuestion>;
export type Difficulty = Question['difficulty'];

/** Mock pass target and the per-domain floor highlighted in mock history (one source: quiz/mock.ts). */
export { MOCK_TARGET, DOMAIN_FLOOR as MOCK_DOMAIN_FLOOR, isMockMode } from './quiz/mock.ts';
/** Gate on the share of answers that were wrong while rated "sure". */
export const CONFIDENTLY_WRONG_GATE = 0.05;
/** Times above this are capped for the mean (a question left open while away from the screen). */
export const TIME_CAP_MS = 10 * 60_000;
export const MOCK_MODES = MOCK_KINDS;
export type MockMode = MockKind;

/**
 * What a well-calibrated learner scores at each rating: "sure" should almost never miss (the 5% gate),
 * "unsure" is roughly down to two options, "guess" is one option in four.
 */
export const IDEAL_ACCURACY: Record<Confidence, number> = { sure: 0.95, unsure: 0.5, guess: 0.25 };
/** Low → high confidence, the x-axis order of the calibration chart. */
export const CONFIDENCE_ORDER: readonly Confidence[] = ['guess', 'unsure', 'sure'];

export interface AccuracyRow<K> {
  key: K;
  answered: number;
  correct: number;
  accuracy: number;
}

export interface AccuracyBreakdown {
  answered: number;
  correct: number;
  /** null when nothing was answered. */
  accuracy: number | null;
  modules: AccuracyRow<number>[];
  domains: AccuracyRow<DomainId>[];
  /** Most answered first, then worst accuracy. */
  tags: AccuracyRow<string>[];
  difficulty: AccuracyRow<Difficulty>[];
  types: AccuracyRow<QuestionType>[];
}

export function isAnswered(a: Pick<AnalyticsAttempt, 'chosen'>): boolean {
  return a.chosen !== null;
}

/** Epoch ms of local midnight starting the last `days` days, today included. */
export function periodStart(today: ISODate, days: number): number {
  return localMidnight(addDays(today, -(days - 1)));
}

export function attemptsSince<T extends Pick<AnalyticsAttempt, 'at'>>(attempts: T[], since: number): T[] {
  return attempts.filter((a) => a.at >= since);
}

type Tally = { answered: number; correct: number };

function bump<K>(map: Map<K, Tally>, key: K, correct: boolean): void {
  const t = map.get(key) ?? { answered: 0, correct: 0 };
  t.answered++;
  if (correct) t.correct++;
  map.set(key, t);
}

function rows<K>(map: Map<K, Tally>): AccuracyRow<K>[] {
  return [...map].map(([key, t]) => ({ key, answered: t.answered, correct: t.correct, accuracy: t.correct / t.answered }));
}

/** Accuracy by module, domain, tag, difficulty and question type. Only rows with answers are returned. */
export function accuracyBreakdown(attempts: AnalyticsAttempt[], questions: QuestionLookup): AccuracyBreakdown {
  const modules = new Map<number, Tally>();
  const domains = new Map<DomainId, Tally>();
  const tags = new Map<string, Tally>();
  const difficulty = new Map<Difficulty, Tally>();
  const types = new Map<QuestionType, Tally>();
  let answered = 0;
  let correct = 0;
  for (const a of attempts) {
    const q = questions.get(a.questionId);
    if (!q || !isAnswered(a)) continue;
    answered++;
    if (a.correct) correct++;
    bump(modules, q.module, a.correct);
    bump(domains, q.domain, a.correct);
    for (const t of new Set(q.tags)) bump(tags, t, a.correct);
    bump(difficulty, q.difficulty, a.correct);
    bump(types, q.type, a.correct);
  }
  const typeOrder = QuestionTypeSchema.options;
  return {
    answered,
    correct,
    accuracy: answered === 0 ? null : correct / answered,
    modules: rows(modules).sort((a, b) => a.key - b.key),
    domains: rows(domains).sort((a, b) => a.key.localeCompare(b.key, 'en', { numeric: true })),
    tags: rows(tags).sort((a, b) => b.answered - a.answered || a.accuracy - b.accuracy || a.key.localeCompare(b.key)),
    difficulty: rows(difficulty).sort((a, b) => a.key - b.key),
    types: rows(types).sort((a, b) => typeOrder.indexOf(a.key) - typeOrder.indexOf(b.key)),
  };
}

export interface TimeStats {
  count: number;
  medianSec: number;
  /** Mean with each time capped at TIME_CAP_MS. */
  meanSec: number;
}

export interface TimeBreakdown {
  overall: TimeStats | null;
  types: ({ key: QuestionType } & TimeStats)[];
  difficulty: ({ key: Difficulty } & TimeStats)[];
}

/** Median (uncapped) and capped mean of durations in ms; zero times (not measured) are ignored. */
export function timeStats(durationsMs: number[]): TimeStats | null {
  const xs = durationsMs.filter((t) => t > 0).sort((a, b) => a - b);
  if (xs.length === 0) return null;
  const mid = xs.length >> 1;
  const median = xs.length % 2 ? xs[mid]! : (xs[mid - 1]! + xs[mid]!) / 2;
  const mean = xs.reduce((s, t) => s + Math.min(t, TIME_CAP_MS), 0) / xs.length;
  return { count: xs.length, medianSec: median / 1000, meanSec: mean / 1000 };
}

/** Time per answered question, overall and by question type and difficulty. */
export function timeBreakdown(attempts: AnalyticsAttempt[], questions: QuestionLookup): TimeBreakdown {
  const all: number[] = [];
  const types = new Map<QuestionType, number[]>();
  const difficulty = new Map<Difficulty, number[]>();
  const push = <K>(map: Map<K, number[]>, key: K, ms: number) => {
    const list = map.get(key);
    if (list) list.push(ms);
    else map.set(key, [ms]);
  };
  for (const a of attempts) {
    const q = questions.get(a.questionId);
    if (!q || !isAnswered(a)) continue;
    all.push(a.timeMs);
    push(types, q.type, a.timeMs);
    push(difficulty, q.difficulty, a.timeMs);
  }
  const group = <K>(map: Map<K, number[]>) =>
    [...map].flatMap(([key, ms]) => {
      const s = timeStats(ms);
      return s ? [{ key, ...s }] : [];
    });
  const typeOrder = QuestionTypeSchema.options;
  return {
    overall: timeStats(all),
    types: group(types).sort((a, b) => typeOrder.indexOf(a.key) - typeOrder.indexOf(b.key)),
    difficulty: group(difficulty).sort((a, b) => a.key - b.key),
  };
}

export interface CalibrationPoint {
  confidence: Confidence;
  answered: number;
  correct: number;
  accuracy: number | null;
  ideal: number;
}

export interface Calibration {
  /** In CONFIDENCE_ORDER (guess → sure). */
  points: CalibrationPoint[];
  answered: number;
  confidentlyWrong: number;
  /** Sure-and-wrong answers over all answers (0 when nothing was answered). */
  confidentlyWrongRate: number;
}

/** Accuracy per confidence rating over answered attempts, plus the confidently-wrong rate. */
export function calibration(attempts: AnalyticsAttempt[]): Calibration {
  const by = new Map<Confidence, Tally>();
  let answered = 0;
  let confidentlyWrong = 0;
  for (const a of attempts) {
    if (!isAnswered(a)) continue;
    answered++;
    bump(by, a.confidence, a.correct);
    if (a.confidence === 'sure' && !a.correct) confidentlyWrong++;
  }
  return {
    points: CONFIDENCE_ORDER.map((confidence) => {
      const t = by.get(confidence) ?? { answered: 0, correct: 0 };
      return { confidence, ...t, accuracy: t.answered === 0 ? null : t.correct / t.answered, ideal: IDEAL_ACCURACY[confidence] };
    }),
    answered,
    confidentlyWrong,
    confidentlyWrongRate: answered === 0 ? 0 : confidentlyWrong / answered,
  };
}

export interface WeekPoint {
  /** Monday of the ISO week (local time). */
  week: ISODate;
  answered: number;
  correct: number;
  accuracy: number | null;
}

/** Accuracy per ISO week (Monday start, local time) for the `weeks` weeks ending with the current one, oldest first. */
export function weeklyTrend(attempts: AnalyticsAttempt[], today: ISODate, weeks = 12): WeekPoint[] {
  const first = addDays(startOfWeek(today), -7 * (weeks - 1));
  const tallies = new Map<ISODate, Tally>();
  for (const a of attempts) {
    if (!isAnswered(a)) continue;
    const week = startOfWeek(toISODate(new Date(a.at)));
    if (week >= first) bump(tallies, week, a.correct);
  }
  return Array.from({ length: weeks }, (_, i) => {
    const week = addDays(first, 7 * i);
    const t = tallies.get(week) ?? { answered: 0, correct: 0 };
    return { week, ...t, accuracy: t.answered === 0 ? null : t.correct / t.answered };
  });
}

export interface MockDomain {
  domain: DomainId;
  questions: number;
  correct: number;
  accuracy: number;
}

export interface MockResult {
  sessionId: string;
  mode: MockMode;
  finishedAt: number;
  correct: number;
  total: number;
  score: number;
  passed: boolean;
  /** Per-domain accuracy from the session's attempts (latest per question; unanswered = wrong), by domain id. */
  domains: MockDomain[];
}

/** Finished half and full mocks, newest first. */
export function mockHistory(
  sessions: Pick<QuizSession, 'id' | 'mode' | 'finishedAt' | 'correct' | 'total'>[],
  attempts: AnalyticsAttempt[],
  questions: QuestionLookup,
): MockResult[] {
  const bySession = new Map<string, Map<string, AnalyticsAttempt>>();
  for (const a of attempts) {
    const latest = bySession.get(a.sessionId) ?? new Map<string, AnalyticsAttempt>();
    const prev = latest.get(a.questionId);
    if (!prev || a.at > prev.at) latest.set(a.questionId, a);
    bySession.set(a.sessionId, latest);
  }
  return sessions
    .filter((s): s is typeof s & { mode: MockMode; finishedAt: number } => s.finishedAt !== undefined && isMockMode(s.mode))
    .sort((a, b) => b.finishedAt - a.finishedAt)
    .map((s) => {
      const domains = new Map<DomainId, Tally>();
      for (const a of bySession.get(s.id)?.values() ?? []) {
        const q = questions.get(a.questionId);
        if (q) bump(domains, q.domain, a.correct);
      }
      const correct = s.correct ?? 0;
      const score = s.total === 0 ? 0 : correct / s.total;
      return {
        sessionId: s.id,
        mode: s.mode,
        finishedAt: s.finishedAt,
        correct,
        total: s.total,
        score,
        passed: score >= MOCK_TARGET,
        domains: rows(domains)
          .sort((a, b) => a.key.localeCompare(b.key, 'en', { numeric: true }))
          .map((r) => ({ domain: r.key, questions: r.answered, correct: r.correct, accuracy: r.accuracy })),
      };
    });
}
