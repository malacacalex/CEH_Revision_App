import type { Blueprint, ModuleMeta } from '../../schemas/content.ts';
import { addDays, daysBetween, startOfWeek, weekday, type ISODate } from '../dates.ts';

export type Level = 'beginner' | 'intermediate';

export type ExamPlan = { mode: 'fixed'; date: ISODate } | { mode: 'window'; earliest: ISODate; latest: ISODate };

export interface BusyPeriod {
  start: ISODate;
  end: ISODate; // inclusive
  /** Share of normal study load available, 0..1 (0.5 = half load). */
  factor: number;
  label?: string;
}

export interface PlannerProfile {
  level: Level;
  exam: ExamPlan;
  hoursPerWeek: number;
  busyPeriods: BusyPeriod[];
  /** Per-week hour overrides, keyed by the Monday of the week. */
  hourOverrides: Record<ISODate, number>;
  foundationsSkipped: boolean;
}

export interface PlannerProgress {
  phase0Done: boolean;
  doneModules: number[];
  /** 0..1 share of a started module already completed (gate items done / total). */
  moduleFraction: Record<number, number>;
  halfMocksDone: number;
  fullMocksDone: number;
}

export interface PlannerContent {
  blueprint: Blueprint;
  modules: Pick<ModuleMeta, 'module' | 'title' | 'effortUnits'>[];
}

export interface PlannerOptions {
  /** Mid-December mode: shorter Phase 2 and the minimum number of full mocks. */
  compressed?: boolean;
  /** Ignore per-week overrides (used to compute the required weekly hours). */
  ignoreOverrides?: boolean;
}

export type Phase = 0 | 1 | 2 | 3 | 'buffer';

export type PlanItemKind = 'setup' | 'diagnostic' | 'module' | 'consolidate' | 'half-mock' | 'full-mock' | 'buffer' | 'exam';

export interface PlanItem {
  kind: PlanItemKind;
  module?: number;
  hours: number;
  label: string;
  /** Extra routine for the day, shown as sub-steps. */
  routine?: string[];
}

export interface DayPlan {
  date: ISODate;
  capacity: number;
  phase: Phase;
  items: PlanItem[];
}

export interface WeekPlan {
  start: ISODate;
  index: number; // W0 = week containing the plan start
  hours: number;
  phases: Phase[];
  modules: { module: number; units: number }[];
  label: string;
}

export type PlanStatus = 'on-track' | 'tight' | 'behind';

export interface Plan {
  start: ISODate;
  targetDate: ISODate; // date by which the user should be exam-ready
  deadline: ISODate; // last acceptable exam date
  readyDate: ISODate | null; // null if not reachable within the horizon
  status: PlanStatus;
  phase1End: ISODate | null;
  mocksPlanned: number;
  compressed: boolean;
  days: DayPlan[];
  weeks: WeekPlan[];
  warnings: string[];
}

/** Share of the weekly hours per weekday (Mon–Fri sessions, long Saturday lab block, short Sunday review). */
export const DAY_WEIGHTS = [0.14, 0.14, 0.14, 0.14, 0.14, 0.24, 0.06] as const;
const HORIZON_DAYS = 730;
const EPS = 1e-6;

interface Block {
  kind: PlanItemKind;
  phase: Phase;
  module?: number;
  hours: number;
  label: string;
}

export function examTarget(exam: ExamPlan): { target: ISODate; deadline: ISODate } {
  // Be ready the day before the (earliest) exam date.
  return exam.mode === 'fixed'
    ? { target: addDays(exam.date, -1), deadline: addDays(exam.date, -1) }
    : { target: addDays(exam.earliest, -1), deadline: addDays(exam.latest, -1) };
}

export function busyFactor(date: ISODate, busy: BusyPeriod[]): number {
  let f = 1;
  for (const b of busy) if (date >= b.start && date <= b.end) f = Math.min(f, b.factor);
  return f;
}

