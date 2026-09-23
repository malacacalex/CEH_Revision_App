import { describe, expect, it } from 'vitest';
import { apportion, assembleQuiz, type AttemptLite } from '../../src/domain/quiz/assemble.ts';
import { scoreQuiz } from '../../src/domain/quiz/score.ts';
import { predictScore } from '../../src/domain/readiness/readiness.ts';
import type { DomainId, Pool, Question } from '../../src/schemas/content.ts';
import { loadContentFromDisk } from '../../scripts/load-content.ts';

const blueprint = loadContentFromDisk().bundle!.blueprint;

function q(n: number, module: number, pool: Pool, domain: DomainId, section = 'S', answer: 0 | 1 | 2 | 3 = 0): Question {
  return {
    id: `m${String(module).padStart(2, '0')}-q-${String(n).padStart(4, '0')}`,
    module,
    section,
    domain,
    pool,
    type: 'recall',
    difficulty: 1,
    stem: `stem ${module}-${n}`,
    options: ['a', 'b', 'c', 'd'],
    answer,
    explanation: 'x',
    optionNotes: ['a', 'b', 'c', 'd'],
    tags: [],
    sources: ['https://example.org'],
    verify: false,
    rev: 1,
  };
}

// 30 practice + 10 mock + 5 pretest for M3 (D2); 30 practice for M1 (D1); 20 practice for M14 (D5).
const bank: Question[] = [
  ...Array.from({ length: 30 }, (_, i) => q(i + 1, 3, 'practice', 'D2', i < 15 ? 'A' : 'B')),
  ...Array.from({ length: 10 }, (_, i) => q(i + 100, 3, 'mock', 'D2')),
  ...Array.from({ length: 5 }, (_, i) => q(i + 200, 3, 'pretest', 'D2')),
  ...Array.from({ length: 30 }, (_, i) => q(i + 1, 1, 'practice', 'D1')),
  ...Array.from({ length: 20 }, (_, i) => q(i + 1, 14, 'practice', 'D5')),
];
let seed = 42;
const rng = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const attempt = (questionId: string, correct: boolean, at: number, confidence: AttemptLite['confidence'] = 'unsure'): AttemptLite => ({
  questionId,
  correct,
  confidence,
  at,
});

describe('quiz assembler', () => {
  it('never uses the held-out mock pool in any practice mode', () => {
    const modes = ['pretest', 'module', 'domain', 'mixed', 'weak', 'confident-wrong', 'review', 'diagnostic'] as const;
    const allAttempts = bank.map((x, i) => attempt(x.id, i % 2 === 0, i, 'sure'));
    for (const mode of modes) {
      const picked = assembleQuiz({
        mode,
        questions: bank,
        blueprint,
        attempts: allAttempts,
        module: 3,
        domain: 'D2',
        studiedModules: [1, 3, 14],
        dueQuestionIds: bank.map((x) => x.id),
        size: 200,
        rng,
      });
      expect(picked.every((x) => x.pool !== 'mock'), mode).toBe(true);
    }
  });

  it('module quiz takes 20 questions, never-seen first', () => {
    const seen = bank.filter((x) => x.module === 3 && x.pool === 'practice').slice(0, 25);
    const picked = assembleQuiz({ mode: 'module', questions: bank, blueprint, attempts: seen.map((x, i) => attempt(x.id, true, i)), module: 3, rng });
    expect(picked).toHaveLength(20);
    const unseen = bank.filter((x) => x.module === 3 && x.pool === 'practice').slice(25).map((x) => x.id);
    for (const id of unseen) expect(picked.map((x) => x.id)).toContain(id);
  });

  it('interleaved mix is weighted by blueprint domain and limited to studied modules', () => {
    const picked = assembleQuiz({ mode: 'mixed', questions: bank, blueprint, attempts: [], studiedModules: [1, 3, 14], size: 40, rng });
    expect(picked).toHaveLength(40);
    const count = (d: DomainId) => picked.filter((x) => x.domain === d).length;
    // weights D2 .21, D5 .16, D1 .06 → 40 × (.21/.43) ≈ 20, (.16/.43) ≈ 15, (.06/.43) ≈ 5
    expect(count('D2')).toBeGreaterThan(count('D5'));
    expect(count('D5')).toBeGreaterThan(count('D1'));
    const onlyM3 = assembleQuiz({ mode: 'mixed', questions: bank, blueprint, attempts: [], studiedModules: [3], size: 40, rng });
    expect(onlyM3.every((x) => x.module === 3)).toBe(true);
  });

  it('weak-spots puts missed questions first, confident-wrong picks sure+wrong only', () => {
    const [a, b, c] = bank;
    const attempts = [attempt(a!.id, false, 1, 'sure'), attempt(b!.id, false, 2, 'guess'), attempt(c!.id, true, 3, 'sure')];
    const weak = assembleQuiz({ mode: 'weak', questions: bank, blueprint, attempts, studiedModules: [3], rng });
    expect(weak.map((x) => x.id)).toEqual(expect.arrayContaining([a!.id, b!.id]));
    const cw = assembleQuiz({ mode: 'confident-wrong', questions: bank, blueprint, attempts, rng });
    expect(cw.map((x) => x.id)).toEqual([a!.id]);
  });

  it('a later correct answer clears a question from confident-wrong', () => {
    const a = bank[0]!;
    const cw = assembleQuiz({ mode: 'confident-wrong', questions: bank, blueprint, attempts: [attempt(a.id, false, 1, 'sure'), attempt(a.id, true, 2, 'sure')], rng });
    expect(cw).toHaveLength(0);
  });

  it('apportion uses largest remainders and sums exactly', () => {
    const r = apportion(new Map([['a', 1], ['b', 1], ['c', 1]]), 10);
    expect([...r.values()].reduce((s, n) => s + n, 0)).toBe(10);
  });
});

describe('scoring and prediction', () => {
  it('scores by domain, module and confidence, and lists confidently wrong items', () => {
    const qs = [q(1, 3, 'practice', 'D2', 'A', 1), q(2, 3, 'practice', 'D2', 'A', 2), q(1, 1, 'practice', 'D1', 'A', 0)];
    const r = scoreQuiz(qs, [
      { questionId: qs[0]!.id, chosen: 1, confidence: 'sure' },
      { questionId: qs[1]!.id, chosen: 0, confidence: 'sure' },
      { questionId: qs[2]!.id, chosen: null, confidence: 'guess' },
    ]);
    expect(r.correct).toBe(1);
    expect(r.total).toBe(3);
    expect(r.byDomain.D2).toEqual({ correct: 1, total: 2 });
    expect(r.byConfidence.sure).toEqual({ correct: 1, total: 2 });
    expect(r.confidentlyWrong).toEqual([qs[1]!.id]);
  });

  it('predicts ~25% with no data and rises with correct answers', () => {
    const empty = predictScore(blueprint, bank, []);
    expect(empty.score).toBeCloseTo(0.25, 2);
    const good = predictScore(
      blueprint,
      bank,
      bank.filter((x) => x.pool === 'practice').map((x, i) => attempt(x.id, true, i, 'sure')),
    );
    expect(good.score).toBeGreaterThan(empty.score);
    expect(good.low).toBeLessThanOrEqual(good.score);
    expect(good.high).toBeGreaterThanOrEqual(good.score);
    expect(good.confidentlyWrongRate).toBe(0);
  });
});
