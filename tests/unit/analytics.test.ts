import { describe, expect, it } from 'vitest';
import {
  accuracyBreakdown,
  attemptsSince,
  calibration,
  mockHistory,
  periodStart,
  timeBreakdown,
  timeStats,
  weeklyTrend,
  type AnalyticsAttempt,
  type AnalyticsQuestion,
} from '../../src/domain/analytics.ts';
import type { QuizSession } from '../../src/schemas/progress.ts';

const questions = new Map<string, AnalyticsQuestion>([
  ['m00-q-0001', { module: 0, domain: 'D0', type: 'recall', difficulty: 1, tags: ['tcp', 'ports'] }],
  ['m01-q-0001', { module: 1, domain: 'D1', type: 'scenario', difficulty: 2, tags: ['laws'] }],
  ['m02-q-0001', { module: 2, domain: 'D2', type: 'tool', difficulty: 3, tags: ['osint', 'tcp'] }],
  ['m10-q-0001', { module: 10, domain: 'D4', type: 'command-output', difficulty: 2, tags: ['dos'] }],
  ['m20-q-0001', { module: 20, domain: 'D9', type: 'recall', difficulty: 1, tags: ['pki'] }],
]);

// Wednesday 23 Sep 2026, local time.
const today = '2026-09-23';
const at = (daysAgo: number, hour = 10) => new Date(2026, 8, 23 - daysAgo, hour, 0).getTime();

let seq = 0;
function attempt(questionId: string, correct: boolean, over: Partial<AnalyticsAttempt> = {}): AnalyticsAttempt {
  return { questionId, sessionId: 's1', chosen: correct ? 0 : 1, correct, confidence: 'sure', timeMs: 30_000, at: at(0) + seq++, ...over };
}

describe('accuracyBreakdown', () => {
  it('counts every answered attempt and sorts rows as the page shows them', () => {
    const b = accuracyBreakdown(
      [
        attempt('m20-q-0001', true),
        attempt('m02-q-0001', false),
        attempt('m02-q-0001', true),
        attempt('m01-q-0001', true),
        attempt('m00-q-0001', false),
        attempt('m10-q-0001', false),
        attempt('m10-q-0001', false),
      ],
      questions,
    );
    expect(b.answered).toBe(7);
    expect(b.correct).toBe(3);
    expect(b.accuracy).toBeCloseTo(3 / 7);
    expect(b.modules.map((r) => r.key)).toEqual([0, 1, 2, 10, 20]);
    expect(b.modules.find((r) => r.key === 2)).toMatchObject({ answered: 2, correct: 1, accuracy: 0.5 });
    expect(b.domains.map((r) => r.key)).toEqual(['D0', 'D1', 'D2', 'D4', 'D9']);
    expect(b.difficulty.map((r) => [r.key, r.answered])).toEqual([
      [1, 2],
      [2, 3],
      [3, 2],
    ]);
    expect(b.types.map((r) => r.key)).toEqual(['recall', 'scenario', 'tool', 'command-output']);
    // tcp: 3 answered; dos and osint 2 each, dos worse (0%) before osint (50%); then 1-answer tags by accuracy.
    expect(b.tags.map((r) => r.key)).toEqual(['tcp', 'dos', 'osint', 'ports', 'laws', 'pki']);
  });

  it('skips unanswered attempts, unknown questions and empty rows (D0 only shows up when answered)', () => {
    const b = accuracyBreakdown(
      [attempt('m01-q-0001', false, { chosen: null }), attempt('m99-q-0001', true), attempt('m20-q-0001', true)],
      questions,
    );
    expect(b.answered).toBe(1);
    expect(b.domains.map((r) => r.key)).toEqual(['D9']);
    expect(b.modules.map((r) => r.key)).toEqual([20]);
  });

  it('returns null accuracy with no answers', () => {
    const b = accuracyBreakdown([], questions);
    expect(b.accuracy).toBeNull();
    expect(b.tags).toEqual([]);
  });
});

describe('period filter', () => {
  it('starts at local midnight N-1 days ago', () => {
    const since = periodStart(today, 30);
    expect(since).toBe(new Date(2026, 7, 25).getTime());
    const kept = attemptsSince([attempt('m01-q-0001', true, { at: at(29, 0) }), attempt('m01-q-0001', true, { at: at(30, 23) })], since);
    expect(kept).toHaveLength(1);
  });
});

describe('time per question', () => {
  it('ignores zero times, takes the plain median and caps the mean at 10 minutes', () => {
    const s = timeStats([0, 10_000, 20_000, 30_000, 3_600_000])!;
    expect(s.count).toBe(4);
    expect(s.medianSec).toBe(25);
    expect(s.meanSec).toBeCloseTo((10 + 20 + 30 + 600) / 4);
    expect(timeStats([0, 0])).toBeNull();
    expect(timeStats([5000, 1000, 3000])!.medianSec).toBe(3);
  });

  it('groups answered attempts by type and difficulty', () => {
    const t = timeBreakdown(
      [
        attempt('m00-q-0001', true, { timeMs: 10_000 }),
        attempt('m20-q-0001', true, { timeMs: 20_000 }),
        attempt('m02-q-0001', true, { timeMs: 60_000 }),
        attempt('m01-q-0001', true, { timeMs: 0 }),
        attempt('m10-q-0001', false, { timeMs: 90_000, chosen: null }),
      ],
      questions,
    );
    expect(t.overall).toEqual({ count: 3, medianSec: 20, meanSec: 30 });
    expect(t.types.map((r) => [r.key, r.count, r.medianSec])).toEqual([
      ['recall', 2, 15],
      ['tool', 1, 60],
    ]);
    expect(t.difficulty.map((r) => r.key)).toEqual([1, 3]);
  });
});

