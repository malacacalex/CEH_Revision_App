import { createEmptyCard, fsrs, generatorParameters, Rating, State, type Card, type Grade } from 'ts-fsrs';

export { Rating, State };
export type { Grade };

export type Confidence = 'sure' | 'unsure' | 'guess';

/** FSRS card state as stored in IndexedDB (dates as epoch ms). */
export interface SrsState {
  due: number;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  learning_steps: number;
  reps: number;
  lapses: number;
  state: State;
  last_review?: number;
}

export interface SchedulerOptions {
  /** Cap intervals so every item comes back before the exam (days). */
  maxIntervalDays?: number;
  fuzz?: boolean;
}

function toCard(s: SrsState): Card {
  return {
    ...s,
    due: new Date(s.due),
    last_review: s.last_review === undefined ? undefined : new Date(s.last_review),
  };
}

function fromCard(c: Card): SrsState {
  return {
    due: c.due.getTime(),
    stability: c.stability,
    difficulty: c.difficulty,
    elapsed_days: c.elapsed_days,
    scheduled_days: c.scheduled_days,
    learning_steps: c.learning_steps,
    reps: c.reps,
    lapses: c.lapses,
    state: c.state,
    last_review: c.last_review?.getTime(),
  };
}

export function newSrsState(now: Date): SrsState {
  return fromCard(createEmptyCard(now));
}

function scheduler(opts: SchedulerOptions) {
  return fsrs(
    generatorParameters({
      request_retention: 0.9,
      maximum_interval: Math.max(1, Math.floor(opts.maxIntervalDays ?? 36500)),
      enable_fuzz: opts.fuzz ?? true,
    }),
  );
}

export function reviewSrs(state: SrsState, rating: Grade, now: Date, opts: SchedulerOptions = {}): SrsState {
  const next = fromCard(scheduler(opts).next(toCard(state), now, rating).card);
  // ts-fsrs can exceed maximum_interval for Easy (it keeps Easy > Good); the exam date is a hard ceiling.
  if (opts.maxIntervalDays !== undefined && next.scheduled_days > opts.maxIntervalDays) {
    const days = Math.max(1, Math.floor(opts.maxIntervalDays));
    next.scheduled_days = days;
    next.due = now.getTime() + days * 86_400_000;
  }
  return next;
}

/** Preview of the next due date for each grade, for "Again / Hard / Good / Easy" buttons. */
export function previewSrs(state: SrsState, now: Date, opts: SchedulerOptions = {}): Record<Grade, number> {
  const r = scheduler({ ...opts, fuzz: false }).repeat(toCard(state), now);
  return {
    [Rating.Again]: r[Rating.Again].card.due.getTime(),
    [Rating.Hard]: r[Rating.Hard].card.due.getTime(),
    [Rating.Good]: r[Rating.Good].card.due.getTime(),
    [Rating.Easy]: r[Rating.Easy].card.due.getTime(),
  } as Record<Grade, number>;
}

/**
 * A question answered in review mode is graded from correctness + confidence:
 * wrong → Again; right but guessed/unsure → Hard; right and sure → Good.
 */
export function gradeFromAnswer(correct: boolean, confidence: Confidence): Grade {
  if (!correct) return Rating.Again;
  return confidence === 'sure' ? Rating.Good : Rating.Hard;
}

export function isDue(state: Pick<SrsState, 'due'>, now: Date): boolean {
  return state.due <= now.getTime();
}

/** Human-friendly interval, e.g. "10 min", "3 d", "2 mo". */
export function formatInterval(ms: number): string {
  const min = Math.max(1, Math.round(ms / 60_000));
  if (min < 60) return `${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} h`;
  const d = Math.round(h / 24);
  if (d < 31) return `${d} d`;
  const mo = Math.round(d / 30);
  if (mo < 12) return `${mo} mo`;
  return `${(d / 365).toFixed(1)} y`;
}
