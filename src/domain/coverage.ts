import { noteSections } from '../content/validate.ts';
import type { ModuleContent } from '../schemas/content.ts';

/** Same floors as the validator's per-section coverage rule (§6.5). */
export const MIN_SECTION_CARDS = 3;
export const MIN_SECTION_PRACTICE = 5;

export interface SectionGap {
  section: string;
  missing: ('notes' | 'flashcards' | 'questions')[];
  /** Of the missing ones, those that exist but below the floor. */
  few: ('flashcards' | 'questions')[];
}

/** Sections of a module that the app doesn't fully cover yet: no notes heading, too few cards or practice questions. */
export function sectionGaps(m: ModuleContent): SectionGap[] {
  const noted = noteSections(m.notes);
  return m.meta.sections
    .map((section) => {
      const missing: SectionGap['missing'] = [];
      const few: SectionGap['few'] = [];
      if (!noted.has(section)) missing.push('notes');
      const cards = m.flashcards.filter((c) => c.section === section).length;
      const practice = m.questions.filter((q) => q.section === section && q.pool === 'practice').length;
      if (cards < MIN_SECTION_CARDS) missing.push('flashcards');
      if (cards > 0 && cards < MIN_SECTION_CARDS) few.push('flashcards');
      if (practice < MIN_SECTION_PRACTICE) missing.push('questions');
      if (practice > 0 && practice < MIN_SECTION_PRACTICE) few.push('questions');
      return { section, missing, few };
    })
    .filter((g) => g.missing.length > 0);
}
