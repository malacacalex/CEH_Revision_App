import type { Blueprint, DomainId, Question } from '../../schemas/content.ts';
import { lastAttempts, type AttemptLite } from '../quiz/assemble.ts';

export interface DomainReadiness {
  domain: DomainId;
  name: string;
  weight: number;
  answered: number;
  /** Posterior mean accuracy, 0..1. Unseen domains sit at the guessing level (25%). */
  estimate: number;
}

export interface Prediction {
  score: number;
  low: number;
  high: number;
  domains: DomainReadiness[];
  /** Share of answered questions that were wrong while rated "sure" (gate: < 5%). */
  confidentlyWrongRate: number;
}

/** Beta(1, 3) prior = 25% (a random guess among 4 options), updated with the latest answer to each question. */
const PRIOR_OK = 1;
const PRIOR_KO = 3;

/**
 * Blueprint-weighted predicted score with a ~95% band. Only the latest attempt per question counts,
 * so re-drilling the same question cannot inflate the prediction.
 */
export function predictScore(blueprint: Blueprint, questions: Question[], attempts: AttemptLite[]): Prediction {
  const byId = new Map(questions.map((q) => [q.id, q]));
  const last = lastAttempts(attempts);
  const stats = new Map<DomainId, { ok: number; n: number }>();
  let counted = 0;
  let sureWrong = 0;
  for (const a of last.values()) {
    const q = byId.get(a.questionId);
    if (!q || q.domain === 'D0') continue;
    const s = stats.get(q.domain) ?? { ok: 0, n: 0 };
    s.n++;
    if (a.correct) s.ok++;
    stats.set(q.domain, s);
    counted++;
    if (a.confidence === 'sure' && !a.correct) sureWrong++;
  }

  const domains: DomainReadiness[] = [];
  let score = 0;
  let variance = 0;
  const examDomains = blueprint.domains.filter((d) => d.weight > 0);
  const weightSum = examDomains.reduce((s, d) => s + d.weight, 0);
  for (const d of examDomains) {
    const s = stats.get(d.id) ?? { ok: 0, n: 0 };
    const a = PRIOR_OK + s.ok;
    const b = PRIOR_KO + (s.n - s.ok);
    const mean = a / (a + b);
    const v = (a * b) / ((a + b) ** 2 * (a + b + 1));
    const w = d.weight / weightSum;
    score += w * mean;
    variance += w * w * v;
    domains.push({ domain: d.id, name: d.name, weight: d.weight, answered: s.n, estimate: mean });
  }
  const half = 1.96 * Math.sqrt(variance);
  return {
    score,
    low: Math.max(0, score - half),
    high: Math.min(1, score + half),
    domains,
    confidentlyWrongRate: counted === 0 ? 0 : sureWrong / counted,
  };
}

/** Consecutive days (ending today or yesterday) with at least one study event. */
export function studyStreak(eventDays: Set<string>, today: string, addDays: (d: string, n: number) => string): number {
  let day = eventDays.has(today) ? today : addDays(today, -1);
  let n = 0;
  while (eventDays.has(day)) {
    n++;
    day = addDays(day, -1);
  }
  return n;
}
