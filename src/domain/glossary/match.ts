import type { GlossaryEntry } from '../../schemas/content.ts';

export type Segment = { text: string; entry?: GlossaryEntry };

const ACRONYM = /^[A-Z0-9][A-Z0-9&./-]*$/;
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Keys that open an entry from running text: the term, the term without a trailing "(…)", and its aliases.
 * Acronyms match case-sensitively (plural "s" allowed); phrases match in any case; a single ordinary word
 * ("Risk", "Port") only matches as written, so everyday lowercase prose is left alone.
 */
function keysOf(e: GlossaryEntry): { key: string; flags: 'cs' | 'ci' }[] {
  const raw = new Set([e.term, e.term.replace(/\s*\([^)]*\)\s*$/, ''), ...(e.aliases ?? [])]);
  return [...raw]
    .map((k) => k.trim())
    .filter((k) => k.length >= 2)
    .map((key) => ({ key, flags: ACRONYM.test(key) || !/\s/.test(key) ? ('cs' as const) : ('ci' as const) }));
}

export interface GlossaryMatcher {
  split(text: string, seen?: Set<string>): Segment[];
}

export function buildMatcher(entries: GlossaryEntry[]): GlossaryMatcher {
  const cs = new Map<string, GlossaryEntry>();
  const ci = new Map<string, GlossaryEntry>();
  for (const e of entries)
    for (const { key, flags } of keysOf(e)) {
      if (flags === 'cs') cs.set(key, cs.get(key) ?? e);
      else ci.set(key.toLowerCase(), ci.get(key.toLowerCase()) ?? e);
    }
  const byLength = (a: string, b: string) => b.length - a.length;
  const csKeys = [...cs.keys()].sort(byLength);
  const ciKeys = [...ci.keys()].sort(byLength);
  if (csKeys.length + ciKeys.length === 0) return { split: (text) => [{ text }] };
  // Longest keys first in each alternation; case-insensitive keys are lowercased and tried on a lowercased copy.
  const reCs = csKeys.length ? new RegExp(`(?<![A-Za-z0-9])(?:${csKeys.map((k) => `${esc(k)}${ACRONYM.test(k) ? 's?' : ''}`).join('|')})(?![A-Za-z0-9])`, 'g') : null;
  const reCi = ciKeys.length ? new RegExp(`(?<![a-z0-9])(?:${ciKeys.map(esc).join('|')})(?![a-z0-9])`, 'g') : null;

  return {
    split(text, seen = new Set()) {
      const hits: { start: number; end: number; entry: GlossaryEntry }[] = [];
      const lower = text.toLowerCase();
      for (const m of reCs ? text.matchAll(reCs) : []) {
        const entry = cs.get(m[0]) ?? cs.get(m[0].replace(/s$/, ''));
        if (entry) hits.push({ start: m.index, end: m.index + m[0].length, entry });
      }
      for (const m of reCi ? lower.matchAll(reCi) : []) {
        const entry = ci.get(m[0]);
        if (entry) hits.push({ start: m.index, end: m.index + m[0].length, entry });
      }
      // Longest, earliest hit wins where they overlap; each entry is linked once per text block.
      hits.sort((a, b) => a.start - b.start || b.end - a.end);
      const out: Segment[] = [];
      let pos = 0;
      for (const h of hits) {
        if (h.start < pos || seen.has(h.entry.term)) continue;
        seen.add(h.entry.term);
        if (h.start > pos) out.push({ text: text.slice(pos, h.start) });
        out.push({ text: text.slice(h.start, h.end), entry: h.entry });
        pos = h.end;
      }
      if (pos < text.length) out.push({ text: text.slice(pos) });
      return out;
    },
  };
}
