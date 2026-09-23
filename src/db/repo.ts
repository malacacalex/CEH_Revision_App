import { db, PROFILE_TABLES } from './db.ts';
import {
  PROGRESS_FORMAT,
  PROGRESS_SCHEMA_VERSION,
  ProgressExportSchema,
  type Attempt,
  type MistakeCause,
  type ModuleProgress,
  type Profile,
  type ProgressExport,
  type QuizSession,
  type SrsRecord,
} from '../schemas/progress.ts';
import type { Flashcard, Question } from '../schemas/content.ts';
import { gradeFromAnswer, newSrsState, reviewSrs, type Confidence, type Grade, type SrsState } from '../domain/fsrs/scheduler.ts';

export function uid(): string {
  return crypto.randomUUID();
}

// ── Profiles ────────────────────────────────────────────────────────────────

const ACTIVE_KEY = 'activeProfileId';

export async function listProfiles(): Promise<Profile[]> {
  return db.profiles.orderBy('id').toArray();
}

export async function getActiveProfileId(): Promise<string | null> {
  const s = await db.settings.get(ACTIVE_KEY);
  return typeof s?.value === 'string' ? s.value : null;
}

export async function setActiveProfileId(id: string | null): Promise<void> {
  if (id === null) await db.settings.delete(ACTIVE_KEY);
  else await db.settings.put({ key: ACTIVE_KEY, value: id });
}

export async function saveProfile(p: Profile): Promise<void> {
  await db.profiles.put(p);
}

export async function deleteProfile(id: string): Promise<void> {
  await db.transaction('rw', [db.profiles, db.settings, ...PROFILE_TABLES.map((t) => db[t])], async () => {
    for (const t of PROFILE_TABLES) await db[t].where('profileId').equals(id).delete();
    await db.profiles.delete(id);
    if ((await getActiveProfileId()) === id) await setActiveProfileId(null);
  });
}

// ── Spaced repetition ───────────────────────────────────────────────────────

function srsFields(s: SrsState) {
  return {
    due: s.due,
    stability: s.stability,
    difficulty: s.difficulty,
    elapsed_days: s.elapsed_days,
    scheduled_days: s.scheduled_days,
    learning_steps: s.learning_steps,
    reps: s.reps,
    lapses: s.lapses,
    state: s.state,
    last_review: s.last_review,
  };
}

export async function reviewCard(profileId: string, card: Flashcard, rating: Grade, now: Date, maxIntervalDays?: number): Promise<void> {
  await db.transaction('rw', db.srs, db.cardReviews, async () => {
    const existing = await db.srs.get([profileId, card.id]);
    const base: SrsState = existing ?? newSrsState(now);
    const next = reviewSrs(base, rating, now, { maxIntervalDays });
    await db.srs.put({
      profileId,
      itemId: card.id,
      kind: 'card',
      module: card.module,
      itemRev: card.rev,
      introducedAt: existing?.introducedAt ?? now.getTime(),
      ...srsFields(next),
    });
    await db.cardReviews.add({ profileId, itemId: card.id, rating, at: now.getTime() });
  });
}

export async function dueItems(profileId: string, now: Date): Promise<SrsRecord[]> {
  return db.srs.where('[profileId+due]').between([profileId, 0], [profileId, now.getTime()], true, true).toArray();
}

export async function allSrs(profileId: string): Promise<SrsRecord[]> {
  return db.srs.where('profileId').equals(profileId).toArray();
}

// ── Quiz sessions and answers ───────────────────────────────────────────────

export async function startSession(s: Omit<QuizSession, 'id' | 'startedAt'>, now: Date): Promise<QuizSession> {
  const session: QuizSession = { ...s, id: uid(), startedAt: now.getTime() };
  await db.quizSessions.put(session);
  return session;
}

export interface AnswerInput {
  profileId: string;
  session: QuizSession;
  question: Question;
  chosen: number | null;
  confidence: Confidence;
  timeMs: number;
  now: Date;
  maxIntervalDays?: number;
}

/**
 * Records one answer: attempt log, mistake log (every miss), and spaced review of missed questions.
 * A missed question enters FSRS as "Again"; later answers to it are graded from correctness + confidence.
 */
export async function recordAnswer(a: AnswerInput): Promise<Attempt> {
  const correct = a.chosen !== null && a.chosen === a.question.answer;
  const at = a.now.getTime();
  const attempt: Attempt = {
    profileId: a.profileId,
    sessionId: a.session.id,
    mode: a.session.mode,
    questionId: a.question.id,
    rev: a.question.rev,
    chosen: a.chosen,
    correct,
    confidence: a.confidence,
    timeMs: Math.round(a.timeMs),
    at,
  };
  await db.transaction('rw', db.attempts, db.mistakes, db.srs, async () => {
    attempt.id = await db.attempts.add(attempt);
    const key: [string, string] = [a.profileId, a.question.id];
    const mistake = await db.mistakes.get(key);
    if (!correct) {
      await db.mistakes.put({
        profileId: a.profileId,
        questionId: a.question.id,
        cause: mistake?.cause ?? (a.confidence === 'guess' ? 'guessed' : null),
        note: mistake?.note ?? '',
        misses: (mistake?.misses ?? 0) + 1,
        lastMissedAt: at,
        confidentlyWrong: a.confidence === 'sure',
        resolved: false,
      });
    } else if (mistake && !mistake.resolved) {
      await db.mistakes.put({ ...mistake, resolved: true });
    }

    const srs = await db.srs.get(key);
    if (srs || !correct) {
      const next = reviewSrs(srs ?? newSrsState(a.now), gradeFromAnswer(correct, a.confidence), a.now, { maxIntervalDays: a.maxIntervalDays });
      await db.srs.put({
        profileId: a.profileId,
        itemId: a.question.id,
        kind: 'question',
        module: a.question.module,
        itemRev: a.question.rev,
        introducedAt: srs?.introducedAt ?? at,
        ...srsFields(next),
      });
    }
  });
  return attempt;
}

