import type { Task } from './types';

/** Single source of truth for task rules; used by both the UI reducer and the API. */
export const setStatus = (t: Task, status: 'todo' | 'doing' | 'done', date: string): Task => ({ ...t, status, done: status === 'done', startedAt: status === 'doing' && !t.startedAt ? date : t.startedAt, completedAt: status === 'done' ? date : undefined });
export const toggleTask = (t: Task): Task => (t.recurrence ? t : setStatus(t, t.done ? 'todo' : 'done', new Date().toISOString().slice(0,10)));

/**
 * One-off: change its date (`null` = back to the backlog).
 * Recurring: record an override for that occurrence only; it can't be unscheduled.
 */
export const moveTask = (t: Task, originalDate: string | undefined, to: string | null): Task => {
  if (!t.recurrence) return { ...t, date: to };
  return to && originalDate ? { ...t, overrides: { ...t.overrides, [originalDate]: to } } : t;
};

/** Ends a recurring series after `until` (inclusive). Past occurrences stay; one-off tasks are unaffected. */
export const endSeries = (t: Task, until: string): Task =>
  t.recurrence ? { ...t, recurrence: { ...t.recurrence, until } } : t;
