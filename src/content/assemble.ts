import {
  BlueprintSchema,
  ContentBundleSchema,
  ContentVersionSchema,
  FlashcardSchema,
  GlossaryEntrySchema,
  ModuleMetaSchema,
  QuestionSchema,
  type ContentBundle,
  type Pool,
} from '../schemas/content.ts';
import { z } from 'zod';

export const QUESTION_POOLS: Pool[] = ['diagnostic', 'pretest', 'practice', 'mock'];

/** Raw files keyed by their path relative to /content, e.g. "modules/m03/meta.json". */
export type RawContentFiles = Record<string, unknown>;

export interface AssembleIssue {
  file: string;
  message: string;
}

/**
 * Turns the raw /content files into a validated ContentBundle.
 * Shared by the app (Vite glob imports) and the Node scripts (fs), so both see exactly the same data.
 */
export function assembleContent(files: RawContentFiles): { bundle: ContentBundle | null; issues: AssembleIssue[] } {
  const issues: AssembleIssue[] = [];

  function parse<T extends z.ZodType>(file: string, schema: T): z.infer<T> | undefined {
    const raw = files[file];
    if (raw === undefined) {
      issues.push({ file, message: 'missing file' });
      return undefined;
    }
    const res = schema.safeParse(raw);
    if (!res.success) {
      for (const i of res.error.issues) issues.push({ file, message: `${i.path.join('.') || '(root)'}: ${i.message}` });
      return undefined;
    }
    return res.data;
  }

  const version = parse('content-version.json', ContentVersionSchema);
  const blueprint = parse('config/blueprint.json', BlueprintSchema);
  const glossary = files['glossary.json'] === undefined ? [] : (parse('glossary.json', z.array(GlossaryEntrySchema)) ?? []);

  const moduleDirs = [...new Set(Object.keys(files).map((f) => /^modules\/(m\d{2})\//.exec(f)?.[1]).filter(Boolean))].sort() as string[];

  const modules: ContentBundle['modules'] = [];
  for (const dir of moduleDirs) {
    const meta = parse(`modules/${dir}/meta.json`, ModuleMetaSchema);
    if (!meta) continue;
    const expectedDir = `m${String(meta.module).padStart(2, '0')}`;
    if (expectedDir !== dir) issues.push({ file: `modules/${dir}/meta.json`, message: `module ${meta.module} must live in ${expectedDir}/` });

    const notesRaw = files[`modules/${dir}/notes.md`];
    const notes = typeof notesRaw === 'string' ? notesRaw : '';

    const cardsFile = `modules/${dir}/flashcards.json`;
    const flashcards = files[cardsFile] === undefined ? [] : (parse(cardsFile, z.array(FlashcardSchema)) ?? []);

    const questions: ContentBundle['modules'][number]['questions'] = [];
    for (const pool of QUESTION_POOLS) {
      const qFile = `modules/${dir}/questions.${pool}.json`;
      if (files[qFile] === undefined) continue;
      const qs = parse(qFile, z.array(QuestionSchema)) ?? [];
      for (const q of qs) {
        // A question's pool is decided by the file it lives in; this keeps the held-out mock pool isolated.
        if (q.pool !== pool) issues.push({ file: qFile, message: `${q.id}: pool "${q.pool}" does not match file pool "${pool}"` });
      }
      questions.push(...qs);
    }
    modules.push({ meta, notes, flashcards, questions });
  }

  if (!version || !blueprint || issues.length > 0) return { bundle: null, issues };

  const bundle = { format: 'shieldup-content' as const, version, blueprint, modules, glossary };
  const final = ContentBundleSchema.safeParse(bundle);
  if (!final.success) {
    for (const i of final.error.issues) issues.push({ file: '(bundle)', message: `${i.path.join('.')}: ${i.message}` });
    return { bundle: null, issues };
  }
  return { bundle: final.data, issues };
}
