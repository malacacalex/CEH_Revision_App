import { volumeTargets } from '../src/content/validate.ts';
import { loadContentFromDisk } from './load-content.ts';

const { bundle, issues } = loadContentFromDisk();
if (!bundle) {
  console.error(`✗ Content failed schema checks (${issues.length} issue(s)); run content:validate.`);
  process.exit(1);
}

const pad = (v: string | number, n: number) => String(v).padStart(n);
console.log(`Content ${bundle.version.version} (${bundle.version.date})\n`);
console.log('Mod  Status   Dom  Units   Cards      Practice   Pre  Mock  Unverified  A/B/C/D (%)');

let totals = { cards: 0, practice: 0, pretest: 0, mock: 0, verify: 0 };
const byDomain = new Map<string, number>();
for (const m of bundle.modules) {
  const { meta, questions, flashcards } = m;
  const t = volumeTargets(meta.effortUnits);
  const practice = questions.filter((q) => q.pool === 'practice');
  const pretest = questions.filter((q) => q.pool === 'pretest').length;
  const mock = questions.filter((q) => q.pool === 'mock').length;
  const verify = questions.filter((q) => q.verify).length + flashcards.filter((c) => c.verify).length;
  const graded = [...practice, ...questions.filter((q) => q.pool === 'mock')];
  const dist = [0, 1, 2, 3].map((i) => (graded.length ? Math.round((100 * graded.filter((q) => q.answer === i).length) / graded.length) : 0));
  console.log(
    [
      `M${String(meta.module).padStart(2, '0')}`,
      meta.status.padEnd(7),
      meta.domain.padEnd(3),
      pad(meta.effortUnits, 5),
      `${pad(flashcards.length, 4)}/${pad(t.minCards, 4)}`,
      ` ${pad(practice.length, 4)}/${pad(t.minPractice, 4)}`,
      pad(pretest, 4),
      pad(mock, 5),
      pad(verify, 11),
      graded.length ? `  ${dist.join('/')}` : '  -',
    ].join('  '),
  );
  totals = {
    cards: totals.cards + flashcards.length,
    practice: totals.practice + practice.length,
    pretest: totals.pretest + pretest,
    mock: totals.mock + mock,
    verify: totals.verify + verify,
  };
  byDomain.set(meta.domain, (byDomain.get(meta.domain) ?? 0) + practice.length);
}

const built = bundle.modules.filter((m) => m.meta.status === 'built').length;
console.log(`\nModules built: ${built}/21 · cards ${totals.cards} · practice ${totals.practice} · pretest ${totals.pretest} · mock ${totals.mock}/${bundle.blueprint.mockPoolSize} · unverified ${totals.verify}`);
console.log('\nPractice questions per domain vs exam weight:');
for (const d of bundle.blueprint.domains) {
  const n = byDomain.get(d.id) ?? 0;
  const share = totals.practice ? (100 * n) / totals.practice : 0;
  console.log(`  ${d.id} ${d.name.padEnd(50)} ${pad(n, 4)}  ${pad(share.toFixed(0), 3)}%  (exam ${pad(Math.round(d.weight * 100), 2)}%)`);
}
