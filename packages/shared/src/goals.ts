import type { Goal, Task } from './types';

export interface GoalProgress { goal: Goal; done: number; total: number; ratio: number }

/** Progress counts one-off tasks only; recurring tasks never complete. */
export function goalProgress(goal: Goal, tasks: Task[]): GoalProgress {
  const own = tasks.filter((t) => t.goalId === goal.id && !t.recurrence);
  const done = own.filter((t) => t.done).length;
  return { goal, done, total: own.length, ratio: own.length ? done / own.length : 0 };
}
