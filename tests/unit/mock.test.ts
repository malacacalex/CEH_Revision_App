import { describe, expect, it } from 'vitest';
import { apportion } from '../../src/domain/quiz/assemble.ts';
import { examReadyGate, phase3Gate } from '../../src/domain/gates.ts';
import { assembleMock, freshMockCount, mockOutcomes } from '../../src/domain/quiz/mock.ts';
import { quizHref, quizzesInProgress } from '../../src/domain/quiz/resume.ts';
import type { DomainId, Pool, Question } from '../../src/schemas/content.ts';
import type { Attempt, QuizSession } from '../../src/schemas/progress.ts';
import { loadContentFromDisk } from '../../scripts/load-content.ts';

const blueprint = loadContentFromDisk().bundle!.blueprint;
const examDomains = blueprint.domains.filter((d) => d.weight > 0);

function q(n: number, pool: Pool, domain: DomainId): Question {
  return {
    id: `${domain}-${pool}-${n}`,
    module: 1,
    section: 'S',
    domain,
    pool,
    type: 'recall',
    difficulty: 1,
    stem: `stem ${domain} ${n}`,
    options: ['a', 'b', 'c', 'd'],
    answer: 0,
    explanation: 'x',
    optionNotes: ['a', 'b', 'c', 'd'],
    tags: [],
    sources: ['https://example.org'],
    verify: false,
    rev: 1,
  };
}
const many = (n: number, pool: Pool, domain: DomainId) => Array.from({ length: n }, (_, i) => q(i, pool, domain));
let seed = 7;
const rng = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const lite = (questionId: string, at: number) => ({ questionId, correct: true, confidence: 'sure' as const, at });

describe('mock assembly', () => {
  it('fills a full mock from the mock pool by blueprint quota when the pool is big enough', () => {
    const bank = examDomains.flatMap((d) => [...many(60, 'mock', d.id), ...many(60, 'practice', d.id)]);
    const plan = assembleMock({ kind: 'full-mock', questions: bank, blueprint, attempts: [], rng });
    expect(plan.questions).toHaveLength(125);
    expect(plan.minutes).toBe(240);
    expect(plan.repeated).toBe(0);
    expect(new Set(plan.questions.map((x) => x.id)).size).toBe(125);
    expect(plan.questions.every((x) => x.pool === 'mock')).toBe(true);
    const quota = apportion(new Map(examDomains.map((d) => [d.id, d.weight])), 125);
    for (const s of plan.slots) {
      expect(s.mock).toBe(quota.get(s.domain));
      expect(s.practice + s.extra).toBe(0);
      expect(plan.questions.filter((x) => x.domain === s.domain)).toHaveLength(s.target);
    }
  });

  it('prefers fresh mock items, then unseen practice items of the same domain', () => {
    const d1 = examDomains[0]!;
    const d2 = examDomains[1]!;
    const bank = examDomains.flatMap((d) => (d.id === d2.id ? many(80, 'practice', d.id) : many(80, 'mock', d.id)));
    const seen = [lite(`${d1.id}-mock-0`, 1), lite(`${d2.id}-practice-0`, 1)];
    const plan = assembleMock({ kind: 'half-mock', questions: bank, blueprint, attempts: seen, rng });
    expect(plan.questions).toHaveLength(63);
    expect(plan.minutes).toBe(120);
    const ids = new Set(plan.questions.map((x) => x.id));
    expect(ids.has(`${d1.id}-mock-0`)).toBe(false);
    expect(ids.has(`${d2.id}-practice-0`)).toBe(false);
    const slot = plan.slots.find((s) => s.domain === d2.id)!;
    expect(slot.mock).toBe(0);
    expect(slot.practice).toBe(slot.target);
  });

  it('borrows fresh mock items from other domains when a domain has nothing left', () => {
    const d1 = examDomains[0]!;
    const bank = many(200, 'mock', d1.id);
    const plan = assembleMock({ kind: 'half-mock', questions: bank, blueprint, attempts: [], rng });
    expect(plan.questions).toHaveLength(63);
    const slot = plan.slots.find((s) => s.domain === d1.id)!;
    expect(slot.mock + slot.extra).toBe(63);
    expect(plan.slots.filter((s) => s.domain !== d1.id).every((s) => s.mock + s.practice + s.extra === 0)).toBe(true);
  });

  it('repeats the mock items seen longest ago once no fresh item is left', () => {
    const bank = examDomains.flatMap((d) => many(8, 'mock', d.id));
    const attempts = bank.map((x, i) => lite(x.id, i));
    const plan = assembleMock({ kind: 'half-mock', questions: bank, blueprint, attempts, rng });
    expect(plan.questions).toHaveLength(63);
    expect(plan.repeated).toBe(63);
    const oldest = new Set(bank.slice(0, 63).map((x) => x.id));
    expect(plan.questions.every((x) => oldest.has(x.id))).toBe(true);
  });

  it('shortens the mock and its time when the whole bank is too small', () => {
    const bank = many(25, 'mock', examDomains[0]!.id);
    const plan = assembleMock({ kind: 'full-mock', questions: bank, blueprint, attempts: [], rng });
    expect(plan.questions).toHaveLength(25);
    expect(plan.minutes).toBe(Math.round((240 * 25) / 125));
    expect(freshMockCount(bank, [lite(bank[0]!.id, 1)])).toBe(24);
  });
});

