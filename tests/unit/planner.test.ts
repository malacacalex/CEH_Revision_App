import { describe, expect, it } from 'vitest';
import { buildPlan, readinessTradeOff, type PlannerProfile, type PlannerProgress } from '../../src/domain/planner/planner.ts';
import { loadContentFromDisk } from '../../scripts/load-content.ts';

const { bundle } = loadContentFromDisk();
// Reference schedule in course order: drop the build status so these tests don't move as modules get built.
const content = { blueprint: bundle!.blueprint, modules: bundle!.modules.map(({ meta: { status: _status, ...m } }) => m) };

/** The spec's reference user (§5.3): window Dec 14 → Jan 22, 10 h/week, beginner, busy until Oct 12. */
const axel: PlannerProfile = {
  level: 'beginner',
  exam: { mode: 'window', earliest: '2026-12-14', latest: '2027-01-22' },
  hoursPerWeek: 10,
  busyPeriods: [{ start: '2026-09-23', end: '2026-10-11', factor: 0.5 }],
  hourOverrides: {},
  foundationsSkipped: false,
};
const fresh: PlannerProgress = { phase0Done: false, doneModules: [], moduleFraction: {}, halfMocksDone: 0, fullMocksDone: 0 };
const TODAY = '2026-09-23';

describe('planner — reference schedule', () => {
  const plan = buildPlan(axel, fresh, content, TODAY);

  it('runs Phase 0 until the weekend and starts M0 on Monday W1', () => {
    expect(plan.days.filter((d) => d.phase === 0).map((d) => d.date)).toEqual(['2026-09-23', '2026-09-24', '2026-09-25', '2026-09-26', '2026-09-27']);
    const firstModuleDay = plan.days.find((d) => d.items.some((i) => i.kind === 'module'));
    expect(firstModuleDay?.date).toBe('2026-09-28');
    expect(firstModuleDay?.items[0]?.module).toBe(0);
  });

  it('covers M0 and M1 in W1–W2 (reduced load)', () => {
    const w1w2 = plan.weeks.filter((w) => w.index === 1 || w.index === 2).flatMap((w) => w.modules.map((m) => m.module));
    expect(w1w2).toContain(0);
    expect(w1w2).toContain(1);
    expect(w1w2).not.toContain(3);
  });

  it('ends Phase 1 in late December and is ready mid-January (≈ W16), inside the window', () => {
    expect(plan.phase1End! >= '2026-12-14' && plan.phase1End! <= '2027-01-03').toBe(true);
    expect(plan.readyDate! >= '2027-01-08' && plan.readyDate! <= '2027-01-21').toBe(true);
    expect(plan.status).toBe('tight');
    expect(plan.warnings.join(' ')).toMatch(/earliest date/);
  });

  it('plans 2 half-mocks and 4 full mocks', () => {
    const items = plan.days.flatMap((d) => d.items);
    expect(new Set(items.filter((i) => i.kind === 'half-mock').map((i) => i.label)).size).toBe(2);
    expect(new Set(items.filter((i) => i.kind === 'full-mock').map((i) => i.label)).size).toBe(4);
  });

  it('fills the rest of the window with buffer days and ends on the latest date', () => {
    expect(plan.days.at(-1)?.date).toBe('2027-01-22');
    expect(plan.days.at(-1)?.items[0]?.kind).toBe('exam');
  });

  it('computes the mid-December trade-off (~13–15 h/week, never below 3 mocks)', () => {
    const t = readinessTradeOff(axel, fresh, content, TODAY);
    expect(t.target).toBe('2026-12-13');
    expect(t.normal).toBeGreaterThanOrEqual(13.5);
    expect(t.normal).toBeLessThanOrEqual(16.5);
    expect(t.compressed).toBeLessThan(t.normal!);
    expect(t.compressed).toBeGreaterThanOrEqual(12.5);
    const compressed = buildPlan({ ...axel, hoursPerWeek: t.compressed! }, fresh, content, TODAY, { compressed: true });
    expect(compressed.mocksPlanned).toBe(3);
    expect(compressed.status).toBe('on-track');
  });
});

describe('planner — content status', () => {
  it('schedules built modules first, in course order, then sample, then stub', () => {
    const mixed = {
      ...content,
      modules: content.modules.map((m) => ({ ...m, status: m.module === 2 ? ('stub' as const) : m.module === 3 ? ('sample' as const) : ('built' as const) })),
    };
    const order = [...new Set(buildPlan(axel, fresh, mixed, TODAY).days.flatMap((d) => d.items).flatMap((i) => (i.kind === 'module' ? [i.module] : [])))];
    expect(order.slice(0, 3)).toEqual([0, 1, 4]);
    expect(order.slice(-2)).toEqual([3, 2]);
  });
});

describe('planner — re-planning', () => {
  it('moves the ready date earlier when modules are done', () => {
    const base = buildPlan(axel, fresh, content, TODAY);
    const later = buildPlan(axel, { ...fresh, phase0Done: true, doneModules: [0, 1, 2] }, content, TODAY);
    expect(later.readyDate! < base.readyDate!).toBe(true);
  });

  it('applies per-week hour overrides', () => {
    const base = buildPlan(axel, fresh, content, TODAY);
    const boosted = buildPlan({ ...axel, hourOverrides: { '2026-10-19': 25, '2026-10-26': 25 } }, fresh, content, TODAY);
    expect(boosted.readyDate! < base.readyDate!).toBe(true);
  });

  it('switches to a fixed exam date and flags an impossible plan as behind', () => {
    const plan = buildPlan({ ...axel, exam: { mode: 'fixed', date: '2026-11-15' } }, fresh, content, TODAY);
    expect(plan.status).toBe('behind');
    expect(plan.warnings[0]).toMatch(/after your exam date/);
  });

  it('skips M0 for an intermediate who passed the Foundations check', () => {
    const plan = buildPlan({ ...axel, level: 'intermediate', foundationsSkipped: true }, fresh, content, TODAY);
    expect(plan.days.flatMap((d) => d.items).some((i) => i.module === 0)).toBe(false);
  });

  it('reports on-track when hours are ample', () => {
    const plan = buildPlan({ ...axel, hoursPerWeek: 20, busyPeriods: [] }, fresh, content, TODAY);
    expect(plan.status).toBe('on-track');
    expect(plan.days.some((d) => d.phase === 'buffer')).toBe(true);
  });
});
