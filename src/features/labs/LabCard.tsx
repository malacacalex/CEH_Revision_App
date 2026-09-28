import { useState } from 'react';
import { updateLabLog } from '../../db/repo.ts';
import { formatMinutes, type Lab } from '../../domain/labs.ts';
import { LAB_STATUSES, LAB_STATUS_LABELS, type LabLog, type LabStatus } from '../../schemas/progress.ts';
import { Badge, Button, Card, inputClass } from '../../ui/kit.tsx';

const STATUS_TONE: Record<LabStatus, 'neutral' | 'warn' | 'good' | 'accent'> = { todo: 'neutral', doing: 'warn', done: 'good', skipped: 'accent' };

interface LabProps {
  profileId: string;
  module: number;
  lab: Lab;
  log: LabLog;
}

function LabHeader({ lab, showName = true }: { lab: Lab; showName?: boolean }) {
  return (
    <>
      <div className={`flex flex-wrap items-center gap-2 ${showName ? 'justify-between' : ''}`}>
        {showName && <h3 className="font-semibold">{lab.name}</h3>}
        <span className="flex gap-1">
          <Badge tone={lab.source === 'iLabs' ? 'accent' : 'good'}>{lab.source === 'iLabs' ? 'iLabs' : 'free'}</Badge>
          {lab.verify && <Badge tone="warn">link unverified</Badge>}
          <Badge>{lab.minutes} min</Badge>
        </span>
      </div>
      <p className="mt-1 text-sm text-muted">Builds: {lab.skill}</p>
      {lab.where && (
        <a href={lab.where} target="_blank" rel="noreferrer" className="mt-1 inline-block text-sm font-semibold text-chestnut underline">
          Open lab resource
        </a>
      )}
    </>
  );
}

/** Status, time spent and notes for one lab. Saves as the learner goes. */
function LabLogEditor({ profileId, module, lab, log }: LabProps) {
  const [minutes, setMinutes] = useState(String(log.minutes));
  const [note, setNote] = useState(log.note);
  const save = (patch: Partial<Omit<LabLog, 'updatedAt'>>) => void updateLabLog(profileId, module, lab.name, patch);
  const saveMinutes = (raw: string) => {
    const n = Math.round(Number(raw));
    if (!Number.isFinite(n) || n < 0) return setMinutes(String(log.minutes));
    const next = Math.min(n, 100_000);
    setMinutes(String(next));
    // Logging time on a lab not started yet moves it to "In progress".
    if (next !== log.minutes) save({ minutes: next, ...(next > 0 && log.status === 'todo' && { status: 'doing' as const }) });
  };
  const unitId = `lab-${module}-${lab.name.replace(/\W+/g, '-')}-unit`;

  return (
    <div className="mt-3 space-y-3 border-t border-line pt-3">
      <div role="group" aria-label={`Status of ${lab.name}`} className="flex flex-wrap gap-1.5">
        {LAB_STATUSES.map((st) => (
          <button
            key={st}
            type="button"
            aria-pressed={log.status === st}
            onClick={() => save({ status: st })}
            className={`min-h-9 rounded-full border px-3 text-sm ${log.status === st ? 'border-chestnut bg-chestnut-soft font-semibold' : 'border-line bg-surface'}`}
          >
            {LAB_STATUS_LABELS[st]}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-sm">
          <span className="mb-1 block font-semibold">Time spent</span>
          <span className="flex items-center gap-1">
            <input
              className={`${inputClass} w-24`}
              type="number"
              inputMode="numeric"
              min={0}
              step={5}
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
              onBlur={(e) => saveMinutes(e.target.value)}
              aria-describedby={unitId}
            />
            <span id={unitId} className="text-muted">
              min
            </span>
          </span>
        </label>
        <Button variant="secondary" onClick={() => saveMinutes(String((Number(minutes) || 0) + 15))}>
          +15 min
        </Button>
        <Button variant="secondary" onClick={() => saveMinutes(String((Number(minutes) || 0) + 30))}>
          +30 min
        </Button>
      </div>
      <label className="block text-sm">
        <span className="mb-1 block font-semibold">Notes</span>
        <textarea
          className={`${inputClass} min-h-20`}
          value={note}
          maxLength={4000}
          placeholder="What you did, what broke, what to remember"
          onChange={(e) => setNote(e.target.value)}
          onBlur={() => note !== log.note && save({ note })}
        />
      </label>
    </div>
  );
}

/** A lab with its tracker, as a full card (module page). */
export function LabCard(props: LabProps) {
  return (
    <Card>
      <LabHeader lab={props.lab} />
      <LabLogEditor {...props} />
    </Card>
  );
}

/** A lab as a collapsible row (Lab tracker page): status and time at a glance, the tracker inside. */
export function LabRowItem(props: LabProps) {
  const { lab, log } = props;
  return (
    <details className="rounded-lg border border-line bg-surface p-3">
      <summary className="flex cursor-pointer flex-wrap items-center gap-2">
        <Badge tone={STATUS_TONE[log.status]}>{LAB_STATUS_LABELS[log.status]}</Badge>
        <span className="min-w-0 flex-1 font-semibold">{lab.name}</span>
        <span className="text-sm tabular-nums text-muted">
          {log.minutes > 0 ? `${formatMinutes(log.minutes)} of ` : ''}
          {formatMinutes(lab.minutes)}
        </span>
      </summary>
      <div className="mt-2">
        <LabHeader lab={lab} showName={false} />
        <LabLogEditor {...props} />
      </div>
    </details>
  );
}
