import { addDays, addMonths, isInRange } from './dates';
import type { Occurrence, Task } from './types';

/** n-th original (un-moved) occurrence date of a recurring task. */
export function nthOriginal(task: Task, n: number): string {
  const r = task.recurrence!;
  const start = task.date as string; // recurring tasks always have a date
  const step = n * Math.max(1, r.interval);
  if (r.freq === 'daily') return addDays(start, step);
  if (r.freq === 'weekly') return addDays(start, step * 7);
  return addMonths(start, step); // computed from the base date: no drift after clamping
}

/** Moved occurrences may land in range even if their original date is later, so scan a margin. */
const LOOKAHEAD_DAYS = 60;

export function occurrencesInRange(tasks: Task[], from: string, to: string): Occurrence[] {
  const out: Occurrence[] = [];
  for (const task of tasks) {
    if (!task.recurrence) {
      if (task.date && isInRange(task.date, from, to)) out.push({ task, originalDate: task.date, date: task.date });
      continue;
    }
    const limit = addDays(to, LOOKAHEAD_DAYS);
    for (let n = 0; ; n++) {
      const original = nthOriginal(task, n);
      if (original > limit || (task.recurrence.until && original > task.recurrence.until)) break;
      const date = task.overrides[original] ?? original;
      if (isInRange(date, from, to)) out.push({ task, originalDate: original, date });
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date) || (a.task.time ?? '').localeCompare(b.task.time ?? ''));
}
