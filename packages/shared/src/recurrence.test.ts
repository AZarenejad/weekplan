import { describe, expect, it } from 'vitest';
import { addMonths, startOfWeek } from './dates';
import { occurrencesInRange } from './recurrence';
import type { Task } from './types';

const base: Task = { id: 'a', title: 'x', category: 'team', date: '2026-10-21', done: false, overrides: {} };

describe('dates', () => {
  it('clamps month ends without drift', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
  });
  it('finds week start (Saturday)', () => {
    expect(startOfWeek('2026-10-22', 6)).toBe('2026-10-17');
  });
});

describe('occurrencesInRange', () => {
  it('weekly task appears once per week and stays after "completion" attempts', () => {
    const t: Task = { ...base, recurrence: { freq: 'weekly', interval: 1 } };
    expect(occurrencesInRange([t], '2026-10-17', '2026-10-23').map((o) => o.date)).toEqual(['2026-10-21']);
    expect(occurrencesInRange([t], '2026-11-07', '2026-11-13').map((o) => o.date)).toEqual(['2026-11-11']);
  });
  it('a moved occurrence changes only that week', () => {
    const t: Task = { ...base, recurrence: { freq: 'weekly', interval: 1 }, overrides: { '2026-10-21': '2026-10-23' } };
    expect(occurrencesInRange([t], '2026-10-17', '2026-10-23')[0]).toMatchObject({ date: '2026-10-23', originalDate: '2026-10-21' });
    expect(occurrencesInRange([t], '2026-10-24', '2026-10-30')[0].date).toBe('2026-10-28');
  });
  it('an occurrence moved earlier into range is found', () => {
    const t: Task = { ...base, recurrence: { freq: 'weekly', interval: 1 }, overrides: { '2026-10-28': '2026-10-24' } };
    expect(occurrencesInRange([t], '2026-10-24', '2026-10-24')).toHaveLength(1);
  });
  it('stops after `until`, but a moved last occurrence still shows', () => {
    const t: Task = { ...base, recurrence: { freq: 'weekly', interval: 1, until: '2026-10-28' }, overrides: { '2026-10-28': '2026-10-30' } };
    expect(occurrencesInRange([t], '2026-10-24', '2026-11-30').map((o) => o.date)).toEqual(['2026-10-30']);
  });
  it('unscheduled tasks never appear', () => {
    expect(occurrencesInRange([{ ...base, date: null }], '2000-01-01', '2100-01-01')).toHaveLength(0);
  });
  it('one-off tasks appear only on their date', () => {
    expect(occurrencesInRange([base], '2026-10-21', '2026-10-21')).toHaveLength(1);
    expect(occurrencesInRange([base], '2026-10-22', '2026-10-28')).toHaveLength(0);
  });
});
