import { describe, expect, it } from 'vitest';
import { buildMatcher } from '../../src/domain/glossary/match.ts';
import { openSession, quizHref, quizzesInProgress, sessionAnswers } from '../../src/domain/quiz/resume.ts';
import type { GlossaryEntry } from '../../src/schemas/content.ts';
import type { Attempt, QuizSession } from '../../src/schemas/progress.ts';

const entry = (term: string, aliases: string[] = []): GlossaryEntry => ({
  term,
  aliases,
  definition: `${term} definition`,
  modules: [0],
  tags: [],
  sources: ['https://example.org'],
  verify: false,
});

describe('glossary matcher', () => {
  const m = buildMatcher([entry('NAT', ['Network Address Translation']), entry('OSI model', ['OSI']), entry('Risk'), entry('Least privilege'), entry('SSL'), entry('TLS')]);
  const linked = (text: string) => m.split(text).filter((s) => s.entry).map((s) => `${s.text}→${s.entry!.term}`);

  it('links acronyms case-sensitively, with plurals, on word boundaries', () => {
    expect(linked('Two NATs sit behind the OSI layer, not an osi or a NATIVE app.')).toEqual(['NATs→NAT', 'OSI→OSI model']);
  });

  it('prefers the longest key and links phrases in any case', () => {
    expect(linked('The OSI model and least privilege.')).toEqual(['OSI model→OSI model', 'least privilege→Least privilege']);
    expect(linked('It uses network address translation.')).toEqual(['network address translation→NAT']);
  });

  it('leaves ordinary lowercase words alone and links each entry once', () => {
    expect(linked('The risk is low. Risk owners accept Risk.')).toEqual(['Risk→Risk']);
    expect(linked('SSL/TLS and TLS again')).toEqual(['SSL→SSL', 'TLS→TLS']);
  });

  it('keeps the text intact', () => {
    const text = 'NAT hides hosts; see the OSI model.';
    expect(m.split(text).map((s) => s.text).join('')).toBe(text);
  });

  it('shares the "seen" set across blocks', () => {
    const seen = new Set<string>();
    m.split('NAT here', seen);
    expect(m.split('NAT again', seen).some((s) => s.entry)).toBe(false);
  });
});

describe('quiz resume', () => {
  const session = (id: string, startedAt: number, extra: Partial<QuizSession> = {}): QuizSession => ({
    id,
    profileId: 'p',
    mode: 'module',
    module: 5,
    questionIds: ['q1', 'q2', 'q3'],
    startedAt,
    total: 3,
    ...extra,
  });
  const attempt = (sessionId: string, questionId: string, at: number): Attempt => ({
    profileId: 'p',
    sessionId,
    mode: 'module',
    questionId,
    rev: 1,
    chosen: 0,
    correct: true,
    confidence: 'sure',
    timeMs: 1000,
    at,
  });
  const exists = () => true;

  it('finds the latest open session of the same quiz', () => {
    const sessions = [session('old', 1), session('new', 2), session('other', 3, { module: 7 })];
    expect(openSession(sessions, { mode: 'module', module: 5 }, exists)?.id).toBe('new');
    expect(openSession([session('done', 1, { finishedAt: 5 })], { mode: 'module', module: 5 }, exists)).toBeUndefined();
    expect(openSession(sessions, { mode: 'module', module: 5 }, (id) => id !== 'q2')).toBeUndefined();
  });

  it('returns answers in order and lists quizzes in progress', () => {
    const attempts = [attempt('s', 'q2', 20), attempt('s', 'q1', 10), attempt('x', 'q1', 5)];
    expect(sessionAnswers(attempts, 's').map((a) => a.questionId)).toEqual(['q1', 'q2']);
    const list = quizzesInProgress([session('s', 1), session('fresh', 2, { mode: 'mixed', module: undefined })], attempts, exists);
    expect(list.map((x) => [x.session.id, x.answered])).toEqual([['s', 2]]);
    // A newer, still empty session of the same quiz hides the older one (the user chose "Start over").
    expect(quizzesInProgress([session('s', 1), session('s2', 2)], attempts, exists)).toEqual([]);
  });

  it('builds a route back to the quiz', () => {
    expect(quizHref(session('s', 1))).toBe('/quiz/run?mode=module&module=5');
    expect(quizHref(session('r', 1, { mode: 'retest', module: undefined }))).toBe('/quiz/run?mode=retest&ids=q1%2Cq2%2Cq3');
  });
});
