// All date math is done in UTC on ISO strings, so DST/timezones never shift a day.
const DAY = 86_400_000;
const toMs = (iso: string) => Date.parse(`${iso}T00:00:00Z`);
const toIso = (ms: number) => new Date(ms).toISOString().slice(0, 10);

export const addDays = (iso: string, n: number) => toIso(toMs(iso) + n * DAY);

export function addMonths(iso: string, n: number): string {
  const d = new Date(toMs(iso));
  const day = d.getUTCDate();
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1));
  const last = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(day, last));
  return toIso(target.getTime());
}

/** First day of the week containing `iso`. weekStart: 0=Sun … 6=Sat (Sat is typical in Iran). */
export function startOfWeek(iso: string, weekStart = 6): string {
  const dow = new Date(toMs(iso)).getUTCDay();
  return addDays(iso, -((dow - weekStart + 7) % 7));
}

export const weekDays = (start: string) => Array.from({ length: 7 }, (_, i) => addDays(start, i));
/** Today in the *local* timezone (UTC would be off by a day for hours around midnight in Tehran). */
export const todayIso = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
export const isInRange = (d: string, from: string, to: string) => d >= from && d <= to;
