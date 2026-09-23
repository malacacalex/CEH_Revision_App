import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { content } from '../../content/bundle.ts';
import { reviewCard } from '../../db/repo.ts';
import { formatInterval, newSrsState, previewSrs, Rating, type Grade } from '../../domain/fsrs/scheduler.ts';
import { useSnapshot } from '../../state/ProfileContext.tsx';
import type { Snapshot, StudyData } from '../../state/snapshot.ts';
import { Badge, Button, ButtonLink, Card, Empty, PageHeader, UnverifiedBadge } from '../../ui/kit.tsx';
import { Markdown } from '../../ui/Markdown.tsx';
import { ReportError } from '../../ui/ReportError.tsx';

const GRADES: { grade: Grade; label: string; key: string; cls: string }[] = [
  { grade: Rating.Again, label: 'Again', key: '1', cls: 'bg-burgundy-soft text-burgundy border-burgundy/40' },
  { grade: Rating.Hard, label: 'Hard', key: '2', cls: 'bg-amber-soft text-amber border-amber/40' },
  { grade: Rating.Good, label: 'Good', key: '3', cls: 'bg-olive-soft text-olive border-olive/40' },
  { grade: Rating.Easy, label: 'Easy', key: '4', cls: 'bg-chestnut-soft text-chestnut border-chestnut/40' },
];

function buildQueue(data: StudyData, snap: Snapshot, module: number | null, extraNew: number): { ids: string[]; newCount: number } {
  const now = Date.now();
  const inScope = (m: number) => module === null || m === module;
  const due = data.srs
    .filter((s) => s.kind === 'card' && s.due <= now && inScope(s.module) && content.cardById.has(s.itemId))
    .sort((a, b) => a.due - b.due)
    .map((s) => s.itemId);
  const known = new Set(data.srs.filter((s) => s.kind === 'card').map((s) => s.itemId));
  const unlocked = new Set(module === null ? snap.startedModules : [module]);
  const allowance = Math.max(0, snap.newCardLimit - snap.newCardsToday) + extraNew;
  const fresh = content.cards.filter((c) => !known.has(c.id) && unlocked.has(c.module) && inScope(c.module)).slice(0, allowance).map((c) => c.id);
  return { ids: [...due, ...fresh], newCount: fresh.length };
}

export function CardsPage() {
  const s = useSnapshot();
  const [params] = useSearchParams();
  const module = params.get('module') === null ? null : Number(params.get('module'));
  const [extraNew, setExtraNew] = useState(0);
  if (!s) return <p className="text-muted">Loading…</p>;
  // Remounting (key) builds a fresh queue; within a session, live updates from our own reviews must not reshuffle it.
  return <CardSession key={`${module}-${extraNew}`} s={s} module={module} extraNew={extraNew} onMore={() => setExtraNew((n) => n + 10)} />;
}

function CardSession({
  s,
  module,
  extraNew,
  onMore,
}: {
  s: NonNullable<ReturnType<typeof useSnapshot>>;
  module: number | null;
  extraNew: number;
  onMore: () => void;
}) {
  const [queue, setQueue] = useState(() => buildQueue(s.data, s.snap, module, extraNew));
  const [revealed, setRevealed] = useState(false);
  const [reviewed, setReviewed] = useState(0);
  const [shownAt, setShownAt] = useState(() => Date.now());

  const current = queue.ids[0] ? content.cardById.get(queue.ids[0]) : undefined;
  const srs = current ? s.data.srs.find((x) => x.itemId === current.id) : undefined;
  const isNew = !srs;

  const rate = useCallback(
    async (grade: Grade) => {
      if (!current) return;
      await reviewCard(s.profile.id, current, grade, new Date(), s.snap.maxIntervalDays);
      setRevealed(false);
      setReviewed((n) => n + 1);
      setShownAt(Date.now());
      setQueue((q) => {
        const rest = q.ids.slice(1);
        // "Again" comes back at the end of this session.
        return { ...q, ids: grade === Rating.Again ? [...rest, current.id] : rest };
      });
    },
    [current, s],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return;
      if (!revealed && (e.key === ' ' || e.key === 'Enter')) {
        e.preventDefault();
        setRevealed(true);
      } else if (revealed) {
        const g = GRADES.find((x) => x.key === e.key);
        if (g) void rate(g.grade);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [revealed, rate]);

  const title = module === null ? 'Flashcards' : `Flashcards · M${module}`;

  if (!current) {
    return (
      <>
        <PageHeader title={title} />
        <Card>
          {reviewed > 0 ? (
            <p className="mb-3 text-lg font-semibold">Session done: {reviewed} review{reviewed > 1 ? 's' : ''}. Nice work.</p>
          ) : (
            <Empty>
              {s.snap.startedModules.length === 0 && module === null
                ? 'No cards yet: open a module to unlock its flashcards.'
                : 'Nothing due right now, and today’s new cards are done.'}
            </Empty>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={onMore}
            >
              Learn 10 more new cards
            </Button>
            <ButtonLink to="/" variant="ghost">
              Back to today
            </ButtonLink>
          </div>
        </Card>
      </>
    );
  }

  const preview = previewSrs(srs ?? newSrsState(new Date(shownAt)), new Date(shownAt), { maxIntervalDays: s.snap.maxIntervalDays });

  return (
    <>
      <PageHeader title={title} subtitle={`${queue.ids.length} left in this session · ${reviewed} done`} />
      <Card className="mx-auto max-w-2xl">
        <div className="mb-3 flex flex-wrap items-center gap-2 text-sm text-muted">
          <span className="font-semibold text-chestnut">M{current.module}</span>
          <span>{current.section}</span>
          <Badge>{current.kind}</Badge>
          {isNew && <Badge tone="accent">new</Badge>}
          {current.verify && <UnverifiedBadge />}
        </div>
        <div className="min-h-20 text-xl font-semibold">
          <Markdown source={current.front} className="!font-sans" />
        </div>
        {revealed ? (
          <>
            <hr className="my-4 border-line" />
            <Markdown source={current.back} />
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm text-muted">
              <span>
                Sources:{' '}
                {current.sources.map((u, i) => (
                  <a key={u} href={u} target="_blank" rel="noreferrer" className="underline">
                    [{i + 1}]
                  </a>
                ))}
              </span>
              <ReportError item={current} />
            </div>
            <div className="mt-4 grid grid-cols-4 gap-2" role="group" aria-label="How well did you remember?">
              {GRADES.map((g) => (
                <button
                  key={g.grade}
                  type="button"
                  onClick={() => void rate(g.grade)}
                  className={`flex min-h-14 flex-col items-center justify-center rounded-lg border px-1 py-2 font-semibold ${g.cls}`}
                >
                  {g.label}
                  <span className="text-xs font-normal opacity-80">{formatInterval(preview[g.grade] - shownAt)}</span>
                </button>
              ))}
            </div>
            <p className="mt-2 hidden text-center text-xs text-muted sm:block">Keys 1–4</p>
          </>
        ) : (
          <Button className="mt-4 w-full" onClick={() => setRevealed(true)}>
            Show answer <span className="hidden text-xs font-normal opacity-80 sm:inline">(Space)</span>
          </Button>
        )}
      </Card>
    </>
  );
}
