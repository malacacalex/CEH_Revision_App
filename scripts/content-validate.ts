import { validateContent } from '../src/content/validate.ts';
import { loadContentFromDisk } from './load-content.ts';

const { bundle, issues } = loadContentFromDisk();

if (!bundle) {
  console.error(`✗ Content failed schema checks (${issues.length} issue(s)):`);
  for (const i of issues) console.error(`  ${i.file}: ${i.message}`);
  process.exit(1);
}

const { errors, warnings } = validateContent(bundle);
const showWarnings = process.argv.includes('--warnings');

if (warnings.length > 0) {
  console.warn(`! ${warnings.length} warning(s)${showWarnings ? ':' : ' (run with --warnings to list them)'}`);
  if (showWarnings) for (const w of warnings) console.warn(`  ${w}`);
}
if (errors.length > 0) {
  console.error(`✗ ${errors.length} error(s):`);
  for (const e of errors) console.error(`  ${e}`);
  process.exit(1);
}

const q = bundle.modules.reduce((s, m) => s + m.questions.length, 0);
const c = bundle.modules.reduce((s, m) => s + m.flashcards.length, 0);
console.log(`✓ Content ${bundle.version.version} valid: ${bundle.modules.length} modules, ${q} questions, ${c} flashcards.`);
