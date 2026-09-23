import { assembleContent, type RawContentFiles } from './assemble.ts';
import type { ContentBundle, DomainId, Flashcard, ModuleContent, Question } from '../schemas/content.ts';

// Everything under /content is bundled at build time, so the app works offline from the first launch.
const json = import.meta.glob('/content/**/*.json', { eager: true, import: 'default' });
const md = import.meta.glob('/content/modules/*/notes.md', { eager: true, query: '?raw', import: 'default' });

function rawFiles(): RawContentFiles {
  const files: RawContentFiles = {};
  for (const [path, data] of Object.entries({ ...json, ...md })) files[path.replace(/^\/content\//, '')] = data;
  return files;
}

export interface ContentIndex {
  bundle: ContentBundle;
  modules: ModuleContent[];
  questions: Question[];
  cards: Flashcard[];
  questionById: Map<string, Question>;
  cardById: Map<string, Flashcard>;
  module(n: number): ModuleContent | undefined;
  domainName(id: DomainId): string;
}

export function indexContent(b: ContentBundle): ContentIndex {
  const modules = [...b.modules].sort((x, y) => x.meta.module - y.meta.module);
  const questions = modules.flatMap((m) => m.questions);
  const cards = modules.flatMap((m) => m.flashcards);
  return {
    bundle: b,
    modules,
    questions,
    cards,
    questionById: new Map(questions.map((q) => [q.id, q])),
    cardById: new Map(cards.map((c) => [c.id, c])),
    module: (n) => modules.find((m) => m.meta.module === n),
    domainName: (id) => b.blueprint.domains.find((d) => d.id === id)?.name ?? id,
  };
}

const { bundle, issues } = assembleContent(rawFiles());
if (!bundle) {
  throw new Error(`Bundled content is invalid:\n${issues.map((i) => `${i.file}: ${i.message}`).join('\n')}`);
}

export const content: ContentIndex = indexContent(bundle);
