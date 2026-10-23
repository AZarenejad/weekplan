import { addDays, startOfWeek, todayIso, weekDays } from './dates';
import { jalaliMonthLength, toGregorianIso, toJalali } from './jalali';

export interface JalaliMonth { y: number; m: number }

export const currentJalaliMonth = (iso = todayIso()): JalaliMonth => {
  const j = toJalali(iso);
  return { y: j.y, m: j.m };
};

export function shiftMonth({ y, m }: JalaliMonth, delta: number): JalaliMonth {
  const i = y * 12 + (m - 1) + delta;
  return { y: Math.floor(i / 12), m: (i % 12) + 1 };
}

/** Saturday-first weeks covering the month, padded with neighbouring days. */
export function jalaliMonthGrid({ y, m }: JalaliMonth) {
  const first = toGregorianIso(y, m, 1);
  const last = addDays(first, jalaliMonthLength(y, m) - 1);
  const weeks: string[][] = [];
  for (let d = startOfWeek(first, 6); d <= last; d = addDays(d, 7)) weeks.push(weekDays(d));
  return { weeks, first, last };
}
