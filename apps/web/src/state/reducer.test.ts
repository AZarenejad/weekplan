import { describe, expect, it } from 'vitest';
import { goalProgress } from '@weekplan/shared';
import type { AppState, Task } from '@weekplan/shared';
import { reducer } from './reducer';

const one: Task = { id: '1', title: 'a', category: 'work', date: '2026-10-21', done: false, overrides: {}, goalId: 'g' };
const rec: Task = { ...one, id: '2', recurrence: { freq: 'weekly', interval: 1 } };
const s0: AppState = { goals: [{ id: 'g', title: 'G', category: 'work' }], tasks: [one, rec] };

describe('reducer', () => {
  it('toggles one-off but never marks recurring done', () => {
    const s1 = reducer(reducer(s0, { type: 'toggleDone', id: '1' }), { type: 'toggleDone', id: '2' });
    expect(s1.tasks[0].done).toBe(true);
    expect(s1.tasks[1].done).toBe(false);
  });
  it('moving a recurring occurrence records an override, keeps the rule', () => {
    const s1 = reducer(s0, { type: 'moveOccurrence', id: '2', originalDate: '2026-10-21', to: '2026-10-23' });
    expect(s1.tasks[1].date).toBe('2026-10-21');
    expect(s1.tasks[1].overrides).toEqual({ '2026-10-21': '2026-10-23' });
  });
  it('moving a one-off changes its date', () => {
    expect(reducer(s0, { type: 'moveOccurrence', id: '1', originalDate: '2026-10-21', to: '2026-11-01' }).tasks[0].date).toBe('2026-11-01');
  });
  it('a one-off task can go back to the backlog; a series cannot', () => {
    expect(reducer(s0, { type: 'moveOccurrence', id: '1', originalDate: '2026-10-21', to: null }).tasks[0].date).toBeNull();
    expect(reducer(s0, { type: 'moveOccurrence', id: '2', originalDate: '2026-10-21', to: null }).tasks[1]).toEqual(rec);
  });
  it('ending a series sets until and ignores one-off tasks', () => {
    const s1 = reducer(s0, { type: 'endSeries', id: '2', until: '2026-11-04' });
    expect(s1.tasks[1].recurrence?.until).toBe('2026-11-04');
    expect(reducer(s0, { type: 'endSeries', id: '1', until: '2026-11-04' }).tasks[0]).toEqual(one);
  });
  it('removing a goal unlinks tasks', () => {
    expect(reducer(s0, { type: 'removeGoal', id: 'g' }).tasks.every((t) => !t.goalId)).toBe(true);
  });
  it('goal progress ignores recurring tasks', () => {
    const s1 = reducer(s0, { type: 'toggleDone', id: '1' });
    expect(goalProgress(s1.goals[0], s1.tasks)).toMatchObject({ done: 1, total: 1, ratio: 1 });
  });
});

describe('goal editing', () => {
  it('updates goal metadata without losing associated tasks', () => {
    const updated = { ...s0.goals[0], title: 'Updated', deadline: '2026-11-01', priority: 'high' as const, completed: true };
    const next = reducer(s0, { type: 'updateGoal', goal: updated });
    expect(next.goals[0]).toEqual(updated);
    expect(next.tasks).toEqual(s0.tasks);
  });
});

describe('workflow history', () => {
  it('keeps unscheduled work visible when doing and records completion', () => {
    const task = { id: 'workflow', title: 'Draft', category: 'work' as const, date: null, done: false, status: 'todo' as const, overrides: {} };
    const base = { tasks: [task], goals: [] };
    const doing = reducer(base, { type: 'setTaskStatus', id: 'workflow', status: 'doing' });
    expect(doing.tasks[0].date).toBeNull();
    expect(doing.tasks[0].startedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const completed = reducer(doing, { type: 'setTaskStatus', id: 'workflow', status: 'done' });
    expect(completed.tasks[0].completedAt).toBeDefined();
    const reopened = reducer(completed, { type: 'setTaskStatus', id: 'workflow', status: 'doing' });
    expect(reopened.tasks[0].completedAt).toBeUndefined();
  });
});
