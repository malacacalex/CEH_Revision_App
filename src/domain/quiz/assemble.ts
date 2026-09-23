import type { Blueprint, DomainId, Question } from '../../schemas/content.ts';
import type { Confidence } from '../fsrs/scheduler.ts';

export type QuizMode = 'pretest' | 'module' | 'domain' | 'mixed' | 'weak' | 'confident-wrong' | 'review' | 'diagnostic' | 'skipcheck';

export const QUIZ_MODES: Record<QuizMode, { title: string; blurb: string; size: number }> = {
  pretest: { title: 'Pre-test', blurb: '10 questions before you study a module. Low scores are expected: this primes your attention.', size: 10 },
  module: { title: 'Module quiz', blurb: '20 fresh questions from one module. Score ≥ 80% to pass its gate.', size: 20 },
  domain: { title: 'Domain drill', blurb: '20 questions across one exam domain.', size: 20 },
  mixed: { title: 'Interleaved mix', blurb: '40 questions from every module you have started, weighted by the blueprint.', size: 40 },
  weak: { title: 'Weak spots', blurb: 'Your missed questions and weakest sections first.', size: 20 },
  'confident-wrong': { title: 'Confidently wrong', blurb: 'Questions you were sure about and got wrong. Fix these first.', size: 20 },
  review: { title: 'Due question reviews', blurb: 'Missed questions scheduled by spaced repetition.', size: 30 },
  diagnostic: { title: 'Diagnostic', blurb: '3 questions per module to map your weak zones.', size: 60 },
  skipcheck: { title: 'Foundations skip-check', blurb: '20 questions on networking, OS and security basics. Score ≥ 80% to skip M0.', size: 20 },
};

export interface AttemptLite {
  questionId: string;
  correct: boolean;
  confidence: Confidence;
  at: number;
}

export interface AssembleInput {
  mode: QuizMode;
  questions: Question[];
  blueprint: Blueprint;
  attempts: AttemptLite[];
  module?: number;
  domain?: DomainId;
  /** Modules the user has started (pre-test done or notes opened). */
  studiedModules?: number[];
  dueQuestionIds?: string[];
  size?: number;
  rng?: () => number;
}

export function shuffle<T>(items: T[], rng: () => number = Math.random): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/** Latest attempt per question. */
export function lastAttempts(attempts: AttemptLite[]): Map<string, AttemptLite> {
  const map = new Map<string, AttemptLite>();
  for (const a of attempts) {
    const prev = map.get(a.questionId);
    if (!prev || a.at > prev.at) map.set(a.questionId, a);
  }
  return map;
}

/** Never-seen questions first (random order), then the least recently seen. */
function byFreshness(qs: Question[], last: Map<string, AttemptLite>, rng: () => number): Question[] {
  const unseen = shuffle(
    qs.filter((q) => !last.has(q.id)),
    rng,
  );
  const seen = shuffle(
    qs.filter((q) => last.has(q.id)),
    rng,
  ).sort((a, b) => last.get(a.id)!.at - last.get(b.id)!.at);
  return [...unseen, ...seen];
}

/** Splits `size` across groups in proportion to their weights (largest remainder). */
export function apportion(weights: Map<string, number>, size: number): Map<string, number> {
  const total = [...weights.values()].reduce((s, w) => s + w, 0);
  const out = new Map<string, number>();
  if (total <= 0) return out;
  const raw = [...weights].map(([k, w]) => ({ k, exact: (w / total) * size }));
  let given = 0;
  for (const r of raw) {
    const n = Math.floor(r.exact);
    out.set(r.k, n);
    given += n;
  }
  raw.sort((a, b) => b.exact - Math.floor(b.exact) - (a.exact - Math.floor(a.exact)));
  for (let i = 0; given < size && i < raw.length; i++, given++) out.set(raw[i]!.k, out.get(raw[i]!.k)! + 1);
  return out;
}

/**
 * Picks the questions for a practice-mode quiz. The held-out mock pool is NEVER used here (§6.3).
 */
