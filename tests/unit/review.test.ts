import { describe, expect, it } from 'vitest';
import { searchSheets, sheetSections } from '../../src/content/reference.ts';
import { assembleQuiz } from '../../src/domain/quiz/assemble.ts';
import { buildReview } from '../../src/domain/review.ts';
import type { ReferenceSheet } from '../../src/schemas/content.ts';
import type { Attempt, Profile } from '../../src/schemas/progress.ts';
import { loadContentFromDisk } from '../../scripts/load-content.ts';

const bundle = loadContentFromDisk().bundle!;
const questions = bundle.modules.flatMap((m) => m.questions);
const practice = questions.filter((q) => q.pool === 'practice' && q.module === 0);

const profile: Profile = {
  id: 'p1',
  name: 'Sam',
  level: 'beginner',
  exam: { mode: 'fixed', date: '2027-01-15' },
  hoursPerWeek: 8,
  busyPeriods: [],
  hourOverrides: {},
  ownsCourseware: false,
  hasILabs: false,
  foundationsSkipped: false,
  disclaimerAcceptedAt: 0,
  createdAt: 0,
};

const now = new Date(2026, 8, 23, 20, 0);
const at = (daysAgo: number) => new Date(2026, 8, 23 - daysAgo, 10, 0).getTime();
const attempt = (i: number, correct: boolean, confidence: Attempt['confidence'], daysAgo: number): Attempt => ({
  profileId: 'p1',
  sessionId: 's1',
  mode: 'module',
  questionId: practice[i]!.id,
  rev: 1,
  chosen: 0,
  correct,
  confidence,
  timeMs: 20000,
  at: at(daysAgo),
});

describe('buildReview', () => {
  const attempts = [attempt(0, true, 'sure', 0), attempt(1, false, 'sure', 1), attempt(2, true, 'unsure', 1), attempt(3, false, 'guess', 10), attempt(1, true, 'unsure', 0)];
  const review = buildReview({
    profile,
    questions,
    blueprint: bundle.blueprint,
    attempts,
    cardReviews: [{ profileId: 'p1', itemId: 'm00-c-0001', rating: 3, at: at(2) }],
    sessions: [{ id: 's1', profileId: 'p1', mode: 'module', module: 0, questionIds: [], startedAt: at(1), finishedAt: at(1), correct: 3, total: 4 }],
    mistakes: [
      { profileId: 'p1', questionId: practice[3]!.id, cause: 'misread', note: '', misses: 1, lastMissedAt: at(10), confidentlyWrong: false, resolved: false },
      { profileId: 'p1', questionId: practice[1]!.id, cause: null, note: '', misses: 1, lastMissedAt: at(1), confidentlyWrong: true, resolved: true },
    ],
    progress: [{ profileId: 'p1', module: 0, feynman: '  TCP opens with SYN, SYN-ACK, ACK.  ', feynmanAt: at(1) }],
    appVersion: '0.2.0',
    contentVersion: '0.2.0',
    now,
  });

  it('measures adherence from answers and card reviews', () => {
    expect(review.adherence).toEqual({ activeDaysLast7: 3, activeDaysLast28: 4, streak: 3, questionsLast7: 4, cardReviewsLast7: 1, quizzesFinishedLast7: 1 });
  });

  it('uses the latest answer per question for stats and calibration', () => {
    expect(review.stats.questionsAnswered).toBe(4);
    expect(review.stats.accuracyLatest).toBe(0.75);
    expect(review.calibration.sure).toEqual({ answered: 1, accuracy: 1 });
    expect(review.calibration.unsure).toEqual({ answered: 2, accuracy: 1 });
    expect(review.calibration.guess).toEqual({ answered: 1, accuracy: 0 });
  });

  it('lists only unresolved mistakes and trims Feynman notes', () => {
    expect(review.recentMistakes.map((m) => m.id)).toEqual([practice[3]!.id]);
    expect(review.mistakeCauses).toEqual({ misread: 1 });
    expect(review.feynman).toEqual([{ module: 0, date: '2026-09-22', text: 'TCP opens with SYN, SYN-ACK, ACK.' }]);
  });

  it('stays small and JSON-safe', () => {
    const text = JSON.stringify(review);
    expect(JSON.parse(text)).toEqual(review);
    expect(text.length).toBeLessThan(8000);
  });
});

describe('reference search', () => {
  const sheet: ReferenceSheet = {
    id: 'ref-01',
    title: 'Ports',
    order: 1,
    modules: [0],
    rev: 1,
    verify: false,
    sources: ['https://example.org'],
    body: 'Intro line.\n\n## Web\n| 80 | HTTP |\n| 443 | HTTPS |\n\n## File sharing\n| 445 | SMB |',
  };

  it('splits a sheet on its ## headings', () => {
    expect(sheetSections(sheet).map((s) => s.heading)).toEqual(['Ports', 'Web', 'File sharing']);
  });

  it('returns only the sections that match, and nothing for 1-character queries', () => {
    expect(searchSheets([sheet], '445').map((h) => h.heading)).toEqual(['File sharing']);
    expect(searchSheets([sheet], 'https').map((h) => h.heading)).toEqual(['Web']);
    expect(searchSheets([sheet], '4')).toEqual([]);
  });

  it('searches the real sheets', () => {
    expect(bundle.references.length).toBeGreaterThanOrEqual(4);
    expect(searchSheets(bundle.references, 'SYN').length).toBeGreaterThan(0);
  });
});

describe('skip-check quiz', () => {
  it('draws the 20 M0 skip-check questions only', () => {
    const quiz = assembleQuiz({ mode: 'skipcheck', questions, blueprint: bundle.blueprint, attempts: [], rng: () => 0.5 });
    expect(quiz).toHaveLength(20);
    expect(quiz.every((q) => q.pool === 'skipcheck' && q.module === 0)).toBe(true);
  });
});