export function weekHours(date: ISODate, profile: PlannerProfile, opts: PlannerOptions = {}): number {
  const override = opts.ignoreOverrides ? undefined : profile.hourOverrides[startOfWeek(date)];
  return override ?? profile.hoursPerWeek;
}

export function dayCapacity(date: ISODate, profile: PlannerProfile, opts: PlannerOptions = {}): number {
  return weekHours(date, profile, opts) * DAY_WEIGHTS[weekday(date)]! * busyFactor(date, profile.busyPeriods);
}

function moduleOrder(profile: PlannerProfile, content: PlannerContent): number[] {
  return content.modules
    .map((m) => m.module)
    // M0 is on the plan until the user passes the Foundations skip-check (beginners always take it).
    .filter((n) => n > 0 || !profile.foundationsSkipped || profile.level === 'beginner')
    .sort((a, b) => a - b);
}

function buildBlocks(profile: PlannerProfile, progress: PlannerProgress, content: PlannerContent, compressed: boolean): Block[] {
  const bp = content.blueprint;
  const blocks: Block[] = [];
  const perUnit = bp.hoursPerUnit[profile.level];

  for (const n of moduleOrder(profile, content)) {
    if (progress.doneModules.includes(n)) continue;
    const meta = content.modules.find((m) => m.module === n)!;
    const remaining = meta.effortUnits * perUnit * (1 - Math.min(0.95, progress.moduleFraction[n] ?? 0));
    blocks.push({ kind: 'module', phase: 1, module: n, hours: remaining, label: `M${n} ${meta.title}` });
  }

  // Phase 2: consolidation drills around half-mocks.
  const halfMocks = Math.max(0, (compressed ? 1 : 2) - progress.halfMocksDone);
  const p2 = compressed ? bp.phase2Hours.compressed : bp.phase2Hours.normal;
  const halfHours = bp.halfMock.minutes / 60;
  const drill = Math.max(0, p2 - halfMocks * halfHours);
  const slices = halfMocks + 1;
  for (let i = 0; i < slices; i++) {
    if (drill > EPS) blocks.push({ kind: 'consolidate', phase: 2, hours: drill / slices, label: 'Consolidation: weak-domain drills and reference sheets' });
    if (i < halfMocks)
      blocks.push({
        kind: 'half-mock',
        phase: 2,
        hours: halfHours,
        label: `Half-mock #${progress.halfMocksDone + i + 1} (${bp.halfMock.questions} q, ${bp.halfMock.minutes} min)`,
      });
  }

  // Phase 3: full mocks from the held-out pool, each followed by debrief + remediation.
  const mocks = compressed ? bp.mocks.minimum : bp.mocks.target;
  for (let i = progress.fullMocksDone; i < mocks; i++) {
    blocks.push({
      kind: 'full-mock',
      phase: 3,
      hours: bp.mockHours,
      label: `Full mock #${i + 1} (${bp.fullMock.questions} q, ${bp.fullMock.minutes} min) + debrief`,
    });
  }
  return blocks;
}

function routineFor(date: ISODate, phase: Phase, phase1Week: number): string[] {
  const wd = weekday(date);
  if (phase === 1) {
    if (wd === 5) return ['FSRS reviews', 'Lab block', 'Feynman summary of the week’s module'];
    if (wd === 6) return phase1Week >= 3 ? ['FSRS reviews', '40-question interleaved quiz', 'Weekly review'] : ['FSRS reviews', 'Weekly review'];
    return ['FSRS reviews (10–15 min)', 'Pre-test → notes → module work', '20-question quiz + mistake log'];
  }
  if (phase === 2) return ['FSRS reviews', 'Weak-spot drill', 'Reference sheet recall'];
  if (phase === 3) return ['FSRS reviews', 'Mock remediation from the mistake log'];
  if (phase === 'buffer') return ['FSRS reviews', 'Weak-spot drill or external practice exam'];
  return [];
}

/**
 * Computes the day-by-day plan (§5). Pure: re-running it with fresh progress is the automatic re-plan.
 */
