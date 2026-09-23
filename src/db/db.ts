import Dexie, { type EntityTable, type Table } from 'dexie';
import type { Attempt, CardReview, Mistake, ModuleProgress, Profile, QuizSession, SrsRecord } from '../schemas/progress.ts';

export interface Setting {
  key: string;
  value: unknown;
}

/**
 * All progress is keyed by stable content IDs (never by array position), so content updates
 * never reset anyone's progress. Bump the version and add an upgrade() for every schema change.
 */
export class ShieldDB extends Dexie {
  profiles!: EntityTable<Profile, 'id'>;
  srs!: Table<SrsRecord, [string, string]>;
  attempts!: EntityTable<Attempt, 'id'>;
  mistakes!: Table<Mistake, [string, string]>;
  quizSessions!: EntityTable<QuizSession, 'id'>;
  moduleProgress!: Table<ModuleProgress, [string, number]>;
  cardReviews!: EntityTable<CardReview, 'id'>;
  settings!: EntityTable<Setting, 'key'>;

  constructor(name = 'shieldup') {
    super(name);
    this.version(1).stores({
      profiles: 'id',
      srs: '[profileId+itemId], profileId, [profileId+kind], [profileId+due]',
      attempts: '++id, profileId, sessionId, [profileId+questionId], [profileId+at]',
      mistakes: '[profileId+questionId], profileId',
      quizSessions: 'id, profileId, [profileId+startedAt]',
      moduleProgress: '[profileId+module], profileId',
      cardReviews: '++id, profileId, [profileId+at]',
      settings: 'key',
    });
  }
}

export const PROFILE_TABLES = ['srs', 'attempts', 'mistakes', 'quizSessions', 'moduleProgress', 'cardReviews'] as const;

export let db = new ShieldDB();

/** Tests swap in a fresh database. */
export function useDatabase(instance: ShieldDB): void {
  db = instance;
}
