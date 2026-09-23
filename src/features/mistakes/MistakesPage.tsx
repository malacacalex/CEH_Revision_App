import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { content } from '../../content/bundle.ts';
import { db } from '../../db/db.ts';
import { setMistakeCause } from '../../db/repo.ts';
import { MISTAKE_CAUSES, MISTAKE_CAUSE_LABELS, type Mistake, type MistakeCause } from '../../schemas/progress.ts';
import { useProfile } from '../../state/ProfileContext.tsx';
import { Badge, ButtonLink, Card, Empty, inputClass, PageHeader } from '../../ui/kit.tsx';
import { formatDate, toISODate } from '../../domain/dates.ts';

type Filter = 'open' | 'resolved' | 'all';

export function MistakesPage() {
  const profile = useProfile();
  const [filter, setFilter] = useState<Filter>('open');
  const [cause, setCause] = useState<MistakeCause | 'any'>('any');
  const mistakes = useLiveQuery(() => db.mistakes.where('profileId').equals(profile.id).toArray(), [profile.id]);
  if (!mistakes) return <p className="text-muted">Loading…</p>;

  const known = mistakes.filter((m) => content.questionById.has(m.questionId));
  const shown = known
    .filter((m) => (filter === 'all' ? true : filter === 'open' ? !m.resolved : m.resolved))
    .filter((m) => cause === 'any' || m.cause === cause)
    // Confidently-wrong first (misconceptions), then most-missed, then most recent.
    .sort((a, b) => Number(b.confidentlyWrong) - Number(a.confidentlyWrong) || b.misses - a.misses || b.lastMissedAt - a.lastMissedAt);
  const open = known.filter((m) => !m.resolved);
  const retestIds = shown.filter((m) => !m.resolved).slice(0, 20).map((m) => m.questionId);
  const byCause = new Map<MistakeCause | null, number>();
  for (const m of open) byCause.set(m.cause, (byCause.get(m.cause) ?? 0) + 1);

  return (
    <>
      <PageHeader
        title="Mistake log"
        subtitle={`${open.length} open · ${known.length - open.length} fixed. A mistake is fixed when you answer it right again.`}
        actions={
          retestIds.length > 0 && <ButtonLink to={`/quiz/run?mode=retest&ids=${retestIds.join(',')}`}>Re-test {retestIds.length}</ButtonLink>
        }
      />
      {open.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2 text-sm">
          {[...byCause].map(([c, n]) => (
            <Badge key={c ?? 'none'} tone={c === 'knowledge-gap' ? 'bad' : c === null ? 'neutral' : 'warn'}>
              {c ? MISTAKE_CAUSE_LABELS[c] : 'No cause yet'}: {n}
            </Badge>
          ))}
        </div>
      )}
      <div className="mb-4 flex flex-wrap gap-2">
        <select className={`${inputClass} w-auto`} value={filter} onChange={(e) => setFilter(e.target.value as Filter)} aria-label="Status filter">
          <option value="open">Open</option>
          <option value="resolved">Fixed</option>
          <option value="all">All</option>
        </select>
        <select className={`${inputClass} w-auto`} value={cause} onChange={(e) => setCause(e.target.value as MistakeCause | 'any')} aria-label="Cause filter">
          <option value="any">Any cause</option>
          {MISTAKE_CAUSES.map((c) => (
            <option key={c} value={c}>
              {MISTAKE_CAUSE_LABELS[c]}
            </option>
          ))}
        </select>
      </div>
      {shown.length === 0 ? (
        <Empty>{known.length === 0 ? 'No mistakes yet. Every question you miss in a quiz lands here.' : 'Nothing matches these filters.'}</Empty>
      ) : (
        <ul className="space-y-3">
          {shown.map((m) => (
            <MistakeRow key={m.questionId} m={m} />
          ))}
        </ul>
      )}
    </>
  );
}

function MistakeRow({ m }: { m: Mistake }) {
  const q = content.questionById.get(m.questionId)!;
  const [note, setNote] = useState(m.note);
  return (
    <li>
      <Card>
        <div className="mb-2 flex flex-wrap items-center gap-2 text-sm text-muted">
          <span className="font-semibold text-chestnut">M{q.module}</span>
          <span>{q.section}</span>
          {m.confidentlyWrong && <Badge tone="bad">confidently wrong</Badge>}
          {m.resolved && <Badge tone="good">fixed</Badge>}
          <span>
            missed {m.misses}× · last {formatDate(toISODate(new Date(m.lastMissedAt)))}
          </span>
        </div>
        <p className="mb-2 font-serif">{q.stem}</p>
        <p className="mb-3 text-sm">
          <span className="font-semibold text-olive">Answer:</span> {q.options[q.answer]}
        </p>
        <div className="grid gap-2 sm:grid-cols-[auto_1fr]">
          <select
            className={`${inputClass} sm:w-56`}
            value={m.cause ?? ''}
            onChange={(e) => void setMistakeCause(m.profileId, m.questionId, (e.target.value || null) as MistakeCause | null)}
            aria-label="Why did you miss it?"
          >
            <option value="">Why did I miss it?</option>
            {MISTAKE_CAUSES.map((c) => (
              <option key={c} value={c}>
                {MISTAKE_CAUSE_LABELS[c]}
              </option>
            ))}
          </select>
          <input
            className={inputClass}
            value={note}
            placeholder="Note to self (what to remember next time)"
            onChange={(e) => setNote(e.target.value)}
            onBlur={() => note !== m.note && void setMistakeCause(m.profileId, m.questionId, m.cause, note)}
            aria-label="Note"
            maxLength={500}
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <ButtonLink to={`/quiz/run?mode=retest&ids=${q.id}`} variant="secondary">
            Re-test this one
          </ButtonLink>
          <ButtonLink to={`/modules/${q.module}?tab=notes`} variant="ghost">
            Open M{q.module} notes
          </ButtonLink>
        </div>
      </Card>
    </li>
  );
}
