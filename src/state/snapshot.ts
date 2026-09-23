import type { ContentIndex } from '../content/bundle.ts';
import { addDays, daysBetween, toISODate, type ISODate } from '../domain/dates.ts';
import { moduleGate, type GateStatus } from '../domain/gates.ts';
import { buildPlan, examTarget, readinessTradeOff, type Plan, type PlannerProgress, type TradeOff } from '../domain/planner/planner.ts';
import { predictScore, studyStreak, type Prediction } from '../domain/readiness/readiness.ts';
import type { Attempt, CardReview, ModuleProgress, Profile, QuizSession, SrsRecord } from '../schemas/progress.ts';

export interface StudyData {
  attempts: Attempt[];
  srs: SrsRecord[];
  moduleProgress: ModuleProgress[];
  sessions: QuizSession[];
  cardReviews: CardReview[];
}

export interface Snapshot {
  today: ISODate;
  gates: Map<number, GateStatus>;
  startedModules: number[];
  doneModules: number[];
  plannerProgress: PlannerProgress;
  plan: Plan;
  tradeOff: TradeOff;
  prediction: Prediction;
  dueCards: number;
  dueQuestions: string[];
  newCardsToday: number;
  newCardLimit: number;
  streak: number;
  /** Days left until the last acceptable exam date; caps FSRS intervals. */
  maxIntervalDays: number;
}

/** New flashcards per day scale with weekly hours (§5.4). */
export function newCardsPerDay(hoursPerWeek: number): number {
  if (hoursPerWeek < 7) return 10;
  if (hoursPerWeek > 13) return 25;
  return 20;
}

export function computeSnapshot(profile: Profile, data: StudyData, content: ContentIndex, now: Date): Snapshot {
  const today = toISODate(now);
  const nowMs = now.getTime();
  const mpByModule = new Map(data.moduleProgress.map((m) => [m.module, m]));
  const introduced = new Map<number, number>();
  for (const s of data.srs) if (s.kind === 'card') introduced.set(s.module, (introduced.get(s.module) ?? 0) + 1);

  const gates = new Map<number, GateStatus>();
  for (const m of content.modules) {
    gates.set(
      m.meta.module,
      moduleGate(mpByModule.get(m.meta.module), {
        ownsCourseware: profile.ownsCourseware,
        cardsTotal: m.flashcards.length,
        cardsIntroduced: introduced.get(m.meta.module) ?? 0,
      }),
    );
  }
  // A module with no content yet can't be "done".
  const doneModules = [...gates].filter(([n, g]) => g.done && (content.module(n)?.questions.length ?? 0) > 0).map(([n]) => n);
  const startedModules = [...gates].filter(([, g]) => g.started).map(([n]) => n);

  const plannerProgress: PlannerProgress = {
    phase0Done: profile.phase0DoneAt !== undefined,
    doneModules,
    moduleFraction: Object.fromEntries([...gates].map(([n, g]) => [n, g.fraction])),
    halfMocksDone: data.sessions.filter((s) => s.mode === 'half-mock' && s.finishedAt).length,
    fullMocksDone: data.sessions.filter((s) => s.mode === 'full-mock' && s.finishedAt).length,
  };
  const plannerContent = { blueprint: content.bundle.blueprint, modules: content.modules.map((m) => m.meta) };
  // Always plan from today with the real progress: this is the automatic re-plan.
  const plan = buildPlan(profile, plannerProgress, plannerContent, today);
  const tradeOff = readinessTradeOff(profile, plannerProgress, plannerContent, today);

  const prediction = predictScore(content.bundle.blueprint, content.questions, data.attempts);

  const dueCards = data.srs.filter((s) => s.kind === 'card' && s.due <= nowMs && content.cardById.has(s.itemId)).length;
  const dueQuestions = data.srs.filter((s) => s.kind === 'question' && s.due <= nowMs && content.questionById.has(s.itemId)).map((s) => s.itemId);
  const newCardsToday = data.srs.filter((s) => s.kind === 'card' && toISODate(new Date(s.introducedAt)) === today).length;

  const eventDays = new Set<string>([
    ...data.attempts.map((a) => toISODate(new Date(a.at))),
    ...data.cardReviews.map((r) => toISODate(new Date(r.at))),
  ]);

  return {
    today,
    gates,
    startedModules,
    doneModules,
    plannerProgress,
    plan,
    tradeOff,
    prediction,
    dueCards,
    dueQuestions,
    newCardsToday,
    newCardLimit: newCardsPerDay(profile.hoursPerWeek),
    streak: studyStreak(eventDays, today, addDays),
    maxIntervalDays: Math.max(1, daysBetween(today, examTarget(profile.exam).deadline)),
  };
}