describe('calibration', () => {
  it('reports accuracy per rating (guess → sure) and the confidently-wrong rate over all answers', () => {
    const c = calibration([
      attempt('m01-q-0001', true, { confidence: 'sure' }),
      attempt('m01-q-0001', true, { confidence: 'sure' }),
      attempt('m01-q-0001', true, { confidence: 'sure' }),
      attempt('m01-q-0001', false, { confidence: 'sure' }),
      attempt('m02-q-0001', true, { confidence: 'unsure' }),
      attempt('m02-q-0001', false, { confidence: 'unsure' }),
      attempt('m02-q-0001', false, { confidence: 'guess' }),
      attempt('m02-q-0001', false, { confidence: 'guess' }),
      attempt('m02-q-0001', false, { confidence: 'sure', chosen: null }),
    ]);
    expect(c.points.map((p) => [p.confidence, p.answered, p.accuracy])).toEqual([
      ['guess', 2, 0],
      ['unsure', 2, 0.5],
      ['sure', 4, 0.75],
    ]);
    expect(c.answered).toBe(8);
    expect(c.confidentlyWrong).toBe(1);
    expect(c.confidentlyWrongRate).toBe(1 / 8);
  });

  it('has null accuracy for unused ratings and a zero rate with no answers', () => {
    const c = calibration([]);
    expect(c.points.every((p) => p.accuracy === null && p.answered === 0)).toBe(true);
    expect(c.confidentlyWrongRate).toBe(0);
  });
});

describe('weeklyTrend', () => {
  it('buckets by Monday-start local weeks, oldest first, with empty weeks kept', () => {
    const w = weeklyTrend(
      [
        attempt('m01-q-0001', true, { at: at(0) }), // Wed 23 Sep → week of 21 Sep
        attempt('m01-q-0001', false, { at: new Date(2026, 8, 21, 0, 5).getTime() }), // Monday just after midnight
        attempt('m01-q-0001', true, { at: new Date(2026, 8, 20, 23, 55).getTime() }), // Sunday late → week of 14 Sep
        attempt('m01-q-0001', true, { at: at(200) }), // too old
        attempt('m01-q-0001', true, { at: at(1), chosen: null }), // unanswered
      ],
      today,
    );
    expect(w).toHaveLength(12);
    expect(w[0]!.week).toBe('2026-07-06');
    expect(w[11]).toEqual({ week: '2026-09-21', answered: 2, correct: 1, accuracy: 0.5 });
    expect(w[10]).toEqual({ week: '2026-09-14', answered: 1, correct: 1, accuracy: 1 });
    expect(w[9]!.accuracy).toBeNull();
    expect(w.reduce((s, p) => s + p.answered, 0)).toBe(3);
  });

  it('honours a custom number of weeks', () => {
    expect(weeklyTrend([], '2026-09-28', 4).map((p) => p.week)).toEqual(['2026-09-07', '2026-09-14', '2026-09-21', '2026-09-28']);
  });
});

describe('mockHistory', () => {
  const session = (id: string, mode: string, finishedAt: number | undefined, correct: number, total: number): QuizSession => ({
    id,
    profileId: 'p1',
    mode,
    questionIds: [],
    startedAt: 0,
    ...(finishedAt !== undefined && { finishedAt, correct }),
    total,
  });

  it('lists finished half and full mocks newest first with per-domain accuracy from their attempts', () => {
    const sessions = [
      session('half', 'half-mock', at(5), 55, 63),
      session('full', 'full-mock', at(1), 100, 125),
      session('open', 'full-mock', undefined, 0, 125),
      session('quiz', 'module', at(0), 20, 20),
    ];
    const attempts = [
      attempt('m01-q-0001', true, { sessionId: 'full' }),
      attempt('m02-q-0001', false, { sessionId: 'full' }),
      attempt('m02-q-0001', true, { sessionId: 'full' }), // re-answered after resume: latest counts
      attempt('m10-q-0001', false, { sessionId: 'full', chosen: null }), // unanswered counts as wrong
      attempt('m20-q-0001', true, { sessionId: 'half' }),
      attempt('m01-q-0001', false, { sessionId: 'quiz' }),
    ];
    const h = mockHistory(sessions, attempts, questions);
    expect(h.map((m) => m.sessionId)).toEqual(['full', 'half']);
    expect(h[0]).toMatchObject({ mode: 'full-mock', correct: 100, total: 125, score: 0.8, passed: false });
    expect(h[0]!.domains).toEqual([
      { domain: 'D1', questions: 1, correct: 1, accuracy: 1 },
      { domain: 'D2', questions: 1, correct: 1, accuracy: 1 },
      { domain: 'D4', questions: 1, correct: 0, accuracy: 0 },
    ]);
    expect(h[1]!.score).toBeCloseTo(55 / 63);
    expect(h[1]!.passed).toBe(true);
    expect(h[1]!.domains.map((d) => d.domain)).toEqual(['D9']);
  });

  it('scores an empty session as 0', () => {
    expect(mockHistory([session('x', 'half-mock', at(0), 0, 0)], [], questions)[0]!.score).toBe(0);
  });
});
