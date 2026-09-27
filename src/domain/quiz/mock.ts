import type { Blueprint, DomainId, Question } from '../../schemas/content.ts';
import type { Attempt, QuizSession } from '../../schemas/progress.ts';
import { apportion, lastAttempts, shuffle, type AttemptLite } from './assemble.ts';

export type MockKind = 'half-mock' | 'full-mock';
export const MOCK_KINDS: MockKind[] = ['half-mock', 'full-mock'];

export function isMockMode(mode: string): mode is MockKind {
  return mode === 'half-mock' || mode === 'full-mock';
}

/** Mock target (§3.1): the cut score is 60–85% depending on the form, so aim for 85%. */
export const MOCK_TARGET = 0.85;
/** §5.5 go/no-go: no domain under 75%. */
export const DOMAIN_FLOOR = 0.75;

export function mockSpec(bp: Blueprint, kind: MockKind): { questions: number; minutes: number; title: string } {
  return kind === 'full-mock' ? { ...bp.fullMock, title: 'Full mock' } : { ...bp.halfMock, title: 'Half-mock' };
}

/** Where one domain's questions came from. */
export interface DomainSlot {
  domain: DomainId;
  /** Blueprint share of the mock. */
  target: number;
  /** Held-out mock items of this domain. */
  mock: number;
  /** Practice items of this domain the learner has never answered, used when the mock pool runs short. */
  practice: number;
  /** Mock items of this domain drawn to fill other domains' gaps. */
  extra: number;
}

export interface MockPlan {
  questions: Question[];
  slots: DomainSlot[];
  /** Mock items the learner already answered in an earlier mock (the pool ran out of fresh ones). */
  repeated: number;
  minutes: number;
}

export interface MockInput {
  kind: MockKind;
  questions: Question[];
  blueprint: Blueprint;
  attempts: AttemptLite[];
  rng?: () => number;
}

/**
 * Assembles a half or full mock (§6.3): blueprint-weighted, from the held-out mock pool, fresh items first.
 * When a domain's mock pool is short, its slots go, in order, to (1) practice items of that domain the learner
 * has never answered, (2) fresh mock items of other domains, (3) mock items seen longest ago. If the whole bank
 * is still short, the mock is shorter and its time shrinks in proportion. `slots` says what happened.
 */
export function assembleMock(input: MockInput): MockPlan {
  const rng = input.rng ?? Math.random;
  const spec = mockSpec(input.blueprint, input.kind);
  const last = lastAttempts(input.attempts);
  const examDomains = input.blueprint.domains.filter((d) => d.weight > 0);
  const quota = apportion(new Map(examDomains.map((d) => [d.id, d.weight])), spec.questions);

  const fresh = (qs: Question[]) => shuffle(qs.filter((q) => !last.has(q.id)), rng);
  const freshMock = new Map<DomainId, Question[]>();
  const freshPractice = new Map<DomainId, Question[]>();
  for (const d of examDomains) {
    freshMock.set(d.id, fresh(input.questions.filter((q) => q.pool === 'mock' && q.domain === d.id)));
    freshPractice.set(d.id, fresh(input.questions.filter((q) => q.pool === 'practice' && q.domain === d.id)));
  }

  const picked: Question[] = [];
  const slots: DomainSlot[] = [];
  let shortfall = 0;
  for (const d of examDomains) {
    const target = quota.get(d.id) ?? 0;
    const mock = freshMock.get(d.id)!.splice(0, target);
    const practice = freshPractice.get(d.id)!.splice(0, target - mock.length);
    picked.push(...mock, ...practice);
    shortfall += target - mock.length - practice.length;
    slots.push({ domain: d.id, target, mock: mock.length, practice: practice.length, extra: 0 });
  }

  // Fill the remaining gap with fresh mock items of the domains that still have some, by blueprint weight.
  while (shortfall > 0) {
    const spare = new Map(examDomains.filter((d) => freshMock.get(d.id)!.length > 0).map((d) => [d.id, d.weight]));
    if (spare.size === 0) break;
    const before = shortfall;
    for (const [domain, n] of apportion(spare, shortfall)) {
      const extra = freshMock.get(domain as DomainId)!.splice(0, n);
      picked.push(...extra);
      slots.find((s) => s.domain === domain)!.extra += extra.length;
      shortfall -= extra.length;
    }
    if (shortfall === before) break;
  }

  // Last resort: mock items answered before, the ones seen longest ago first.
  let repeated = 0;
  if (shortfall > 0) {
    const ids = new Set(picked.map((q) => q.id));
    const seen = shuffle(
      input.questions.filter((q) => q.pool === 'mock' && q.domain !== 'D0' && !ids.has(q.id)),
      rng,
    ).sort((a, b) => (last.get(a.id)?.at ?? 0) - (last.get(b.id)?.at ?? 0));
    const again = seen.slice(0, shortfall);
    for (const q of again) slots.find((s) => s.domain === q.domain)!.extra++;
    picked.push(...again);
    repeated = again.length;
  }

  const minutes = picked.length >= spec.questions ? spec.minutes : Math.round((spec.minutes * picked.length) / spec.questions);
  return { questions: shuffle(picked, rng), slots, repeated, minutes };
}

/** Mock items the learner has never answered. */
export function freshMockCount(questions: Question[], attempts: AttemptLite[]): number {
  const last = lastAttempts(attempts);
  return questions.filter((q) => q.pool === 'mock' && !last.has(q.id)).length;
}

export interface MockOutcome {
  session: QuizSession;
  finishedAt: number;
  pct: number;
  correct: number;
  total: number;
  byDomain: Map<string, number>;
  answered: number;
  confidentlyWrong: number;
}

/** Finished mocks of one kind with their per-domain accuracy, oldest first. Unanswered questions count as wrong. */
export function mockOutcomes(kind: MockKind, sessions: QuizSession[], attempts: Attempt[], questionById: Map<string, Question>): MockOutcome[] {
  return sessions
    .filter((s) => s.mode === kind && s.finishedAt !== undefined)
    .sort((a, b) => a.finishedAt! - b.finishedAt!)
    .map((session) => {
      const mine = attempts.filter((a) => a.sessionId === session.id);
      const tally = new Map<string, { ok: number; n: number }>();
      for (const a of mine) {
        const q = questionById.get(a.questionId);
        if (!q) continue;
        const t = tally.get(q.domain) ?? { ok: 0, n: 0 };
        t.n++;
        if (a.correct) t.ok++;
        tally.set(q.domain, t);
      }
      const correct = mine.filter((a) => a.correct).length;
      const total = session.total;
      return {
        session,
        finishedAt: session.finishedAt!,
        pct: total === 0 ? 0 : correct / total,
        correct,
        total,
        byDomain: new Map([...tally].sort(([a], [b]) => a.localeCompare(b)).map(([d, t]) => [d, t.ok / t.n])),
        answered: mine.filter((a) => a.chosen !== null).length,
        confidentlyWrong: mine.filter((a) => !a.correct && a.chosen !== null && a.confidence === 'sure').length,
      };
    });
}
