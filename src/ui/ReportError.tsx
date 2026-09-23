import { APP_VERSION, REPO_URL, REPORT_EMAIL } from '../config.ts';
import { content } from '../content/bundle.ts';

interface Item {
  id: string;
  rev: number;
  section: string;
}

function body(item: Item): string {
  return [
    `**Item:** ${item.id} (rev ${item.rev})`,
    `**Section:** ${item.section}`,
    `**App:** ${APP_VERSION} · content ${content.bundle.version.version}`,
    '',
    '**What is wrong?**',
    '',
    '**Source that shows the correct answer (URL):**',
    '',
  ].join('\n');
}

/** "Report an error": prefilled GitHub issue, with an email fallback for people without a GitHub account. */
export function ReportError({ item }: { item: Item }) {
  const title = `Content error: ${item.id}`;
  const issue = `${REPO_URL}/issues/new?${new URLSearchParams({ title, body: body(item), labels: 'content-error' })}`;
  const mail = `mailto:${REPORT_EMAIL}?${new URLSearchParams({ subject: `[ShieldUp] ${title}`, body: body(item) }).toString().replace(/\+/g, '%20')}`;
  return (
    <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
      <a className="font-semibold text-chestnut underline" href={issue} target="_blank" rel="noreferrer">
        Report an error
      </a>
      <a className="text-muted underline" href={mail}>
        (by email)
      </a>
    </span>
  );
}
