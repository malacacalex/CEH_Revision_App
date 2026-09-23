import { z } from 'zod';

/** D0 = Foundations (M0, beginners only). D1..D9 = CEH v13 blueprint domains. */
export const DomainIdSchema = z.enum(['D0', 'D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8', 'D9']);
export type DomainId = z.infer<typeof DomainIdSchema>;

/**
 * diagnostic = Phase 0 map of weak zones (3 per module, M1–M20); skipcheck = M0's 20-question check that lets
 * intermediate users skip Foundations; mock = held-out pool, never used in practice modes.
 */
export const PoolSchema = z.enum(['diagnostic', 'skipcheck', 'pretest', 'practice', 'mock']);
export type Pool = z.infer<typeof PoolSchema>;

export const QuestionTypeSchema = z.enum(['recall', 'scenario', 'tool', 'command-output', 'ec-council-term']);
export type QuestionType = z.infer<typeof QuestionTypeSchema>;

const idPattern = (kind: 'q' | 'c') => new RegExp(`^m(0\\d|1\\d|20)-${kind}-\\d{4}$`);
const url = z.url({ protocol: /^https?$/ });
const nonEmpty = z.string().trim().min(1);

export const QuestionSchema = z.strictObject({
  id: z.string().regex(idPattern('q'), 'id must look like m03-q-0042'),
  module: z.number().int().min(0).max(20),
  section: nonEmpty,
  domain: DomainIdSchema,
  pool: PoolSchema,
  type: QuestionTypeSchema,
  difficulty: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  stem: nonEmpty,
  options: z.tuple([nonEmpty, nonEmpty, nonEmpty, nonEmpty]),
  answer: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
  explanation: nonEmpty,
  optionNotes: z.tuple([nonEmpty, nonEmpty, nonEmpty, nonEmpty]),
  tags: z.array(nonEmpty),
  sources: z.array(url).min(1),
  verify: z.boolean(),
  rev: z.number().int().min(1),
});
export type Question = z.infer<typeof QuestionSchema>;

export const FlashcardKindSchema = z.enum(['term', 'tool', 'port', 'command', 'countermeasure', 'list', 'diagram']);

export const FlashcardSchema = z.strictObject({
  id: z.string().regex(idPattern('c'), 'id must look like m03-c-0007'),
  module: z.number().int().min(0).max(20),
  section: nonEmpty,
  domain: DomainIdSchema,
  kind: FlashcardKindSchema,
  front: nonEmpty,
  back: nonEmpty,
  tags: z.array(nonEmpty),
  sources: z.array(url).min(1),
  verify: z.boolean(),
  rev: z.number().int().min(1),
});
export type Flashcard = z.infer<typeof FlashcardSchema>;

/** stub = only titles/sections, sample = MVP test content, built = full §7.1 package. */
export const ModuleStatusSchema = z.enum(['stub', 'sample', 'built']);

export const ModuleMetaSchema = z.strictObject({
  module: z.number().int().min(0).max(20),
  title: nonEmpty,
  domain: DomainIdSchema,
  effortUnits: z.number().positive(),
  status: ModuleStatusSchema,
  sections: z.array(nonEmpty).min(1),
  objectives: z.array(z.strictObject({ text: nonEmpty, section: nonEmpty })),
  readingMap: z.array(
    z.strictObject({
      section: nonEmpty,
      priority: z.enum(['MUST', 'SKIM', 'SKIP']),
      minutes: z.number().int().positive(),
      why: nonEmpty,
    }),
  ),
  labs: z.array(
    z.strictObject({
      name: nonEmpty,
      source: z.enum(['iLabs', 'free']),
      where: z.string().optional(),
      skill: nonEmpty,
      minutes: z.number().int().positive(),
      verify: z.boolean().default(false),
    }),
  ),
  feynmanPrompts: z.array(nonEmpty),
});
export type ModuleMeta = z.infer<typeof ModuleMetaSchema>;

export const GlossaryEntrySchema = z.strictObject({
  term: nonEmpty,
  definition: nonEmpty,
  modules: z.array(z.number().int().min(0).max(20)),
  tags: z.array(nonEmpty).default([]),
  sources: z.array(url).min(1),
  verify: z.boolean().default(false),
});
export type GlossaryEntry = z.infer<typeof GlossaryEntrySchema>;

/** A global reference sheet (§7.4): content/reference/NN-slug.md with a small front matter block. */
export const ReferenceSheetSchema = z.strictObject({
  id: z.string().regex(/^ref-\d{2}$/, 'id must look like ref-01'),
  title: nonEmpty,
  order: z.number().int().positive(),
  modules: z.array(z.number().int().min(0).max(20)),
  rev: z.number().int().min(1),
  verify: z.boolean(),
  sources: z.array(url).min(1),
  body: nonEmpty,
});
export type ReferenceSheet = z.infer<typeof ReferenceSheetSchema>;

export const BlueprintSchema = z.strictObject({
  note: z.string(),
  domains: z.array(
    z.strictObject({
      id: DomainIdSchema,
      name: nonEmpty,
      weight: z.number().min(0).max(1),
      modules: z.array(z.number().int().min(0).max(20)).min(1),
    }),
  ),
  hoursPerUnit: z.strictObject({ beginner: z.number().positive(), intermediate: z.number().positive() }),
  phase0Hours: z.number().positive(),
  phase2Hours: z.strictObject({ normal: z.number().positive(), compressed: z.number().positive() }),
  mockHours: z.number().positive(),
  mocks: z.strictObject({ target: z.number().int().positive(), minimum: z.number().int().positive() }),
  fullMock: z.strictObject({ questions: z.number().int().positive(), minutes: z.number().int().positive() }),
  halfMock: z.strictObject({ questions: z.number().int().positive(), minutes: z.number().int().positive() }),
  mockPoolSize: z.number().int().positive(),
  moduleQuizSize: z.number().int().positive(),
  moduleQuizPass: z.number().min(0).max(1),
});
export type Blueprint = z.infer<typeof BlueprintSchema>;

export const ContentVersionSchema = z.strictObject({
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  date: z.iso.date(),
});

/** Everything the app needs, bundled or downloaded as a content pack. */
export const ContentBundleSchema = z.strictObject({
  format: z.literal('shieldup-content'),
  version: ContentVersionSchema,
  blueprint: BlueprintSchema,
  modules: z.array(
    z.strictObject({
      meta: ModuleMetaSchema,
      notes: z.string(),
      flashcards: z.array(FlashcardSchema),
      questions: z.array(QuestionSchema),
    }),
  ),
  glossary: z.array(GlossaryEntrySchema),
  references: z.array(ReferenceSheetSchema),
});
export type ContentBundle = z.infer<typeof ContentBundleSchema>;
export type ModuleContent = ContentBundle['modules'][number];
