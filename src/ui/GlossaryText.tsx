import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router';
import { content } from '../content/bundle.ts';
import { buildMatcher, type GlossaryMatcher } from '../domain/glossary/match.ts';
import type { GlossaryEntry } from '../schemas/content.ts';

let cache: { source: GlossaryEntry[]; matcher: GlossaryMatcher } | null = null;
function matcher(): GlossaryMatcher {
  const source = content.bundle.glossary;
  if (cache?.source !== source) cache = { source, matcher: buildMatcher(source) };
  return cache.matcher;
}

/** Glossary entries named in these texts, in order of first appearance (each once). */
export function glossaryTerms(texts: string[], skip: Set<string> = new Set()): GlossaryEntry[] {
  const seen = new Set(skip);
  const out: GlossaryEntry[] = [];
  for (const t of texts) for (const seg of matcher().split(t, seen)) if (seg.entry) out.push(seg.entry);
  return out;
}

/** Plain text where glossary terms open a short definition on click. `seen` links each term once across blocks. */
export function GlossaryText({ text, seen }: { text: string; seen?: Set<string> }) {
  const segments = matcher().split(text, seen);
  return (
    <>
      {segments.map((s, i) => (s.entry ? <Term key={i} entry={s.entry} label={s.text} /> : <span key={i}>{s.text}</span>))}
    </>
  );
}

export function Term({ entry, label, chip = false }: { entry: GlossaryEntry; label?: string; chip?: boolean }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const pop = useRef<HTMLDivElement>(null);
  const id = useId();

  useLayoutEffect(() => {
    if (!open || !btn.current) return;
    const r = btn.current.getBoundingClientRect();
    const width = Math.min(320, window.innerWidth - 32);
    setPos({ top: r.bottom + 6, left: Math.max(16, Math.min(r.left, window.innerWidth - width - 16)) });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    const onDown = (e: MouseEvent) => {
      if (!pop.current?.contains(e.target as Node) && !btn.current?.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        close();
        btn.current?.focus();
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey, true);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey, true);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [open]);

  return (
    <>
      <button
        ref={btn}
        type="button"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        title={`What is ${entry.term}?`}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        className={
          chip
            ? 'min-h-8 rounded-full border border-line bg-surface px-3 text-sm hover:bg-surface-2'
            : 'cursor-help underline decoration-dotted decoration-2 underline-offset-4 hover:text-chestnut'
        }
      >
        {label ?? entry.term}
      </button>
      {open &&
        pos &&
        createPortal(
          <div
            ref={pop}
            id={id}
            role="dialog"
            aria-label={entry.term}
            style={{ top: pos.top, left: pos.left, width: Math.min(320, window.innerWidth - 32) }}
            className="fixed z-50 rounded-lg border border-line bg-surface p-3 font-sans text-sm leading-snug text-ink shadow-lg"
          >
            <p className="mb-1 font-semibold">{entry.term}</p>
            <p>{entry.definition}</p>
            <Link to={`/reference?tab=glossary&q=${encodeURIComponent(entry.term)}`} className="mt-2 inline-block text-chestnut underline">
              Open in glossary
            </Link>
          </div>,
          document.body,
        )}
    </>
  );
}
