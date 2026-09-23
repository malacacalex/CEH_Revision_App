import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Question } from '../src/schemas/content.ts';
import { formatContentJson } from './json-format.ts';
import { CONTENT_DIR } from './load-content.ts';

/**
 * Balances answer positions (§7.2: "randomize answer positions, and keep them balanced").
 *
 * Questions are grouped (per module and pool; the diagnostic is one group across modules), sorted by id,
 * and each block of 4 gets a permutation of A–D chosen from a hash of the group and block. The correct
 * option (and its option note) is swapped into its target slot. Targets depend only on ids, so running
 * the script twice changes nothing. Questions tagged "fixed-order" keep their order.
 *
 *   npm run content:balance            # all modules
 *   npm run content:balance -- 0 3     # only M0 and M3 (the diagnostic group is always balanced whole)
 */
const PERMS: number[][] = [];
(function permute(prefix: number[], rest: number[]) {
  if (rest.length === 0) PERMS.push(prefix);
  rest.forEach((x, i) => permute([...prefix, x], [...rest.slice(0, i), ...rest.slice(i + 1)]));
})([], [0, 1, 2, 3]);

function fnv(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193) >>> 0;
  return h;
}

function moveAnswer(q: Question, target: number): Question {
  if (q.answer === target) return q;
  const options = [...q.options] as Question['options'];
  const notes = [...q.optionNotes] as Question['optionNotes'];
  [options[q.answer], options[target]] = [options[target]!, options[q.answer]!];
  [notes[q.answer], notes[target]] = [notes[target]!, notes[q.answer]!];
  return { ...q, options, optionNotes: notes, answer: target as Question['answer'] };
}

const only = new Set(process.argv.slice(2).map(Number));
const modulesDir = join(CONTENT_DIR, 'modules');
const files: { path: string; questions: Question[] }[] = [];
for (const dir of readdirSync(modulesDir).sort()) {
  for (const name of readdirSync(join(modulesDir, dir)).filter((n) => /^questions\.\w+\.json$/.test(n))) {
    const path = join(modulesDir, dir, name);
    files.push({ path, questions: JSON.parse(readFileSync(path, 'utf8')) as Question[] });
  }
}

const groups = new Map<string, Question[]>();
for (const { questions } of files) {
  for (const q of questions) {
    if (q.tags.includes('fixed-order')) continue;
    const key = q.pool === 'diagnostic' ? 'diagnostic' : `m${q.module}/${q.pool}`;
    if (q.pool !== 'diagnostic' && only.size > 0 && !only.has(q.module)) continue;
    groups.set(key, [...(groups.get(key) ?? []), q]);
  }
}

const targets = new Map<string, number>();
for (const [key, qs] of groups) {
  qs.sort((a, b) => a.id.localeCompare(b.id));
  qs.forEach((q, i) => targets.set(q.id, PERMS[fnv(`${key}#${Math.floor(i / 4)}`) % PERMS.length]![i % 4]!));
}

let moved = 0;
for (const f of files) {
  let changed = false;
  const next = f.questions.map((q) => {
    const t = targets.get(q.id);
    if (t === undefined || t === q.answer) return q;
    changed = true;
    moved++;
    return moveAnswer(q, t);
  });
  if (changed) writeFileSync(f.path, `${formatContentJson(next)}\n`);
}
console.log(`✓ ${moved} question(s) re-positioned across ${groups.size} group(s).`);
