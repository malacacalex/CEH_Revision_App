import type { Attempt, QuizSession } from '../../schemas/progress.ts';
import type { AnswerRecord } from './score.ts';

/** What identifies "the same quiz": mode + module/domain, and the exact question list for a re-test. */
export interface QuizKey {
  mode: string;
  module?: number;
  domain?: string;
  ids?: string[];
}

export function sameQuiz(s: QuizSession, k: QuizKey): boolean {
  if (s.mode !== k.mode || s.module !== k.module || (s.domain ?? undefined) !== k.domain) return false;
  return k.ids === undefined || s.questionIds.join(',') === k.ids.join(',');
}

/** Answers already given in a session, in the order they were given. */
export function sessionAnswers(attempts: Attempt[], sessionId: string): AnswerRecord[] {
  return attempts
    .filter((a) => a.sessionId === sessionId)
    .sort((a, b) => a.at - b.at || (a.id ?? 0) - (b.id ?? 0))
    .map((a) => ({ questionId: a.questionId, chosen: a.chosen, confidence: a.confidence }));
}

/** The latest session of this quiz, if it is still open and every question still exists. */
export function openSession(sessions: QuizSession[], key: QuizKey, exists: (id: string) => boolean): QuizSession | undefined {
  const latest = sessions.filter((s) => sameQuiz(s, key)).sort((a, b) => b.startedAt - a.startedAt)[0];
  if (!latest || latest.finishedAt !== undefined || latest.questionIds.length === 0) return undefined;
  return latest.questionIds.every(exists) ? latest : undefined;
}

export interface InProgress {
  session: QuizSession;
  answered: number;
}

/** Open quizzes with at least one answer, newest first; a newer session of the same quiz hides older ones. */
export function quizzesInProgress(sessions: QuizSession[], attempts: Attempt[], exists: (id: string) => boolean): InProgress[] {
  const out: InProgress[] = [];
  const seen: QuizSession[] = [];
  for (const s of [...sessions].sort((a, b) => b.startedAt - a.startedAt)) {
    const key = keyOf(s);
    if (seen.some((x) => sameQuiz(x, key))) continue;
    seen.push(s);
    if (s.finishedAt !== undefined || !s.questionIds.every(exists)) continue;
    // A mock keeps its answers on the session until it is submitted.
    const answered = s.draft ? Object.values(s.draft).filter((d) => d.chosen !== null).length : attempts.filter((a) => a.sessionId === s.id).length;
    if (answered > 0) out.push({ session: s, answered });
  }
  return out;
}

export function keyOf(s: QuizSession): QuizKey {
  return { mode: s.mode, module: s.module, domain: s.domain, ids: s.mode === 'retest' ? s.questionIds : undefined };
}

/** Route that reopens this quiz (QuizRun resumes the open session on its own). */
export function quizHref(s: QuizSession): string {
  if (s.mode === 'half-mock' || s.mode === 'full-mock') return `/mock/run?kind=${s.mode}`;
  const p = new URLSearchParams({ mode: s.mode });
  if (s.module !== undefined) p.set('module', String(s.module));
  if (s.domain !== undefined) p.set('domain', s.domain);
  if (s.mode === 'retest') p.set('ids', s.questionIds.join(','));
  return `/quiz/run?${p.toString()}`;
}
