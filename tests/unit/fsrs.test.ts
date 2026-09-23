import { describe, expect, it } from 'vitest';
import { gradeFromAnswer, isDue, newSrsState, previewSrs, Rating, reviewSrs, State } from '../../src/domain/fsrs/scheduler.ts';

const t0 = new Date('2026-09-28T08:00:00Z');
const DAY = 86_400_000;

describe('FSRS wiring', () => {
  it('creates a new card that is due immediately', () => {
    const s = newSrsState(t0);
    expect(s.state).toBe(State.New);
    expect(isDue(s, t0)).toBe(true);
  });

  it('Good schedules later than Hard, Hard later than Again', () => {
    const p = previewSrs(newSrsState(t0), t0);
    expect(p[Rating.Again]).toBeLessThan(p[Rating.Hard]);
    expect(p[Rating.Hard]).toBeLessThanOrEqual(p[Rating.Good]);
    expect(p[Rating.Good]).toBeLessThan(p[Rating.Easy]);
  });

  it('grows intervals with successive Good reviews and survives a DB round-trip (numbers only)', () => {
    let s = newSrsState(t0);
    let now = t0;
    const intervals: number[] = [];
    for (let i = 0; i < 4; i++) {
      s = JSON.parse(JSON.stringify(reviewSrs(s, Rating.Good, now, { fuzz: false })));
      intervals.push(s.due - now.getTime());
      now = new Date(s.due);
    }
    expect(intervals[3]!).toBeGreaterThan(intervals[1]!);
    expect(typeof s.due).toBe('number');
  });

  it('caps intervals to the days left before the exam', () => {
    let s = newSrsState(t0);
    let now = t0;
    for (let i = 0; i < 8; i++) {
      s = reviewSrs(s, Rating.Easy, now, { fuzz: false, maxIntervalDays: 10 });
      now = new Date(s.due);
    }
    expect(s.scheduled_days).toBeLessThanOrEqual(10);
  });

  it('a lapse sends a mature card back to relearning', () => {
    let s = newSrsState(t0);
    let now = t0;
    for (let i = 0; i < 4; i++) {
      s = reviewSrs(s, Rating.Good, now, { fuzz: false });
      now = new Date(s.due);
    }
    const lapsed = reviewSrs(s, Rating.Again, now, { fuzz: false });
    expect(lapsed.state).toBe(State.Relearning);
    expect(lapsed.lapses).toBe(1);
    expect(lapsed.due - now.getTime()).toBeLessThan(DAY);
  });

  it('grades question answers from correctness and confidence', () => {
    expect(gradeFromAnswer(false, 'sure')).toBe(Rating.Again);
    expect(gradeFromAnswer(true, 'guess')).toBe(Rating.Hard);
    expect(gradeFromAnswer(true, 'unsure')).toBe(Rating.Hard);
    expect(gradeFromAnswer(true, 'sure')).toBe(Rating.Good);
  });
});
