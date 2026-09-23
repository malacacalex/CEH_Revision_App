import type { Blueprint, Question } from '../schemas/content.ts';
import type { Attempt, CardReview, Mistake, ModuleProgress, Profile, QuizSession } from '../schemas/progress.ts';
import { addDays, localMidnight, toISODate } from './dates.ts';
import { lastAttempts } from './quiz/assemble.ts';
import { predictScore, studyStreak } from './readiness/readiness.ts';

/**
 * "Export for Claude review" (§6.3 feature 12): a compact, self-explaining snapshot of one profile that
 * the owner pastes into /weekly-review and anyone else can paste into any AI tutor. No personal data
 * beyond the profile name the user chose; ids refer to the public content repo.
 */
export interface ReviewExport {
  format: 'shieldup-review';
  version: 1;
  generatedOn: string;
  appVersion: string;
  contentVersion: string;
  learner: { name: string; level: Profile['level']; hoursPerWeek: number; exam: Profile['exam']; foundationsSkipped: boolean };
  adherence: {
    /** Days with at least one answer or card review. */
    activeDaysLast7: number;
    activeDaysLast28: number;
    streak: number;
    questionsLast7: number;
    cardReviewsLast7: number;
    quizzesFinishedLast7: number;
  };
  stats: {
    questionsAnswered: number;
    accuracyLatest: number | null;
    predicted: { score: number; low: number; high: number };
    domains: { domain: string; name: string; weight: number; answered: number; estimate: number }[];
    modules: { module: number; answered: number; accuracy: number; moduleQuizBest: number | null; gatePassed: boolean }[];
    recentQuizzes: { date: string; mode: string; module?: number; score: number; total: number }[];
  };
  weakTags: { tag: string; answered: number; accuracy: number }[];
  calibration: {
    /** Accuracy per confidence rating, latest answer per question. Well calibrated: sure ≫ unsure ≫ guess. */
    sure: { answered: number; accuracy: number | null };
    unsure: { answered: number; accuracy: number | null };
    guess: { answered: number; accuracy: number | null };
    confidentlyWrongRate: number;
  };
  mistakeCauses: Record<string, number>;
  recentMistakes: { id: string; module: number; section: string; tags: string[]; stem: string; misses: number; cause: string | null; confidentlyWrong: boolean; note?: string }[];
  feynman: { module: number; date: string; text: string }[];
}

export interface ReviewInput {
  profile: Profile;
  questions: Question[];
  blueprint: Blueprint;
  attempts: Attempt[];
  cardReviews: CardReview[];
  sessions: QuizSession[];
  mistakes: Mistake[];
  progress: ModuleProgress[];
  appVersion: string;
  contentVersion: string;
  now: Date;
}

const WEAK_TAG_MIN = 3;
const WEAK_TAG_LIMIT = 12;
const MISTAKE_LIMIT = 15;
const STEM_MAX = 180;

const round = (x: number) => Math.round(x * 1000) / 1000;
const ratio = (ok: number, n: number) => (n === 0 ? null : round(ok / n));
const clip = (s: string, max: number) => (s.length <= max ? s : `${s.slice(0, max - 1)}…`);

