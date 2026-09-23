import { describe, expect, it } from 'vitest';
import { validateContent } from '../../src/content/validate.ts';
import { assembleContent } from '../../src/content/assemble.ts';
import { loadContentFromDisk, readRawContent } from '../../scripts/load-content.ts';

describe('bundled content', () => {
  it('passes schema and validation rules', () => {
    const { bundle, issues } = loadContentFromDisk();
    expect(issues).toEqual([]);
    expect(validateContent(bundle!).errors).toEqual([]);
  });
});

describe('validator catches rule breaks', () => {
  const raw = readRawContent();
  const clone = () => structuredClone(raw) as Record<string, unknown>;

  it('rejects a practice item placed in the mock file (pool isolation)', () => {
    const files = clone();
    const practice = files['modules/m03/questions.practice.json'] as { pool: string }[];
    files['modules/m03/questions.mock.json'] = [practice[0]];
    files['modules/m03/questions.practice.json'] = practice.slice(1);
    const { bundle, issues } = assembleContent(files);
    expect(bundle).toBeNull();
    expect(issues.some((i) => i.message.includes('does not match file pool'))).toBe(true);
  });

  it('rejects a question without sources', () => {
    const files = clone();
    const qs = files['modules/m01/questions.practice.json'] as { sources: string[] }[];
    qs[0]!.sources = [];
    expect(assembleContent(files).bundle).toBeNull();
  });

  it('flags near-duplicate stems and duplicate options', () => {
    const files = clone();
    const qs = files['modules/m01/questions.practice.json'] as Record<string, unknown>[];
    qs.push({ ...qs[0]!, id: 'm01-q-0999', options: ['A', 'a', 'B', 'C'] });
    const { bundle } = assembleContent(files);
    const { errors } = validateContent(bundle!);
    expect(errors.some((e) => e.includes('near-duplicate'))).toBe(true);
    expect(errors.some((e) => e.includes('duplicate options'))).toBe(true);
  });

  it('enforces coverage and balance for built modules', () => {
    const files = clone();
    (files['modules/m03/meta.json'] as { status: string }).status = 'built';
    const { errors } = validateContent(assembleContent(files).bundle!);
    expect(errors.some((e) => e.startsWith('m03: section'))).toBe(true);
    expect(errors.some((e) => e.includes('pretest questions'))).toBe(true);
  });
});
