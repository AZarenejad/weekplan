import { describe, expect, it } from 'vitest';
import { jalaliMonthGrid, shiftMonth } from './calendar';
import { toJalali } from './jalali';

describe('calendar', () => {
  it('shifts months across year boundaries', () => {
    expect(shiftMonth({ y: 1405, m: 12 }, 1)).toEqual({ y: 1406, m: 1 });
    expect(shiftMonth({ y: 1405, m: 1 }, -1)).toEqual({ y: 1404, m: 12 });
  });
  it('builds Saturday-first full weeks that contain the whole month', () => {
    const { weeks, first, last } = jalaliMonthGrid({ y: 1405, m: 7 });
    expect(weeks.every((w) => w.length === 7)).toBe(true);
    expect(new Date(`${weeks[0][0]}T00:00:00Z`).getUTCDay()).toBe(6);
    const flat = weeks.flat();
    expect(flat).toContain(first);
    expect(flat).toContain(last);
    expect(toJalali(first)).toEqual({ y: 1405, m: 7, d: 1 });
    expect(toJalali(last).d).toBe(30);
  });
});