export function buildPlan(
  profile: PlannerProfile,
  progress: PlannerProgress,
  content: PlannerContent,
  today: ISODate,
  opts: PlannerOptions = {},
): Plan {
  const compressed = opts.compressed ?? false;
  const { target, deadline } = examTarget(profile.exam);
  const warnings: string[] = [];
  const days: DayPlan[] = [];
  const bp = content.blueprint;

  let cursor = today;

  // Phase 0: from today to the day before next Monday (3–5 days), or 3 days if that would be too short/long.
  if (!progress.phase0Done) {
    const toMonday = (7 - weekday(today)) % 7;
    const len = toMonday >= 3 && toMonday <= 5 ? toMonday : 3;
    for (let i = 0; i < len; i++) {
      const date = addDays(today, i);
      const items: PlanItem[] =
        i === 0
          ? [{ kind: 'diagnostic', hours: bp.phase0Hours * 0.6, label: 'Diagnostic: 60 questions (3 per module) to map weak zones' }]
          : [{ kind: 'setup', hours: (bp.phase0Hours * 0.4) / (len - 1), label: 'Set up: lab VM, reference sheets 1–5 skim, app tour' }];
      days.push({ date, capacity: dayCapacity(date, profile, opts), phase: 0, items });
    }
    cursor = addDays(today, len);
  }

  const blocks = buildBlocks(profile, progress, content, compressed);
  let bi = 0;
  let left = blocks[0]?.hours ?? 0;
  let readyDate: ISODate | null = blocks.length === 0 ? addDays(cursor, -1) : null;
  let phase1End: ISODate | null = blocks.some((b) => b.phase === 1) ? null : readyDate;
  let firstPhase1Day: ISODate | null = null;

  for (let guard = 0; bi < blocks.length && guard < HORIZON_DAYS; guard++) {
    const date = cursor;
    const capacity = dayCapacity(date, profile, opts);
    let free = capacity;
    const items: PlanItem[] = [];
    let phase: Phase = blocks[bi]!.phase;

    while (free > EPS && bi < blocks.length) {
      const b = blocks[bi]!;
      const used = Math.min(free, left);
      const last = items[items.length - 1];
      if (last && last.label === b.label) last.hours += used;
      else items.push({ kind: b.kind, module: b.module, hours: used, label: b.label });
      free -= used;
      left -= used;
      if (left <= EPS) {
        if (b.phase === 1 && blocks[bi + 1]?.phase !== 1) phase1End = date;
        bi++;
        left = blocks[bi]?.hours ?? 0;
        if (bi === blocks.length) readyDate = date;
      }
    }
    if (items.some((i) => i.kind === 'module')) phase = 1;
    else if (items.some((i) => i.kind === 'full-mock')) phase = 3;
    else if (items.length > 0) phase = 2;
    if (phase === 1 && firstPhase1Day === null) firstPhase1Day = date;
    const p1week = firstPhase1Day ? Math.floor(daysBetween(startOfWeek(firstPhase1Day), date) / 7) + 1 : 1;
    days.push({ date, capacity, phase, items: items.map((i) => ({ ...i, routine: routineFor(date, phase, p1week) })) });
    cursor = addDays(cursor, 1);
  }

  // Buffer until the deadline (window mode) or the exam date, then the exam day.
  const examDay = profile.exam.mode === 'fixed' ? profile.exam.date : profile.exam.latest;
  while (readyDate !== null && cursor < examDay) {
    days.push({
      date: cursor,
      capacity: dayCapacity(cursor, profile, opts),
      phase: 'buffer',
      items: [{ kind: 'buffer', hours: dayCapacity(cursor, profile, opts), label: 'Buffer: extra drills, spaced reviews, external practice exam', routine: routineFor(cursor, 'buffer', 99) }],
    });
    cursor = addDays(cursor, 1);
  }
  if (readyDate !== null && cursor === examDay) {
    days.push({
      date: examDay,
      capacity: 0,
      phase: 'buffer',
      items: [{ kind: 'exam', hours: 0, label: profile.exam.mode === 'fixed' ? 'Exam day' : 'Latest exam date of your window' }],
    });
  }

  let status: PlanStatus;
  if (readyDate === null || readyDate > deadline) status = 'behind';
  else if (readyDate <= target) status = 'on-track';
  else status = 'tight';

  if (readyDate === null) warnings.push('At this pace the plan does not finish within two years. Increase your weekly hours.');
  else if (status === 'behind')
    warnings.push(`At ${profile.hoursPerWeek} h/week you would be ready on ${readyDate}, after your ${profile.exam.mode === 'fixed' ? 'exam date' : 'latest date'}.`);
  else if (status === 'tight' && profile.exam.mode === 'window')
    warnings.push(`At ${profile.hoursPerWeek} h/week you will be ready on ${readyDate}: after your earliest date (${profile.exam.earliest}), before your latest (${profile.exam.latest}).`);

  const planStart = days[0]?.date ?? today;
  return {
    start: planStart,
    targetDate: target,
    deadline,
    readyDate,
    status,
    phase1End,
    mocksPlanned: compressed ? bp.mocks.minimum : bp.mocks.target,
    compressed,
    days,
    weeks: summarizeWeeks(days, planStart),
    warnings,
  };
}

