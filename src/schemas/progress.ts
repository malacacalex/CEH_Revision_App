import { z } from 'zod';

const isoDate = z.iso.date();

export const MISTAKE_CAUSES = ['knowledge-gap', 'misread', 'confused', 'ec-council-framing', 'guessed'] as const;
export const MistakeCauseSchema = z.enum(MISTAKE_CAUSES);
export type MistakeCause = z.infer<typeof MistakeCauseSchema>;
export const MISTAKE_CAUSE_LABELS: Record<MistakeCause, string> = {
  'knowledge-gap': 'Knowledge gap',
  misread: 'Misread the question',
  confused: 'Confused X with Y',
  'ec-council-framing': 'EC-Council framing',
  guessed: 'Guessed',
};

export const ConfidenceSchema = z.enum(['sure', 'unsure', 'guess']);

export const ProfileSchema = z.strictObject({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(60),
  level: z.enum(['beginner', 'intermediate']),
  exam: z.discriminatedUnion('mode', [
    z.strictObject({ mode: z.literal('fixed'), date: isoDate }),
    z.strictObject({ mode: z.literal('window'), earliest: isoDate, latest: isoDate }),
  ]),
  hoursPerWeek: z.number().min(1).max(60),
  busyPeriods: z.array(
    z.strictObject({ start: isoDate, end: isoDate, factor: z.number().min(0).max(1), label: z.string().optional() }),
  ),
  hourOverrides: z.record(isoDate, z.number().min(0).max(80)),
  ownsCourseware: z.boolean(),
  hasILabs: z.boolean(),
  foundationsSkipped: z.boolean(),
  phase0DoneAt: z.number().optional(),
  disclaimerAcceptedAt: z.number(),
  createdAt: z.number(),
});
export type Profile = z.infer<typeof ProfileSchema>;

export const SrsRecordSchema = z.strictObject({
  profileId: z.string(),
  itemId: z.string(),
  kind: z.enum(['card', 'question']),
  module: z.number().int(),
  itemRev: z.number().int(),
  introducedAt: z.number(),
  due: z.number(),
  stability: z.number(),
  difficulty: z.number(),
  elapsed_days: z.number(),
  scheduled_days: z.number(),
  learning_steps: z.number(),
  reps: z.number(),
  lapses: z.number(),
  state: z.number().int().min(0).max(3),
  last_review: z.number().optional(),
});
export type SrsRecord = z.infer<typeof SrsRecordSchema>;

export const AttemptSchema = z.strictObject({
  id: z.number().int().optional(),
  profileId: z.string(),
  sessionId: z.string(),
  mode: z.string(),
  questionId: z.string(),
  rev: z.number().int(),
  chosen: z.number().int().min(0).max(3).nullable(),
  correct: z.boolean(),
  confidence: ConfidenceSchema,
  timeMs: z.number().min(0),
  at: z.number(),
});
export type Attempt = z.infer<typeof AttemptSchema>;

export const MistakeSchema = z.strictObject({
  profileId: z.string(),
  questionId: z.string(),
  cause: MistakeCauseSchema.nullable(),
  note: z.string(),
  misses: z.number().int().min(1),
  lastMissedAt: z.number(),
  confidentlyWrong: z.boolean(),
  resolved: z.boolean(),
});
export type Mistake = z.infer<typeof MistakeSchema>;

export const QuizSessionSchema = z.strictObject({
  id: z.string(),
  profileId: z.string(),
  mode: z.string(),
  module: z.number().int().optional(),
  domain: z.string().optional(),
  questionIds: z.array(z.string()),
  startedAt: z.number(),
  finishedAt: z.number().optional(),
  correct: z.number().int().optional(),
  total: z.number().int(),
});
export type QuizSession = z.infer<typeof QuizSessionSchema>;

export const ModuleProgressSchema = z.strictObject({
  profileId: z.string(),
  module: z.number().int(),
  startedAt: z.number().optional(),
  pretestDoneAt: z.number().optional(),
  notesReviewedAt: z.number().optional(),
  readingMapDoneAt: z.number().optional(),
  feynman: z.string().optional(),
  feynmanAt: z.number().optional(),
  moduleQuizPassedAt: z.number().optional(),
  bestModuleQuiz: z.number().optional(),
});
export type ModuleProgress = z.infer<typeof ModuleProgressSchema>;

export const CardReviewSchema = z.strictObject({
  id: z.number().int().optional(),
  profileId: z.string(),
  itemId: z.string(),
  rating: z.number().int().min(1).max(4),
  at: z.number(),
});
export type CardReview = z.infer<typeof CardReviewSchema>;

export const PROGRESS_FORMAT = 'shieldup-progress';
export const PROGRESS_SCHEMA_VERSION = 1;

export const ProgressExportSchema = z.strictObject({
  format: z.literal(PROGRESS_FORMAT),
  schemaVersion: z.literal(PROGRESS_SCHEMA_VERSION),
  exportedAt: z.number(),
  appVersion: z.string(),
  contentVersion: z.string(),
  profiles: z.array(ProfileSchema),
  srs: z.array(SrsRecordSchema),
  attempts: z.array(AttemptSchema),
  mistakes: z.array(MistakeSchema),
  quizSessions: z.array(QuizSessionSchema),
  moduleProgress: z.array(ModuleProgressSchema),
  cardReviews: z.array(CardReviewSchema),
});
export type ProgressExport = z.infer<typeof ProgressExportSchema>;