export async function finishSession(session: QuizSession, correct: number, now: Date, modulePass?: number): Promise<void> {
  const done = { ...session, finishedAt: now.getTime(), correct };
  await db.quizSessions.put(done);
  if (session.module === undefined) return;
  const pct = session.total === 0 ? 0 : correct / session.total;
  if (session.mode === 'pretest') await updateModuleProgress(session.profileId, session.module, { pretestDoneAt: now.getTime() });
  if (session.mode === 'module') {
    const mp = await getModuleProgress(session.profileId, session.module);
    await updateModuleProgress(session.profileId, session.module, {
      bestModuleQuiz: Math.max(mp.bestModuleQuiz ?? 0, pct),
      ...(modulePass !== undefined && pct >= modulePass && !mp.moduleQuizPassedAt ? { moduleQuizPassedAt: now.getTime() } : {}),
    });
  }
}

export async function attemptsFor(profileId: string): Promise<Attempt[]> {
  return db.attempts.where('profileId').equals(profileId).toArray();
}

export async function sessionsFor(profileId: string): Promise<QuizSession[]> {
  return db.quizSessions.where('profileId').equals(profileId).toArray();
}

export async function setMistakeCause(profileId: string, questionId: string, cause: MistakeCause | null, note?: string): Promise<void> {
  const m = await db.mistakes.get([profileId, questionId]);
  if (m) await db.mistakes.put({ ...m, cause, note: note ?? m.note });
}

// ── Module progress ─────────────────────────────────────────────────────────

export async function getModuleProgress(profileId: string, module: number): Promise<ModuleProgress> {
  return (await db.moduleProgress.get([profileId, module])) ?? { profileId, module };
}

export async function updateModuleProgress(profileId: string, module: number, patch: Partial<Omit<ModuleProgress, 'profileId' | 'module'>>): Promise<void> {
  await db.transaction('rw', db.moduleProgress, async () => {
    const cur = await getModuleProgress(profileId, module);
    await db.moduleProgress.put({ ...cur, startedAt: cur.startedAt ?? Date.now(), ...patch });
  });
}

// ── Export / import ─────────────────────────────────────────────────────────

export async function exportProgress(appVersion: string, contentVersion: string, profileIds?: string[]): Promise<ProgressExport> {
  const profiles = (await db.profiles.toArray()).filter((p) => !profileIds || profileIds.includes(p.id));
  const ids = profiles.map((p) => p.id);
  const grab = async <T,>(t: (typeof PROFILE_TABLES)[number]) => (await db[t].where('profileId').anyOf(ids).toArray()) as T[];
  return {
    format: PROGRESS_FORMAT,
    schemaVersion: PROGRESS_SCHEMA_VERSION,
    exportedAt: Date.now(),
    appVersion,
    contentVersion,
    profiles,
    srs: await grab('srs'),
    attempts: await grab('attempts'),
    mistakes: await grab('mistakes'),
    quizSessions: await grab('quizSessions'),
    moduleProgress: await grab('moduleProgress'),
    cardReviews: await grab('cardReviews'),
  };
}

/**
 * Imports a progress file. Every profile in the file replaces the local profile with the same id;
 * other local profiles are untouched. Throws with a readable message if the file is invalid.
 */
export async function importProgress(json: unknown): Promise<{ profiles: number }> {
  const parsed = ProgressExportSchema.safeParse(json);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    throw new Error(`Not a valid ShieldUp progress file (${first?.path.join('.') ?? ''}: ${first?.message ?? 'unknown error'})`);
  }
  const data = parsed.data;
  const ids = new Set(data.profiles.map((p) => p.id));
  const owned = <T extends { profileId: string }>(rows: T[]) => rows.filter((r) => ids.has(r.profileId));
  await db.transaction('rw', [db.profiles, ...PROFILE_TABLES.map((t) => db[t])], async () => {
    for (const t of PROFILE_TABLES) await db[t].where('profileId').anyOf([...ids]).delete();
    await db.profiles.bulkPut(data.profiles);
    await db.srs.bulkPut(owned(data.srs));
    // Auto-increment ids are local; drop them so imports never collide.
    await db.attempts.bulkAdd(owned(data.attempts).map(({ id: _id, ...rest }) => rest));
    await db.mistakes.bulkPut(owned(data.mistakes));
    await db.quizSessions.bulkPut(owned(data.quizSessions));
    await db.moduleProgress.bulkPut(owned(data.moduleProgress));
    await db.cardReviews.bulkAdd(owned(data.cardReviews).map(({ id: _id, ...rest }) => rest));
  });
  return { profiles: data.profiles.length };
}
