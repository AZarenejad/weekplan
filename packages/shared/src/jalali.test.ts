import { describe, expect, it } from 'vitest';
import { addDays } from './dates';
import { jalaliMonthLength, toGregorianIso, toJalali } from './jalali';

describe('jalali', () => {
  it('knows Nowruz and a known date', () => {
    expect(toJalali('2025-03-21')).toEqual({ y: 1404, m: 1, d: 1 });
    expect(toJalali('2026-10-22')).toEqual({ y: 1405, m: 7, d: 30 });
  });
  it('round-trips ~3 years of days', () => {
    for (let i = 0, d = '2024-01-01'; i < 1100; i++, d = addDays(d, 1)) {
      const j = toJalali(d);
      expect(toGregorianIso(j.y, j.m, j.d)).toBe(d);
    }
  });
  it('handles leap Esfand', () => {
    expect(jalaliMonthLength(1403, 12)).toBe(30);
    expect(jalaliMonthLength(1404, 12)).toBe(29);
    expect(jalaliMonthLength(1405, 1)).toBe(31);
  });
});
