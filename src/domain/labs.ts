import type { ModuleMeta } from '../schemas/content.ts';
import type { LabLog, LabStatus, ModuleProgress } from '../schemas/progress.ts';

/**
 * Lab tracker (§6.3 feature 9): every lab the learner can do, with their status, time spent and notes.
 * Logs live on the module's progress record, keyed by lab name.
 */
export type Lab = ModuleMeta['labs'][number];

export const EMPTY_LAB_LOG: LabLog = { status: 'todo', minutes: 0, note: '', updatedAt: 0 };

export interface LabRow {
  module: number;
  title: string;
  lab: Lab;
  log: LabLog;
}

export interface LabSummary {
  total: number;
  byStatus: Record<LabStatus, number>;
  /** Time the learner logged, all labs. */
  minutesSpent: number;
  /** Estimated time still needed for the labs not done or skipped. */
  minutesLeft: number;
}

/** iLabs only show for learners who have access; free labs always do. */
export function visibleLabs(labs: Lab[], hasILabs: boolean): Lab[] {
  return labs.filter((l) => l.source === 'free' || hasILabs);
}

export function labRows(modules: { module: number; title: string; labs: Lab[] }[], progress: ModuleProgress[], hasILabs: boolean): LabRow[] {
  const logs = new Map(progress.map((p) => [p.module, p.labs ?? {}]));
  return [...modules]
    .sort((a, b) => a.module - b.module)
    .flatMap((m) => visibleLabs(m.labs, hasILabs).map((lab) => ({ module: m.module, title: m.title, lab, log: logs.get(m.module)?.[lab.name] ?? EMPTY_LAB_LOG })));
}

export function labSummary(rows: LabRow[]): LabSummary {
  const byStatus: Record<LabStatus, number> = { todo: 0, doing: 0, done: 0, skipped: 0 };
  let minutesSpent = 0;
  let minutesLeft = 0;
  for (const r of rows) {
    byStatus[r.log.status]++;
    minutesSpent += r.log.minutes;
    if (r.log.status === 'todo') minutesLeft += r.lab.minutes;
    if (r.log.status === 'doing') minutesLeft += Math.max(0, r.lab.minutes - r.log.minutes);
  }
  return { total: rows.length, byStatus, minutesSpent, minutesLeft };
}

/** "1 h 30 min", "45 min". */
export function formatMinutes(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}