const session = (id: string, mode: string, ids: string[], extra: Partial<QuizSession> = {}): QuizSession => ({
  id,
  profileId: 'p',
  mode,
  questionIds: ids,
  startedAt: 1,
  total: ids.length,
  ...extra,
});
const attempt = (sessionId: string, questionId: string, chosen: number | null, correct: boolean, confidence: Attempt['confidence'] = 'unsure'): Attempt => ({
  profileId: 'p',
  sessionId,
  mode: 'full-mock',
  questionId,
  rev: 1,
  chosen,
  correct,
  confidence,
  timeMs: 1000,
  at: 5,
});

describe('mock outcomes', () => {
  it('scores against the whole mock, counts unanswered as wrong, and splits by domain', () => {
    const qs = [q(1, 'mock', 'D1'), q(2, 'mock', 'D1'), q(3, 'mock', 'D3'), q(4, 'mock', 'D3')];
    const byId = new Map(qs.map((x) => [x.id, x]));
    const [a, b, c, d] = qs.map((x) => x.id) as [string, string, string, string];
    const ids = [a, b, c, d];
    const sessions = [
      session('late', 'full-mock', ids, { finishedAt: 20 }),
      session('early', 'full-mock', ids, { finishedAt: 10 }),
      session('half', 'half-mock', ids, { finishedAt: 15 }),
      session('open', 'full-mock', ids),
    ];
    const attempts = [
      attempt('late', a, 0, true),
      attempt('late', b, 2, false, 'sure'),
      attempt('late', c, 0, true),
      attempt('late', d, null, false),
      attempt('early', a, 0, true),
    ];
    const out = mockOutcomes('full-mock', sessions, attempts, byId);
    expect(out.map((o) => o.session.id)).toEqual(['early', 'late']);
    const late = out[1]!;
    expect(late.pct).toBe(0.5);
    expect(late.answered).toBe(3);
    expect(late.confidentlyWrong).toBe(1);
    expect(late.byDomain.get('D1')).toBe(0.5);
    expect(late.byDomain.get('D3')).toBe(0.5);
    expect(out[0]!.pct).toBe(0.25);
  });
});

describe('readiness gates', () => {
  const mock = (pct: number, byDomain: [string, number][] = [['D1', pct]], cw = 0) => ({ pct, byDomain: new Map(byDomain), answered: 100, confidentlyWrong: cw });
  const opts = { target: 0.85, floor: 0.75 };

  it('is exam-ready only when every check passes', () => {
    const ok = examReadyGate([mock(0.7), mock(0.86), mock(0.9)], [{ score: 0.82 }], opts);
    expect(ok.every((i) => i.done)).toBe(true);
    const done = (items: ReturnType<typeof examReadyGate>) => Object.fromEntries(items.map((i) => [i.key, i.done]));
    expect(done(examReadyGate([mock(0.9)], [{ score: 0.9 }], opts)).mocks).toBe(false);
    expect(done(examReadyGate([mock(0.9), mock(0.84)], [], opts))).toMatchObject({ mocks: false, external: false });
    expect(done(examReadyGate([mock(0.9), mock(0.9, [['D1', 0.95], ['D6', 0.7]])], [], opts)).domains).toBe(false);
    expect(done(examReadyGate([mock(0.9, undefined, 6), mock(0.9, undefined, 5)], [], opts)).calibration).toBe(false);
    expect(examReadyGate([], [], opts).every((i) => !i.done)).toBe(true);
  });

  it('opens Phase 3 once every module is done and nothing is overdue by a day', () => {
    const now = 10 * 86_400_000;
    const done = (items: ReturnType<typeof phase3Gate>) => Object.fromEntries(items.map((i) => [i.key, i.done]));
    expect(done(phase3Gate({ modulesWithContent: [1, 2], doneModules: [1, 2], oldestDueMs: now - 3_600_000, now }))).toEqual({ modules: true, backlog: true });
    expect(done(phase3Gate({ modulesWithContent: [1, 2], doneModules: [1], oldestDueMs: null, now }))).toEqual({ modules: false, backlog: true });
    expect(done(phase3Gate({ modulesWithContent: [], doneModules: [], oldestDueMs: now - 2 * 86_400_000, now })).backlog).toBe(false);
  });
});

describe('mock resume', () => {
  it('lists an open mock by its draft answers and reopens it on the mock page', () => {
    const s = session('m', 'half-mock', ['a', 'b', 'c'], {
      draft: {
        a: { chosen: 1, confidence: null, flagged: false, timeMs: 10 },
        b: { chosen: null, confidence: null, flagged: true, timeMs: 5 },
      },
    });
    const open = quizzesInProgress([s], [], () => true);
    expect(open).toHaveLength(1);
    expect(open[0]!.answered).toBe(1);
    expect(quizHref(s)).toBe('/mock/run?kind=half-mock');
  });
});
