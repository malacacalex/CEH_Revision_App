import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { ShieldDB, useDatabase, db } from '../../src/db/db.ts';
import {
  deleteProfile,
  dueItems,
  exportProgress,
  finishSession,
  getModuleProgress,
  importProgress,
  recordAnswer,
  reviewCard,
  saveProfile,
  startSession,
} from '../../src/db/repo.ts';
import { Rating } from '../../src/domain/fsrs/scheduler.ts';
import type { Profile } from '../../src/schemas/progress.ts';
import { loadContentFromDisk } from '../../scripts/load-content.ts';

const bundle = loadContentFromDisk().bundle!;
const m3 = bundle.modules.find((m) => m.meta.module === 3)!;
const question = m3.questions.find((q) => q.pool === 'practice')!;
const card = m3.flashcards[0]!;
const now = new Date('2026-09-28T09:00:00Z');

const profile = (id: string): Profile => ({
  id,
  name: id,
  level: 'beginner',
  exam: { mode: 'window', earliest: '2026-12-14', latest: '2027-01-22' },
  hoursPerWeek: 10,
  busyPeriods: [],
  hourOverrides: {},
  ownsCourseware: true,
  hasILabs: true,
  foundationsSkipped: false,
  disclaimerAcceptedAt: 1,
  createdAt: 1,
});

let n = 0;
beforeEach(async () => {
  useDatabase(new ShieldDB(`test-${n++}`));
  await saveProfile(profile('a'));
  await saveProfile(profile('b'));
});

describe('progress store', () => {
  it('logs a miss as a mistake and schedules the question for spaced review', async () => {
    const s = await startSession({ profileId: 'a', mode: 'module', module: 3, questionIds: [question.id], total: 1 }, now);
    const wrong = ((question.answer + 1) % 4) as 0 | 1 | 2 | 3;
    await recordAnswer({ profileId: 'a', session: s, question, chosen: wrong, confidence: 'sure', timeMs: 5000, now });
    const mistake = await db.mistakes.get(['a', question.id]);
    expect(mistake?.misses).toBe(1);
    expect(mistake?.confidentlyWrong).toBe(true);
    const due = await dueItems('a', new Date(now.getTime() + 3_600_000));
    expect(due.map((d) => d.itemId)).toContain(question.id);
    // A later correct answer resolves the mistake.
    await recordAnswer({ profileId: 'a', session: s, question, chosen: question.answer, confidence: 'sure', timeMs: 3000, now: new Date(now.getTime() + 60_000) });
    expect((await db.mistakes.get(['a', question.id]))?.resolved).toBe(true);
  });

  it('marks the module quiz gate only at ≥ 80%', async () => {
    const s = await startSession({ profileId: 'a', mode: 'module', module: 3, questionIds: [], total: 10 }, now);
    await finishSession(s, 7, now, 0.8);
    expect((await getModuleProgress('a', 3)).moduleQuizPassedAt).toBeUndefined();
    const s2 = await startSession({ profileId: 'a', mode: 'module', module: 3, questionIds: [], total: 10 }, now);
    await finishSession(s2, 8, now, 0.8);
    const mp = await getModuleProgress('a', 3);
    expect(mp.moduleQuizPassedAt).toBeDefined();
    expect(mp.bestModuleQuiz).toBe(0.8);
  });

  it('keeps profiles isolated', async () => {
    await reviewCard('a', card, Rating.Good, now);
    expect(await db.srs.where('profileId').equals('b').count()).toBe(0);
    await deleteProfile('a');
    expect(await db.srs.count()).toBe(0);
    expect(await db.profiles.count()).toBe(1);
  });

  it('round-trips all progress through export/import', async () => {
    await reviewCard('a', card, Rating.Good, now);
    const s = await startSession({ profileId: 'a', mode: 'module', module: 3, questionIds: [question.id], total: 1 }, now);
    await recordAnswer({ profileId: 'a', session: s, question, chosen: 0, confidence: 'unsure', timeMs: 1000, now });
    const file = JSON.parse(JSON.stringify(await exportProgress('0.1.0', '0.1.0')));

    useDatabase(new ShieldDB(`test-${n++}`));
    await importProgress(file);
    expect(await db.profiles.count()).toBe(2);
    expect(await db.srs.get(['a', card.id])).toBeDefined();
    expect(await db.attempts.where('profileId').equals('a').count()).toBe(1);
    expect(await db.quizSessions.count()).toBe(1);

    // Importing again replaces (does not duplicate) the profile's data.
    await importProgress(file);
    expect(await db.attempts.where('profileId').equals('a').count()).toBe(1);
  });

  it('rejects files that are not progress exports', async () => {
    await expect(importProgress({ format: 'something-else' })).rejects.toThrow(/Not a valid ShieldUp progress file/);
  });
});
