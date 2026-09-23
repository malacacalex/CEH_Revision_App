import type { DomainId, Question } from '../../schemas/content.ts';
import type { Confidence } from '../fsrs/scheduler.ts';

export interface AnswerRecord {
  questionId: string;
  chosen: number | null;
  confidence: Confidence;
}

export interface Tally {
  correct: number;
  total: number;
}

export interface ScoreReport extends Tally {
  pct: number;
  byDomain: Partial<Record<DomainId, Tally>>;
  byModule: Record<number, Tally>;
  byConfidence: Record<Confidence, Tally>;
  confidentlyWrong: string[];
}

export function isCorrect(q: Question, chosen: number | null): boolean {
  return chosen !== null && chosen === q.answer;
}

export function scoreQuiz(questions: Question[], answers: AnswerRecord[]): ScoreReport {
  const byId = new Map(questions.map((q) => [q.id, q]));
  const report: ScoreReport = {
    correct: 0,
    total: 0,
    pct: 0,
    byDomain: {},
    byModule: {},
    byConfidence: { sure: { correct: 0, total: 0 }, unsure: { correct: 0, total: 0 }, guess: { correct: 0, total: 0 } },
    confidentlyWrong: [],
  };
  const bump = (t: Tally, ok: boolean) => {
    t.total++;
    if (ok) t.correct++;
  };
  for (const a of answers) {
    const q = byId.get(a.questionId);
    if (!q) continue;
    const ok = isCorrect(q, a.chosen);
    bump(report, ok);
    bump((report.byDomain[q.domain] ??= { correct: 0, total: 0 }), ok);
    bump((report.byModule[q.module] ??= { correct: 0, total: 0 }), ok);
    bump(report.byConfidence[a.confidence], ok);
    if (!ok && a.confidence === 'sure') report.confidentlyWrong.push(q.id);
  }
  report.pct = report.total === 0 ? 0 : report.correct / report.total;
  return report;
}
