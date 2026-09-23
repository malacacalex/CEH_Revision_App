import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { content } from '../../content/bundle.ts';
import { searchSheets } from '../../content/reference.ts';
import { Badge, Button, Card, Empty, inputClass, PageHeader, UnverifiedBadge } from '../../ui/kit.tsx';
import { Markdown } from '../../ui/Markdown.tsx';
import { ReportError } from '../../ui/ReportError.tsx';

type Tab = 'sheets' | 'glossary';

function Sources({ urls }: { urls: string[] }) {
  return (
    <span>
      Sources:{' '}
      {urls.map((u, i) => (
        <a key={u} href={u} target="_blank" rel="noreferrer" className="underline">
          [{i + 1}]
        </a>
      ))}
    </span>
  );
}

export function ReferencePage() {
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const sheets = content.bundle.references;
  const tab: Tab = params.get('tab') === 'glossary' ? 'glossary' : 'sheets';
  const current = sheets.find((r) => r.id === params.get('sheet')) ?? sheets[0];
  const q = query.trim().toLowerCase();

  const hits = useMemo(() => searchSheets(sheets, query), [sheets, query]);
  const glossary = useMemo(
    () =>
      [...content.bundle.glossary]
        .sort((a, b) => a.term.localeCompare(b.term, 'en', { sensitivity: 'base' }))
        .filter((g) => !q || g.term.toLowerCase().includes(q) || g.definition.toLowerCase().includes(q)),
    [q],
  );

  const setTab = (t: Tab) => setParams(t === 'glossary' ? { tab: t } : current ? { sheet: current.id } : {}, { replace: true });

  return (
    <>
      <PageHeader
        title="Quick reference"
        subtitle="Cheat sheets to memorize before the exam, and the glossary. Printable."
        actions={
          <Button variant="secondary" onClick={() => window.print()} className="no-print">
            Print
          </Button>
        }
      />
      <div className="no-print mb-4 space-y-3">
        <div role="tablist" aria-label="Reference" className="flex gap-1 border-b border-line">
          {(['sheets', 'glossary'] as const).map((t) => (
            <button
              key={t}
              role="tab"
              type="button"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={`-mb-px border-b-2 px-3 py-2 font-semibold capitalize ${tab === t ? 'border-chestnut text-chestnut' : 'border-transparent text-muted hover:text-ink'}`}
            >
              {t === 'sheets' ? `Sheets (${sheets.length})` : `Glossary (${content.bundle.glossary.length})`}
            </button>
          ))}
        </div>
        <input
          type="search"
          className={inputClass}
          placeholder={tab === 'sheets' ? 'Search all sheets (e.g. 445, Xmas, GDPR)' : 'Search terms and definitions'}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search the reference"
        />
        {tab === 'sheets' && q.length < 2 && sheets.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {sheets.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setParams({ sheet: r.id }, { replace: true })}
                aria-pressed={current?.id === r.id}
                className={`min-h-9 rounded-full border px-3 text-sm ${current?.id === r.id ? 'border-chestnut bg-chestnut-soft font-semibold text-chestnut' : 'border-line'}`}
              >
                {r.order}. {r.title}
              </button>
            ))}
          </div>
        )}
      </div>

      {tab === 'sheets' &&
        (sheets.length === 0 ? (
          <Empty>No reference sheets yet.</Empty>
        ) : q.length >= 2 ? (
          hits.length === 0 ? (
            <Empty>Nothing matches “{query}”.</Empty>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted" role="status">
                {hits.length} matching section{hits.length > 1 ? 's' : ''}
              </p>
              {hits.map((h) => (
                <Card key={`${h.sheet.id}-${h.heading}`}>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">
                    {h.sheet.order}. {h.sheet.title}
                  </p>
                  <Markdown source={h.text} />
                </Card>
              ))}
            </div>
          )
        ) : (
          current && (
            <Card as="article">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <h2 className="font-serif text-2xl font-bold">{current.title}</h2>
                {current.verify && <UnverifiedBadge />}
                <Badge>rev {current.rev}</Badge>
              </div>
              <Markdown source={current.body} />
              <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3 text-sm text-muted">
                <Sources urls={current.sources} />
                <ReportError item={{ id: current.id, rev: current.rev, section: current.title }} />
              </div>
            </Card>
          )
        ))}

      {tab === 'glossary' &&
        (glossary.length === 0 ? (
          <Empty>{q ? `Nothing matches “${query}”.` : 'The glossary is empty.'}</Empty>
        ) : (
          <Card>
            <dl className="divide-y divide-line">
              {glossary.map((g) => (
                <div key={g.term} className="py-3">
                  <dt className="flex flex-wrap items-center gap-2 font-semibold">
                    {g.term}
                    {g.modules.map((m) => (
                      <Badge key={m}>M{m}</Badge>
                    ))}
                    {g.verify && <UnverifiedBadge />}
                  </dt>
                  <dd className="mt-1">{g.definition}</dd>
                  <dd className="no-print mt-1 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
                    <Sources urls={g.sources} />
                    <ReportError item={{ id: `glossary: ${g.term}`, rev: 1, section: 'Glossary' }} />
                  </dd>
                </div>
              ))}
            </dl>
          </Card>
        ))}
    </>
  );
}
