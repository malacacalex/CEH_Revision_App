import { describe, expect, it } from 'vitest';
import { EMPTY_LAB_LOG, formatMinutes, labRows, labSummary, type Lab } from '../../src/domain/labs.ts';
import { buildReview } from '../../src/domain/review.ts';
import { ModuleProgressSchema, type LabLog, type ModuleProgress, type Profile } from '../../src/schemas/progress.ts';
import { loadContentFromDisk } from '../../scripts/load-content.ts';

const lab = (name: string, minutes: number, source: Lab['source'] = 'free'): Lab => ({ name, source, skill: 's', minutes, verify: false });
const log = (status: LabLog['status'], minutes: number, note = ''): LabLog => ({ status, minutes, note, updatedAt: 1 });
const modules = [
  { module: 7, title: 'Malware', labs: [lab('Sandbox', 60), lab('iLab malware', 90, 'iLabs')] },
  { module: 3, title: 'Scanning', labs: [lab('Scan my lab', 45), lab('Read a pcap', 30)] },
];
const progress: ModuleProgress[] = [
  { profileId: 'p', module: 3, labs: { 'Scan my lab': log('doing', 20, '  -sS vs -sT  '), 'Gone from content': log('done', 10) } },
  { profileId: 'p', module: 7, labs: { Sandbox: log('done', 75) } },
];

describe('lab tracker', () => {
  it('lists labs by module, hides iLabs without access and joins the logs by name', () => {
    const rows = labRows(modules, progress, false);
    expect(rows.map((r) => `${r.module}:${r.lab.name}:${r.log.status}`)).toEqual(['3:Scan my lab:doing', '3:Read a pcap:todo', '7:Sandbox:done']);
    expect(rows[1]!.log).toBe(EMPTY_LAB_LOG);
    expect(labRows(modules, progress, true)).toHaveLength(4);
  });

  it('sums status, time logged and the time still needed', () => {
    const sum = labSummary(labRows(modules, progress, true));
    expect(sum.byStatus).toEqual({ todo: 2, doing: 1, done: 1, skipped: 0 });
    expect(sum.minutesSpent).toBe(95);
    // Read a pcap 30 + iLab 90 + what is left of Scan my lab (45 − 20).
    expect(sum.minutesLeft).toBe(145);
  });

  it('formats durations', () => {
    expect(formatMinutes(45)).toBe('45 min');
    expect(formatMinutes(120)).toBe('2 h');
    expect(formatMinutes(95)).toBe('1 h 35 min');
  });

  it('stores logs on module progress and rejects bad values', () => {
    expect(ModuleProgressSchema.safeParse(progress[0]).success).toBe(true);
    expect(ModuleProgressSchema.safeParse({ profileId: 'p', module: 1 }).success).toBe(true);
    expect(ModuleProgressSchema.safeParse({ profileId: 'p', module: 1, labs: { x: { ...log('done', 5), status: 'finished' } } }).success).toBe(false);
    expect(ModuleProgressSchema.safeParse({ profileId: 'p', module: 1, labs: { x: log('done', -5) } }).success).toBe(false);
  });

  it('puts lab totals and touched labs in the review export', () => {
    const bundle = loadContentFromDisk().bundle!;
    const profile: Profile = {
      id: 'p',
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
    const review = buildReview({
      profile,
      questions: [],
      blueprint: bundle.blueprint,
      attempts: [],
      cardReviews: [],
      sessions: [],
      mistakes: [],
      progress,
      labModules: modules,
      appVersion: 'x',
      contentVersion: 'x',
      now: new Date(2026, 8, 28),
    });
    expect(review.labs).toMatchObject({ total: 3, done: 1, inProgress: 1, skipped: 0, minutesSpent: 95 });
    expect(review.labs.logged).toEqual([
      { module: 3, lab: 'Scan my lab', status: 'doing', minutes: 20, note: '-sS vs -sT' },
      { module: 7, lab: 'Sandbox', status: 'done', minutes: 75 },
    ]);
  });
});
