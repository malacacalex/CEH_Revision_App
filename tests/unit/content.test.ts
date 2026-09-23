import { describe, expect, it } from 'vitest';
import { validateContent } from '../../src/content/validate.ts';
import { assembleContent, parseFrontMatter } from '../../src/content/assemble.ts';
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

describe('M2 content rules', () => {
  const raw = readRawContent();
  const clone = () => structuredClone(raw) as Record<string, unknown>;

  it('keeps the diagnostic complete: 3 questions for every module M1–M20', () => {
    const files = clone();
    delete files['modules/m05/questions.diagnostic.json'];
    const { errors } = validateContent(assembleContent(files).bundle!);
    expect(errors).toContain('diagnostic: M5 has 0 questions (expected 3)');
  });

  it('rejects diagnostic questions in M0 and skip-check questions outside M0', () => {
    const files = clone();
    const skip = files['modules/m00/questions.skipcheck.json'] as Record<string, unknown>[];
    files['modules/m00/questions.diagnostic.json'] = [{ ...skip[0]!, id: 'm00-q-9001', pool: 'diagnostic' }];
    const m1 = files['modules/m01/questions.practice.json'] as Record<string, unknown>[];
    files['modules/m01/questions.skipcheck.json'] = [{ ...m1[0]!, id: 'm01-q-8001', pool: 'skipcheck' }];
    const { errors } = validateContent(assembleContent(files).bundle!);
    expect(errors.some((e) => e.includes('diagnostic questions belong to M1–M20'))).toBe(true);
    expect(errors.some((e) => e.includes('skip-check questions belong to M0'))).toBe(true);
  });

  it('requires a 20-question skip-check for M0', () => {
    const files = clone();
    files['modules/m00/questions.skipcheck.json'] = (files['modules/m00/questions.skipcheck.json'] as unknown[]).slice(0, 12);
    const { errors } = validateContent(assembleContent(files).bundle!);
    expect(errors.some((e) => e.includes('12 skip-check questions (expected 20)'))).toBe(true);
  });

  it('checks reference sheet ids against their order', () => {
    const files = clone();
    const key = Object.keys(files).find((k) => k.startsWith('reference/'))!;
    files[key] = String(files[key]).replace(/^order: \d+$/m, 'order: 9');
    const { errors } = validateContent(assembleContent(files).bundle!);
    expect(errors.some((e) => e.startsWith('reference:') && e.includes('should be ref-09'))).toBe(true);
  });

  it('rejects a reference sheet without front matter', () => {
    const files = clone();
    files['reference/99-broken.md'] = '# No front matter\n\n## Section\ntext';
    expect(assembleContent(files).bundle).toBeNull();
  });
});

describe('parseFrontMatter', () => {
  it('reads scalars, inline lists and block lists', () => {
    const fm = parseFrontMatter('---\nid: ref-01\norder: 1\nverify: false\ntitle: "Ports: the basics"\nmodules: [0, 3, 4]\nsources:\n  - https://a.example\n  - https://b.example\n---\n## Body\ntext');
    expect(fm).toEqual({
      data: { id: 'ref-01', order: 1, verify: false, title: 'Ports: the basics', modules: [0, 3, 4], sources: ['https://a.example', 'https://b.example'] },
      body: '## Body\ntext',
    });
  });

  it('handles CRLF files and returns null without front matter', () => {
    expect(parseFrontMatter('---\r\nrev: 2\r\n---\r\nbody')).toEqual({ data: { rev: 2 }, body: 'body' });
    expect(parseFrontMatter('# just markdown')).toBeNull();
  });
});
