import { addDays } from './dates';

// Conversion is delegated to Intl's Persian calendar (always correct, no hand-rolled leap rules).
const fmt = new Intl.DateTimeFormat('en-u-ca-persian-nu-latn', { timeZone: 'UTC', year: 'numeric', month: 'numeric', day: 'numeric' });

export interface JalaliDate { y: number; m: number; d: number }

export const JALALI_MONTHS = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
const WEEKDAYS = ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه', 'شنبه']; // index = JS getUTCDay()

export function toJalali(iso: string): JalaliDate {
  const parts = fmt.formatToParts(new Date(`${iso}T00:00:00Z`));
  const get = (...types: string[]) => Number(parts.find((p) => types.includes(p.type))!.value);
  return { y: get('year', 'relatedYear'), m: get('month'), d: get('day') };
}

const cmp = (a: JalaliDate, b: JalaliDate) => a.y - b.y || a.m - b.m || a.d - b.d;

/** Inverse of toJalali: start from an estimate and walk day by day until the Jalali date matches. */
export function toGregorianIso(y: number, m: number, d: number): string {
  const target = { y, m, d };
  let guess = addDays(`${y + 621}-03-21`, Math.floor((m - 1) * 30.5) + d - 1);
  for (let i = 0; i < 60; i++) {
    const c = cmp(toJalali(guess), target);
    if (c === 0) return guess;
    guess = addDays(guess, c < 0 ? 1 : -1);
  }
  throw new Error(`invalid Jalali date ${y}/${m}/${d}`);
}

export function jalaliMonthLength(y: number, m: number): number {
  if (m <= 6) return 31;
  if (m <= 11) return 30;
  const days = (Date.parse(toGregorianIso(y + 1, 1, 1)) - Date.parse(toGregorianIso(y, 12, 1))) / 86_400_000;
  return days;
}

export const toPersianDigits = (n: number | string) => String(n).replace(/\d/g, (c) => '۰۱۲۳۴۵۶۷۸۹'[Number(c)]);
export const persianWeekday = (iso: string) => WEEKDAYS[new Date(`${iso}T00:00:00Z`).getUTCDay()];

export function formatJalali(iso: string, withYear = false): string {
  const j = toJalali(iso);
  return `${toPersianDigits(j.d)} ${JALALI_MONTHS[j.m - 1]}${withYear ? ` ${toPersianDigits(j.y)}` : ''}`;
}

export const formatGregorianShort = (iso: string, withYear = false) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', ...(withYear && { year: 'numeric' }), timeZone: 'UTC' });
