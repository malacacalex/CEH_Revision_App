import type { ModuleProgress } from '../schemas/progress.ts';

export interface GateItem {
  key: 'pretest' | 'notes' | 'reading' | 'quiz' | 'feynman' | 'cards';
  label: string;
  done: boolean;
}

export interface GateStatus {
  items: GateItem[];
  done: boolean;
  /** Share of gate items done, used by the planner to shrink the remaining effort. */
  fraction: number;
  started: boolean;
}

export function sentenceCount(text: string): number {
  return text
    .split(/[.!?]+(?:\s|$)/)
    .map((s) => s.trim())
    .filter((s) => s.split(/\s+/).length >= 3).length;
}

export const FEYNMAN_MIN_SENTENCES = 5;

/**
 * §5.5 module gate: notes reviewed (+ Reading Map if the user owns the courseware), a fresh module
 * quiz ≥ 80%, a Feynman summary, and every flashcard introduced. The pre-test is tracked but not required.
 */
export function moduleGate(
  mp: ModuleProgress | undefined,
  opts: { ownsCourseware: boolean; cardsTotal: number; cardsIntroduced: number },
): GateStatus {
  const items: GateItem[] = [
    { key: 'pretest', label: 'Pre-test taken', done: !!mp?.pretestDoneAt },
    { key: 'notes', label: 'Notes reviewed', done: !!mp?.notesReviewedAt },
    ...(opts.ownsCourseware ? [{ key: 'reading' as const, label: 'Reading Map done', done: !!mp?.readingMapDoneAt }] : []),
    { key: 'quiz', label: 'Module quiz ≥ 80%', done: !!mp?.moduleQuizPassedAt },
    { key: 'feynman', label: `Feynman summary (${FEYNMAN_MIN_SENTENCES}+ sentences)`, done: sentenceCount(mp?.feynman ?? '') >= FEYNMAN_MIN_SENTENCES },
    {
      key: 'cards',
      label: `All flashcards introduced (${Math.min(opts.cardsIntroduced, opts.cardsTotal)}/${opts.cardsTotal})`,
      done: opts.cardsIntroduced >= opts.cardsTotal,
    },
  ];
  const required = items.filter((i) => i.key !== 'pretest');
  const done = required.every((i) => i.done);
  return {
    items,
    done,
    fraction: items.filter((i) => i.done).length / items.length,
    started: !!mp?.startedAt || items.some((i) => i.done && i.key !== 'cards'),
  };
}
