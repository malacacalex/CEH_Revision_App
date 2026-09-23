import type { ReferenceSheet } from '../schemas/content.ts';

const SECTION_START = /^(?=## )/m;
const SECTION_HEADING = /^## (.+)$/m;

/** Splits a sheet into its "## " sections so search can show just the matching parts. */
export function sheetSections(sheet: ReferenceSheet): { heading: string; text: string }[] {
  return sheet.body
    .split(SECTION_START)
    .map((p) => ({ heading: SECTION_HEADING.exec(p)?.[1]?.trim() ?? sheet.title, text: p.trim() }))
    .filter((p) => p.text.length > 0);
}

/** Sections of every sheet whose text contains the query (case-insensitive). Queries under 2 characters match nothing. */
export function searchSheets(sheets: ReferenceSheet[], query: string): { sheet: ReferenceSheet; heading: string; text: string }[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  return sheets.flatMap((sheet) => sheetSections(sheet).filter((s) => s.text.toLowerCase().includes(q)).map((s) => ({ sheet, ...s })));
}
