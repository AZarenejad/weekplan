export type Category = 'work' | 'team' | 'learning' | 'personal';
export type Frequency = 'daily' | 'weekly' | 'monthly';

export interface Recurrence {
  freq: Frequency;
  interval: number;
  /** Last original occurrence date (inclusive). Set when a series ends, e.g. a colleague leaves. */
  until?: string;
}

export interface Task {
  id: string;
  title: string;
  category: Category;
  /** ISO date (YYYY-MM-DD) or null = unscheduled (backlog). Recurring tasks always have a date: their first occurrence. */
  date: string | null;
  time?: string;
  endTime?: string;
  deadline?: string;
  /** Only meaningful for one-off tasks. Recurring tasks are never "done". */
  done: boolean;
  /** Workflow status, independent of calendar placement. */
  status?: 'todo' | 'doing' | 'done';
  createdAt?: string;
  startedAt?: string;
  completedAt?: string;
  recurrence?: Recurrence;
  /** Recurring only: original occurrence date -> moved date. */
  overrides: Record<string, string>;
  goalId?: string;
  assigneeId?: string;
}

export interface Goal { id: string; title: string; category: Category; deadline?: string; priority?: 'low' | 'medium' | 'high'; completed?: boolean }

export interface Occurrence { task: Task; originalDate: string; date: string }

export interface TeamMember { id: string; name: string; role?: string }
export interface OneOnOne { id: string; personId: string; date: string; startTime?: string; endTime?: string; agenda: string; notes: string; decisions: string; followUps: string; }
export interface AppState { tasks: Task[]; goals: Goal[]; people?: TeamMember[]; oneOnOnes?: OneOnOne[] }
