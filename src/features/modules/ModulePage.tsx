import { useEffect, useState } from 'react';
import { Navigate, useParams, useSearchParams } from 'react-router';
import { ETHICS_NOTICE } from '../../config.ts';
import { content } from '../../content/bundle.ts';
import { FEYNMAN_MIN_SENTENCES, sentenceCount } from '../../domain/gates.ts';
import { getModuleProgress, updateModuleProgress } from '../../db/repo.ts';
import { useSnapshot } from '../../state/ProfileContext.tsx';
import { Badge, Button, ButtonLink, Card, Empty, inputClass, PageHeader } from '../../ui/kit.tsx';
import { Markdown } from '../../ui/Markdown.tsx';
import type { ModuleProgress } from '../../schemas/progress.ts';
import { useLiveQuery } from 'dexie-react-hooks';

type Tab = 'overview' | 'notes' | 'reading' | 'labs' | 'feynman';

export function ModulePage() {
  const n = Number(useParams().n);
  const [params, setParams] = useSearchParams();
  const s = useSnapshot();
  const m = content.module(n);
  const profileId = s?.profile.id;
  const mp = useLiveQuery(() => (profileId ? getModuleProgress(profileId, n) : undefined), [profileId, n]);
  const hasContent = (m?.questions.length ?? 0) + (m?.flashcards.length ?? 0) > 0;

  useEffect(() => {
    // Opening a module with content marks it as started (unlocks its new cards and the interleaved quiz).
    if (profileId && hasContent && mp && !mp.startedAt) void updateModuleProgress(profileId, n, {});
  }, [profileId, n, hasContent, mp]);

  if (!m) return <Navigate to="/modules" replace />;
  if (!s || !mp) return <p className="text-muted">Loading…</p>;
  const { profile, snap } = s;
  const gate = snap.gates.get(n)!;
  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'notes', label: 'Notes' },
    ...(profile.ownsCourseware ? [{ id: 'reading' as const, label: 'Reading Map' }] : []),
    { id: 'labs', label: 'Labs' },
    { id: 'feynman', label: 'Feynman' },
  ];
  const tab = (tabs.find((t) => t.id === params.get('tab'))?.id ?? 'overview') as Tab;
  const pretest = m.questions.filter((q) => q.pool === 'pretest').length;
  const practice = m.questions.filter((q) => q.pool === 'practice').length;

  return (
    <>
      <PageHeader
        title={`M${n} · ${m.meta.title}`}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <span>
              {m.meta.domain} {content.domainName(m.meta.domain)} · {m.meta.effortUnits} effort units
            </span>
            {m.meta.status === 'sample' && <Badge tone="warn">sample content</Badge>}
            {m.meta.status === 'stub' && <Badge>content coming soon</Badge>}
            {snap.doneModules.includes(n) && <Badge tone="good">done</Badge>}
          </span>
        }
      />

      <div role="tablist" aria-label="Module sections" className="mb-4 flex gap-1 overflow-x-auto border-b border-line">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={tab === t.id}
            onClick={() => setParams({ tab: t.id }, { replace: true })}
            className={`-mb-px whitespace-nowrap border-b-2 px-3 py-2 font-semibold ${tab === t.id ? 'border-chestnut text-chestnut' : 'border-transparent text-muted hover:text-ink'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="space-y-4">
          <Card>
            <h2 className="mb-2 text-lg font-bold">Module gate</h2>
            <ul className="space-y-1.5">
              {gate.items.map((i) => (
                <li key={i.key} className="flex items-center gap-2">
                  <span aria-hidden className={`grid h-5 w-5 place-items-center rounded-full text-xs font-bold ${i.done ? 'bg-olive text-surface' : 'border border-line'}`}>
                    {i.done ? '✓' : ''}
                  </span>
                  <span className={i.done ? '' : 'text-muted'}>
                    {i.label}
                    {i.key === 'pretest' && ' (recommended first)'}
                  </span>
                  <span className="sr-only">{i.done ? 'done' : 'not done'}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex flex-wrap gap-2">
              {pretest > 0 && (
                <ButtonLink to={`/quiz/run?mode=pretest&module=${n}`} variant={mp.pretestDoneAt ? 'secondary' : 'primary'}>
                  {mp.pretestDoneAt ? 'Retake pre-test' : `1 · Pre-test (${pretest} q)`}
                </ButtonLink>
              )}
              <ButtonLink to={`/modules/${n}?tab=notes`} variant="secondary">
                2 · Read the notes
              </ButtonLink>
              {m.flashcards.length > 0 && (
                <ButtonLink to={`/cards?module=${n}`} variant="secondary">
                  3 · Flashcards ({m.flashcards.length})
                </ButtonLink>
              )}
              {practice > 0 && (
                <ButtonLink to={`/quiz/run?mode=module&module=${n}`} variant="secondary">
                  4 · Module quiz ({Math.min(20, practice)} q)
                </ButtonLink>
              )}
            </div>
          </Card>
          <Card>
            <h2 className="mb-2 text-lg font-bold">Objectives</h2>
            {m.meta.objectives.length === 0 ? (
              <Empty>Objectives arrive when this module is built.</Empty>
            ) : (
              <ul className="list-disc space-y-1 pl-5">
                {m.meta.objectives.map((o) => (
                  <li key={o.text}>
                    {o.text} <span className="text-sm text-muted">· {o.section}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card>
            <h2 className="mb-2 text-lg font-bold">Sections</h2>
            <ol className="list-decimal space-y-0.5 pl-5">
              {m.meta.sections.map((sec) => (
                <li key={sec}>{sec}</li>
              ))}
            </ol>
          </Card>
        </div>
      )}

      {tab === 'notes' && (
        <Card>
          {m.notes.trim() ? <Markdown source={m.notes} /> : <Empty>Notes arrive when this module is built.</Empty>}
          <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-line pt-4">
            {mp.notesReviewedAt ? (
              <Badge tone="good">Notes reviewed</Badge>
            ) : (
              <Button onClick={() => void updateModuleProgress(profile.id, n, { notesReviewedAt: Date.now() })} disabled={!m.notes.trim()}>
                Mark notes as reviewed
              </Button>
            )}
            {practice > 0 && (
              <ButtonLink to={`/quiz/run?mode=module&module=${n}`} variant="secondary">
                Test yourself now
              </ButtonLink>
            )}
          </div>
        </Card>
      )}

      {tab === 'reading' && <ReadingMap n={n} mp={mp} profileId={profile.id} />}

      {tab === 'labs' && (
        <div className="space-y-3">
          <p className="rounded-lg border border-burgundy/40 bg-burgundy-soft p-3 text-sm text-burgundy">
            <strong>Ethics.</strong> {ETHICS_NOTICE}
          </p>
          {m.meta.labs.filter((l) => l.source === 'free' || profile.hasILabs).length === 0 ? (
            <Empty>Labs arrive when this module is built.</Empty>
          ) : (
            m.meta.labs
              .filter((l) => l.source === 'free' || profile.hasILabs)
              .map((l) => (
                <Card key={l.name}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-semibold">{l.name}</h3>
                    <span className="flex gap-1">
                      <Badge tone={l.source === 'iLabs' ? 'accent' : 'good'}>{l.source === 'iLabs' ? 'iLabs' : 'free'}</Badge>
                      {l.verify && <Badge tone="warn">link unverified</Badge>}
                      <Badge>{l.minutes} min</Badge>
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted">Builds: {l.skill}</p>
                  {l.where && (
                    <a href={l.where} target="_blank" rel="noreferrer" className="mt-1 inline-block text-sm font-semibold text-chestnut underline">
                      Open lab resource
                    </a>
                  )}
                </Card>
              ))
          )}
        </div>
      )}

      {tab === 'feynman' && <Feynman n={n} mp={mp} profileId={profile.id} prompts={m.meta.feynmanPrompts} />}
    </>
  );
}

function ReadingMap({ n, mp, profileId }: { n: number; mp: ModuleProgress; profileId: string }) {
  const m = content.module(n)!;
  const total = m.meta.readingMap.filter((r) => r.priority !== 'SKIP').reduce((s, r) => s + r.minutes, 0);
  const tone = { MUST: 'bad', SKIM: 'warn', SKIP: 'neutral' } as const;
  return (
    <Card>
      <p className="mb-3 text-sm text-muted">
        Read your own copy of the courseware selectively. The map only uses section titles; the app contains no courseware content. Estimated: {total} min.
      </p>
      {m.meta.readingMap.length === 0 ? (
        <Empty>The Reading Map arrives when this module is built.</Empty>
      ) : (
        <ul className="divide-y divide-line">
          {m.meta.readingMap.map((r) => (
            <li key={r.section} className="flex flex-wrap items-start gap-x-3 gap-y-1 py-2">
              <Badge tone={tone[r.priority]}>{r.priority}</Badge>
              <span className="min-w-0 flex-1">
                <span className="font-semibold">{r.section}</span>
                <span className="block text-sm text-muted">{r.why}</span>
              </span>
              <span className="text-sm tabular-nums text-muted">{r.minutes} min</span>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-4">
        {mp.readingMapDoneAt ? (
          <Badge tone="good">Reading Map done</Badge>
        ) : (
          <Button onClick={() => void updateModuleProgress(profileId, n, { readingMapDoneAt: Date.now() })} disabled={m.meta.readingMap.length === 0}>
            Mark Reading Map as done
          </Button>
        )}
      </div>
    </Card>
  );
}

function Feynman({ n, mp, profileId, prompts }: { n: number; mp: ModuleProgress; profileId: string; prompts: string[] }) {
  const [text, setText] = useState(mp.feynman ?? '');
  const [saved, setSaved] = useState(true);
  const count = sentenceCount(text);
  const save = async () => {
    await updateModuleProgress(profileId, n, { feynman: text, feynmanAt: Date.now() });
    setSaved(true);
  };
  return (
    <Card>
      <h2 className="mb-1 text-lg font-bold">Explain it from memory</h2>
      <p className="mb-3 text-sm text-muted">
        Close your notes and write 5–8 sentences as if teaching a friend. Gaps you notice while writing are exactly what to review.
      </p>
      {prompts.length > 0 && (
        <ul className="mb-3 list-disc space-y-1 pl-5 text-sm">
          {prompts.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      )}
      <textarea
        className={`${inputClass} min-h-48 font-serif`}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setSaved(false);
        }}
        onBlur={() => void save()}
        aria-label="Feynman summary"
      />
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className={count >= FEYNMAN_MIN_SENTENCES ? 'text-olive' : 'text-muted'}>
          {count} sentence{count === 1 ? '' : 's'} (gate: {FEYNMAN_MIN_SENTENCES}+)
        </span>
        <Button variant="secondary" onClick={() => void save()} disabled={saved}>
          {saved ? 'Saved' : 'Save'}
        </Button>
      </div>
    </Card>
  );
}