export function buildReview(input: ReviewInput): ReviewExport {
  const { profile, questions, attempts, now } = input;
  const today = toISODate(now);
  const byId = new Map(questions.map((q) => [q.id, q]));
  const day = (t: number) => toISODate(new Date(t));
  const last7 = localMidnight(addDays(today, -6));

  const activeDays = new Set([...attempts.map((a) => day(a.at)), ...input.cardReviews.map((r) => day(r.at))]);
  const activeSince = (from: string) => [...activeDays].filter((d) => d >= from).length;

  const latest = [...lastAttempts(attempts).values()];
  const okLatest = latest.filter((a) => a.correct).length;
  const prediction = predictScore(input.blueprint, questions, attempts);

  const perModule = new Map<number, { ok: number; n: number }>();
  const perTag = new Map<string, { ok: number; n: number }>();
  const perConfidence = { sure: { ok: 0, n: 0 }, unsure: { ok: 0, n: 0 }, guess: { ok: 0, n: 0 } };
  for (const a of latest) {
    const q = byId.get(a.questionId);
    if (!q) continue;
    const bump = (s: { ok: number; n: number }) => {
      s.n++;
      if (a.correct) s.ok++;
      return s;
    };
    perModule.set(q.module, bump(perModule.get(q.module) ?? { ok: 0, n: 0 }));
    for (const t of q.tags) perTag.set(t, bump(perTag.get(t) ?? { ok: 0, n: 0 }));
    bump(perConfidence[a.confidence]);
  }
  const progressBy = new Map(input.progress.map((p) => [p.module, p]));

  const causes: Record<string, number> = {};
  for (const m of input.mistakes) {
    if (m.resolved) continue;
    const k = m.cause ?? 'untagged';
    causes[k] = (causes[k] ?? 0) + 1;
  }

  return {
    format: 'shieldup-review',
    version: 1,
    generatedOn: today,
    appVersion: input.appVersion,
    contentVersion: input.contentVersion,
    learner: { name: profile.name, level: profile.level, hoursPerWeek: profile.hoursPerWeek, exam: profile.exam, foundationsSkipped: profile.foundationsSkipped },
    adherence: {
      activeDaysLast7: activeSince(addDays(today, -6)),
      activeDaysLast28: activeSince(addDays(today, -27)),
      streak: studyStreak(activeDays, today, addDays),
      questionsLast7: attempts.filter((a) => a.at >= last7).length,
      cardReviewsLast7: input.cardReviews.filter((r) => r.at >= last7).length,
      quizzesFinishedLast7: input.sessions.filter((s) => s.finishedAt !== undefined && s.finishedAt >= last7).length,
    },
    stats: {
      questionsAnswered: latest.length,
      accuracyLatest: ratio(okLatest, latest.length),
      predicted: { score: round(prediction.score), low: round(prediction.low), high: round(prediction.high) },
      domains: prediction.domains.map((d) => ({ ...d, estimate: round(d.estimate) })),
      modules: [...perModule.entries()]
        .sort(([a], [b]) => a - b)
        .map(([module, s]) => ({
          module,
          answered: s.n,
          accuracy: round(s.ok / s.n),
          moduleQuizBest: progressBy.get(module)?.bestModuleQuiz ?? null,
          gatePassed: progressBy.get(module)?.moduleQuizPassedAt !== undefined,
        })),
      recentQuizzes: input.sessions
        .filter((s): s is QuizSession & { finishedAt: number } => s.finishedAt !== undefined)
        .sort((a, b) => b.finishedAt - a.finishedAt)
        .slice(0, 10)
        .map((s) => ({ date: day(s.finishedAt), mode: s.mode, ...(s.module !== undefined && { module: s.module }), score: s.correct ?? 0, total: s.total })),
    },
    weakTags: [...perTag.entries()]
      .filter(([, s]) => s.n >= WEAK_TAG_MIN)
      .map(([tag, s]) => ({ tag, answered: s.n, accuracy: round(s.ok / s.n) }))
      .sort((a, b) => a.accuracy - b.accuracy || b.answered - a.answered)
      .slice(0, WEAK_TAG_LIMIT),
    calibration: {
      sure: { answered: perConfidence.sure.n, accuracy: ratio(perConfidence.sure.ok, perConfidence.sure.n) },
      unsure: { answered: perConfidence.unsure.n, accuracy: ratio(perConfidence.unsure.ok, perConfidence.unsure.n) },
      guess: { answered: perConfidence.guess.n, accuracy: ratio(perConfidence.guess.ok, perConfidence.guess.n) },
      confidentlyWrongRate: round(prediction.confidentlyWrongRate),
    },
    mistakeCauses: causes,
    recentMistakes: input.mistakes
      .filter((m) => !m.resolved && byId.has(m.questionId))
      .sort((a, b) => b.lastMissedAt - a.lastMissedAt)
      .slice(0, MISTAKE_LIMIT)
      .map((m) => {
        const q = byId.get(m.questionId)!;
        return {
          id: q.id,
          module: q.module,
          section: q.section,
          tags: q.tags,
          stem: clip(q.stem, STEM_MAX),
          misses: m.misses,
          cause: m.cause,
          confidentlyWrong: m.confidentlyWrong,
          ...(m.note && { note: m.note }),
        };
      }),
    feynman: input.progress
      .filter((p): p is ModuleProgress & { feynman: string } => !!p.feynman?.trim())
      .sort((a, b) => a.module - b.module)
      .map((p) => ({ module: p.module, date: p.feynmanAt ? day(p.feynmanAt) : today, text: p.feynman.trim() })),
  };
}