export function assembleQuiz(input: AssembleInput): Question[] {
  const rng = input.rng ?? Math.random;
  const size = input.size ?? QUIZ_MODES[input.mode].size;
  const last = lastAttempts(input.attempts);
  const bank = input.questions.filter((q) => q.pool !== 'mock');
  const practice = bank.filter((q) => q.pool === 'practice');
  const studied = new Set(input.studiedModules ?? []);

  switch (input.mode) {
    case 'pretest':
      return shuffle(
        bank.filter((q) => q.pool === 'pretest' && q.module === input.module),
        rng,
      ).slice(0, size);

    case 'skipcheck':
      return shuffle(
        bank.filter((q) => q.pool === 'skipcheck'),
        rng,
      ).slice(0, size);

    case 'diagnostic': {
      // Up to 3 per module, spread evenly.
      const byModule = new Map<number, Question[]>();
      for (const q of bank.filter((x) => x.pool === 'diagnostic')) byModule.set(q.module, [...(byModule.get(q.module) ?? []), q]);
      return shuffle(
        [...byModule.values()].flatMap((qs) => shuffle(qs, rng).slice(0, 3)),
        rng,
      ).slice(0, size);
    }

    case 'module':
      return shuffle(
        byFreshness(
          practice.filter((q) => q.module === input.module),
          last,
          rng,
        ).slice(0, size),
        rng,
      );

    case 'domain':
      return shuffle(
        byFreshness(
          practice.filter((q) => q.domain === input.domain),
          last,
          rng,
        ).slice(0, size),
        rng,
      );

    case 'mixed': {
      const pool = practice.filter((q) => studied.has(q.module));
      const weights = new Map<string, number>();
      for (const d of input.blueprint.domains) {
        if (pool.some((q) => q.domain === d.id)) weights.set(d.id, Math.max(d.weight, 0.02));
      }
      const quota = apportion(weights, size);
      const picked: Question[] = [];
      for (const [domain, n] of quota) {
        picked.push(
          ...byFreshness(
            pool.filter((q) => q.domain === domain),
            last,
            rng,
          ).slice(0, n),
        );
      }
      // Top up if a domain ran short.
      if (picked.length < size) {
        const ids = new Set(picked.map((q) => q.id));
        picked.push(...byFreshness(pool.filter((q) => !ids.has(q.id)), last, rng).slice(0, size - picked.length));
      }
      return shuffle(picked, rng);
    }

    case 'weak': {
      const scope = bank.filter((q) => q.pool !== 'diagnostic' && q.pool !== 'skipcheck' && (studied.size === 0 || studied.has(q.module)));
      const missed = scope.filter((q) => last.get(q.id)?.correct === false);
      const sectionStats = new Map<string, { n: number; ok: number }>();
      for (const q of scope) {
        const a = last.get(q.id);
        if (!a) continue;
        const key = `${q.module}|${q.section}`;
        const s = sectionStats.get(key) ?? { n: 0, ok: 0 };
        s.n++;
        if (a.correct) s.ok++;
        sectionStats.set(key, s);
      }
      const acc = (q: Question) => {
        const s = sectionStats.get(`${q.module}|${q.section}`);
        return s && s.n > 0 ? s.ok / s.n : 1;
      };
      const missedIds = new Set(missed.map((q) => q.id));
      const rest = shuffle(
        scope.filter((q) => !missedIds.has(q.id) && acc(q) < 1),
        rng,
      ).sort((a, b) => acc(a) - acc(b));
      return shuffle([...shuffle(missed, rng), ...rest].slice(0, size), rng);
    }

    case 'confident-wrong':
      return shuffle(
        bank.filter((q) => {
          const a = last.get(q.id);
          return a !== undefined && !a.correct && a.confidence === 'sure';
        }),
        rng,
      ).slice(0, size);

    case 'review': {
      const due = new Set(input.dueQuestionIds ?? []);
      return shuffle(
        bank.filter((q) => due.has(q.id)),
        rng,
      ).slice(0, size);
    }
  }
}