function summarizeWeeks(days: DayPlan[], planStart: ISODate): WeekPlan[] {
  const w0 = startOfWeek(planStart);
  const weeks = new Map<ISODate, WeekPlan>();
  for (const d of days) {
    const start = startOfWeek(d.date);
    let w = weeks.get(start);
    if (!w) {
      w = { start, index: Math.round(daysBetween(w0, start) / 7), hours: 0, phases: [], modules: [], label: '' };
      weeks.set(start, w);
    }
    if (!w.phases.includes(d.phase)) w.phases.push(d.phase);
    for (const i of d.items) {
      w.hours += i.hours;
      if (i.kind === 'module' && i.module !== undefined) {
        const m = w.modules.find((x) => x.module === i.module);
        if (m) m.units += i.hours;
        else w.modules.push({ module: i.module, units: i.hours });
      }
    }
  }
  for (const w of weeks.values()) {
    const parts: string[] = [];
    if (w.phases.includes(0)) parts.push('Phase 0: setup & diagnostic');
    if (w.modules.length) parts.push(w.modules.map((m) => `M${m.module}`).join(', '));
    if (w.phases.includes(2)) parts.push('Phase 2: consolidation');
    if (w.phases.includes(3)) parts.push('Phase 3: full mocks');
    if (w.phases.includes('buffer')) parts.push('Buffer');
    w.label = parts.join(' · ');
  }
  return [...weeks.values()];
}

/** Smallest weekly hours (0.5 h steps) that make the user ready by `target`, or null if above 60 h. */
export function requiredHoursPerWeek(
  profile: PlannerProfile,
  progress: PlannerProgress,
  content: PlannerContent,
  today: ISODate,
  target: ISODate,
  opts: PlannerOptions = {},
): number | null {
  const ready = (h: number) => {
    const plan = buildPlan({ ...profile, hoursPerWeek: h }, progress, content, today, { ...opts, ignoreOverrides: true });
    return plan.readyDate !== null && plan.readyDate <= target;
  };
  if (!ready(60)) return null;
  let lo = 0.5;
  let hi = 60;
  while (hi - lo > 0.5) {
    const mid = Math.round(((lo + hi) / 2) * 2) / 2;
    if (ready(mid)) hi = mid;
    else lo = mid;
  }
  return ready(lo) ? lo : hi;
}

export interface TradeOff {
  target: ISODate;
  normal: number | null;
  compressed: number | null;
}

/** "What would it take to be ready by the target date?" — the §5.3 trade-off, computed. */
export function readinessTradeOff(profile: PlannerProfile, progress: PlannerProgress, content: PlannerContent, today: ISODate): TradeOff {
  const { target } = examTarget(profile.exam);
  return {
    target,
    normal: requiredHoursPerWeek(profile, progress, content, today, target),
    compressed: requiredHoursPerWeek(profile, progress, content, today, target, { compressed: true }),
  };
}
