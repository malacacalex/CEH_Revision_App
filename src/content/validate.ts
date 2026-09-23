import type { ContentBundle, Question } from '../schemas/content.ts';

export interface ValidationReport {
  errors: string[];
  warnings: string[];
}

const AOTA_NOTA = /\b(all|none) of the above\b/i;
const NEAR_DUPLICATE_THRESHOLD = 0.8;

export const DIAGNOSTIC_PER_MODULE = 3;
export const SKIPCHECK_SIZE = 20;

export function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 2),
  );
}

export function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  return inter / (a.size + b.size - inter);
}

/** Section headings present in notes.md (## level). */
export function noteSections(notes: string): Set<string> {
  return new Set([...notes.matchAll(/^##\s+(.+?)\s*$/gm)].map((m) => m[1]!.trim()));
}

/** Per-module volume floors (spec §7.1): ~35 cards and ~50 practice questions per effort unit, 10% tolerance. */
export function volumeTargets(effortUnits: number, module?: number): { minCards: number; minPractice: number } {
  // M0 Foundations has its own size in §7.5: ~40 cards and ~60 questions.
  if (module === 0) return { minCards: 36, minPractice: 54 };
  return {
    minCards: Math.max(25, Math.round(35 * effortUnits * 0.9)),
    minPractice: Math.max(35, Math.round(50 * effortUnits * 0.9)),
  };
}

/** Every answer letter must sit within 20–30% of a set of questions (§6.5). */
export function balanceIssues(questions: Question[]): string[] {
  if (questions.length === 0) return [];
  const counts = [0, 0, 0, 0];
  for (const q of questions) counts[q.answer]!++;
  return counts.flatMap((c, i) => {
    const share = c / questions.length;
    return share < 0.2 || share > 0.3 ? [`answer ${'ABCD'[i]} is ${(share * 100).toFixed(0)}%`] : [];
  });
}

/**
 * Content rules from the spec (§6.5). Structural rules always fail the build.
 * Volume/coverage/balance rules only fail for modules marked "built"; for "sample"/"stub" modules they are warnings.
 */
export function validateContent(bundle: ContentBundle): ValidationReport {
  const errors: string[] = [];
  const warnings: string[] = [];
  const { blueprint } = bundle;

  // Blueprint consistency
  const weightSum = blueprint.domains.reduce((s, d) => s + d.weight, 0);
  if (Math.abs(weightSum - 1) > 0.001) errors.push(`blueprint: domain weights sum to ${weightSum.toFixed(3)}, expected 1`);
  const moduleToDomain = new Map<number, string>();
  for (const d of blueprint.domains) {
    for (const m of d.modules) {
      if (moduleToDomain.has(m)) errors.push(`blueprint: module ${m} listed in two domains`);
      moduleToDomain.set(m, d.id);
    }
  }
  for (let m = 0; m <= 20; m++) {
    if (!moduleToDomain.has(m)) errors.push(`blueprint: module ${m} is not assigned to a domain`);
    if (!bundle.modules.some((x) => x.meta.module === m)) errors.push(`modules: m${String(m).padStart(2, '0')}/meta.json is missing`);
  }

  const seenIds = new Set<string>();
  const allQuestions: Question[] = [];

  for (const { meta, notes, flashcards, questions } of bundle.modules) {
    const tag = `m${String(meta.module).padStart(2, '0')}`;
    const strict = meta.status === 'built';
    const soft = (msg: string) => (strict ? errors : warnings).push(`${tag}: ${msg}`);
    const sections = new Set(meta.sections);

    if (moduleToDomain.get(meta.module) !== meta.domain) errors.push(`${tag}: meta domain ${meta.domain} differs from blueprint`);
    for (const o of meta.objectives) if (!sections.has(o.section)) errors.push(`${tag}: objective section "${o.section}" is not a module section`);
    for (const r of meta.readingMap) if (!sections.has(r.section)) errors.push(`${tag}: reading map section "${r.section}" is not a module section`);

    for (const item of [...flashcards, ...questions]) {
      if (seenIds.has(item.id)) errors.push(`${tag}: duplicate id ${item.id}`);
      seenIds.add(item.id);
      if (!item.id.startsWith(`${tag}-`)) errors.push(`${tag}: ${item.id} has the wrong module prefix`);
      if (item.module !== meta.module) errors.push(`${tag}: ${item.id} has module ${item.module}`);
      if (item.domain !== meta.domain) errors.push(`${tag}: ${item.id} has domain ${item.domain}, module is ${meta.domain}`);
      if (!sections.has(item.section)) errors.push(`${tag}: ${item.id} section "${item.section}" is not a module section`);
    }

    for (const q of questions) {
      const normalized = q.options.map((o) => o.trim().toLowerCase());
      if (new Set(normalized).size !== 4) errors.push(`${tag}: ${q.id} has duplicate options`);
      if (!q.optionNotes.every((n) => n.trim().length > 0)) errors.push(`${tag}: ${q.id} is missing option notes`);
      // Pool placement: the diagnostic maps exam modules M1–M20; the skip-check belongs to M0 only.
      if (q.pool === 'diagnostic' && meta.module === 0) errors.push(`${tag}: ${q.id} diagnostic questions belong to M1–M20`);
      if (q.pool === 'skipcheck' && meta.module !== 0) errors.push(`${tag}: ${q.id} skip-check questions belong to M0`);
      allQuestions.push(q);
    }

    if (meta.status === 'stub') {
      warnings.push(`${tag}: stub (not built yet)`);
      continue;
    }

    // Coverage per section (§6.5): ≥ 1 note section, ≥ 3 cards, ≥ 5 practice questions.
    const noted = noteSections(notes);
    for (const s of meta.sections) {
      if (!noted.has(s)) soft(`section "${s}" has no "## ${s}" heading in notes.md`);
      const cards = flashcards.filter((c) => c.section === s).length;
      if (cards < 3) soft(`section "${s}" has ${cards} flashcards (min 3)`);
      const practice = questions.filter((q) => q.section === s && q.pool === 'practice').length;
      if (practice < 5) soft(`section "${s}" has ${practice} practice questions (min 5)`);
    }

    // Volumes (§7.1).
    const { minCards, minPractice } = volumeTargets(meta.effortUnits, meta.module);
    const pretest = questions.filter((q) => q.pool === 'pretest').length;
    const practice = questions.filter((q) => q.pool === 'practice').length;
    if (flashcards.length < minCards) soft(`${flashcards.length} flashcards (target ≥ ${minCards})`);
    if (practice < minPractice) soft(`${practice} practice questions (target ≥ ${minPractice})`);
    if (pretest !== 10) soft(`${pretest} pretest questions (expected 10)`);
    if (meta.objectives.length < 5) soft(`${meta.objectives.length} objectives (expected 5–10)`);
    if (meta.feynmanPrompts.length !== 3) soft(`${meta.feynmanPrompts.length} Feynman prompts (expected 3)`);

    // Answer-position balance (practice + mock, where volume makes it meaningful).
    const balanced = questions.filter((q) => q.pool === 'practice' || q.pool === 'mock');
    if (balanced.length >= 20) for (const b of balanceIssues(balanced)) soft(`${b} of practice+mock answers (must be 20–30%)`);

    if (meta.module === 0) {
      const check = questions.filter((q) => q.pool === 'skipcheck');
      if (check.length !== SKIPCHECK_SIZE) soft(`${check.length} skip-check questions (expected ${SKIPCHECK_SIZE})`);
      else for (const b of balanceIssues(check)) soft(`${b} of skip-check answers (must be 20–30%)`);
    }

    const unverified = [...flashcards, ...questions].filter((i) => i.verify).length;
    if (unverified > 0) warnings.push(`${tag}: ${unverified} item(s) flagged verify:true`);
  }

  // Diagnostic (§5.1): once it exists, exactly 3 questions for every exam module, balanced answers.
  const diagnostic = allQuestions.filter((q) => q.pool === 'diagnostic');
  if (diagnostic.length > 0) {
    for (let m = 1; m <= 20; m++) {
      const n = diagnostic.filter((q) => q.module === m).length;
      if (n !== DIAGNOSTIC_PER_MODULE) errors.push(`diagnostic: M${m} has ${n} questions (expected ${DIAGNOSTIC_PER_MODULE})`);
    }
    for (const b of balanceIssues(diagnostic)) errors.push(`diagnostic: ${b} of answers (must be 20–30%)`);
  }

  // Reference sheets (§7.4): unique ids matching their order, and at least one "## " section.
  const refIds = new Set<string>();
  for (const r of bundle.references) {
    if (refIds.has(r.id)) errors.push(`reference: duplicate id ${r.id}`);
    refIds.add(r.id);
    const expected = `ref-${String(r.order).padStart(2, '0')}`;
    if (r.id !== expected) errors.push(`reference: ${r.id} should be ${expected} (id matches its order)`);
    if (noteSections(r.body).size === 0) errors.push(`reference: ${r.id} has no "## " sections`);
    if (r.verify) warnings.push(`reference: ${r.id} flagged verify:true`);
  }

  // Near-duplicate stems across the whole bank (also catches mock items copied from practice).
  const tokens = allQuestions.map((q) => tokenize(q.stem));
  for (let i = 0; i < allQuestions.length; i++) {
    for (let j = i + 1; j < allQuestions.length; j++) {
      const sim = jaccard(tokens[i]!, tokens[j]!);
      if (sim >= NEAR_DUPLICATE_THRESHOLD)
        errors.push(`near-duplicate stems (${(sim * 100).toFixed(0)}%): ${allQuestions[i]!.id} / ${allQuestions[j]!.id}`);
    }
  }

  const aota = allQuestions.filter((q) => q.options.some((o) => AOTA_NOTA.test(o))).length;
  if (allQuestions.length > 0 && aota / allQuestions.length > 0.02)
    errors.push(`"all/none of the above" used in ${aota} questions (${((aota / allQuestions.length) * 100).toFixed(1)}% > 2%)`);

  return { errors, warnings };
}
