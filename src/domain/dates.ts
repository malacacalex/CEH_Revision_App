/** Calendar helpers working on local "YYYY-MM-DD" strings, so plans never shift with time zones. */

export type ISODate = string;

const MS_PER_DAY = 86_400_000;

function toUTC(d: ISODate): number {
  const [y, m, day] = d.split('-').map(Number) as [number, number, number];
  return Date.UTC(y, m - 1, day);
}

function fromUTC(ms: number): ISODate {
  return new Date(ms).toISOString().slice(0, 10);
}

/** Local calendar date of a Date object (not its UTC date). */
export function toISODate(date: Date): ISODate {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDays(d: ISODate, n: number): ISODate {
  return fromUTC(toUTC(d) + n * MS_PER_DAY);
}

export function daysBetween(from: ISODate, to: ISODate): number {
  return Math.round((toUTC(to) - toUTC(from)) / MS_PER_DAY);
}

/** 0 = Monday … 6 = Sunday. */
export function weekday(d: ISODate): number {
  return (new Date(toUTC(d)).getUTCDay() + 6) % 7;
}

export function startOfWeek(d: ISODate): ISODate {
  return addDays(d, -weekday(d));
}

export function maxDate(a: ISODate, b: ISODate): ISODate {
  return a > b ? a : b;
}

export function minDate(a: ISODate, b: ISODate): ISODate {
  return a < b ? a : b;
}

export function isISODate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && fromUTC(toUTC(s)) === s;
}

/** Local midnight of an ISO date, as epoch ms. */
export function localMidnight(d: ISODate): number {
  const [y, m, day] = d.split('-').map(Number) as [number, number, number];
  return new Date(y, m - 1, day).getTime();
}

export function formatDate(d: ISODate, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }): string {
  return new Date(toUTC(d)).toLocaleDateString('en-GB', { ...opts, timeZone: 'UTC' });
}
