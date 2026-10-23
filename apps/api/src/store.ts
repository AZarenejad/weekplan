import type { Goal, Task, TeamMember, OneOnOne } from '@weekplan/shared';
import { transaction, type Db } from './db';

/** Persistence port. Implement it for Postgres etc. without touching routes. */
export interface PlannerStore {
  listPeople(): TeamMember[];
  upsertPerson(p: TeamMember): void;
  deletePerson(id: string): boolean;
  listOneOnOnes(): OneOnOne[];
  upsertOneOnOne(m: OneOnOne): void;
  deleteOneOnOne(id: string): boolean;
  listTasks(): Task[];
  getTask(id: string): Task | undefined;
  /** Throws on duplicate id / unknown goal (mapped to 409 / 422 by the app). */
  createTask(task: Task): void;
  updateTask(task: Task): void;
  deleteTask(id: string): boolean;
  listGoals(): Goal[];
  createGoal(goal: Goal): void;
  updateGoal(goal: Goal): boolean;
  deleteGoal(id: string): boolean;
}

interface TaskRow { id: string; title: string; category: Task['category']; date: string | null; time: string | null; end_time: string | null; deadline: string | null; done: number; status: string; created_at: string; started_at: string | null; completed_at: string | null; rec_freq: string | null; rec_interval: number | null; rec_until: string | null; goal_id: string | null; assignee_id: string | null }
interface OneOnOneRow { id: string; person_id: string; date: string; start_time: string | null; end_time: string | null; agenda: string; notes: string; decisions: string; follow_ups: string }
interface OverrideRow { task_id: string; original_date: string; moved_date: string }

const toTask = (r: TaskRow, overrides: Record<string, string>): Task => ({
  id: r.id, title: r.title, category: r.category, date: r.date, done: r.done === 1, status: (r.status ?? (r.done ? 'done' : 'todo')) as Task['status'], overrides, createdAt: r.created_at.slice(0,10), ...(r.started_at && { startedAt: r.started_at }), ...(r.completed_at && { completedAt: r.completed_at }),
  ...(r.time && { time: r.time }),
  ...(r.end_time && { endTime: r.end_time }),
  ...(r.deadline && { deadline: r.deadline }),
  ...(r.rec_freq && { recurrence: { freq: r.rec_freq as 'daily' | 'weekly' | 'monthly', interval: r.rec_interval ?? 1, ...(r.rec_until && { until: r.rec_until }) } }),
  ...(r.goal_id && { goalId: r.goal_id }),
  ...(r.assignee_id && { assigneeId: r.assignee_id }),
});

export class SqliteStore implements PlannerStore {
  constructor(private db: Db) {}

  listPeople(): TeamMember[] { return this.db.prepare('SELECT id,name,role FROM team_members ORDER BY name').all() as unknown as TeamMember[]; }
  upsertPerson(p: TeamMember): void { this.db.prepare('INSERT INTO team_members(id,name,role) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,role=excluded.role').run(p.id,p.name,p.role ?? null); }
  deletePerson(id: string): boolean { return this.db.prepare('DELETE FROM team_members WHERE id=?').run(id).changes > 0; }
  listOneOnOnes(): OneOnOne[] { return (this.db.prepare('SELECT * FROM one_on_ones ORDER BY date DESC,start_time DESC').all() as unknown as OneOnOneRow[]).map(r => ({id:r.id,personId:r.person_id,date:r.date,startTime:r.start_time ?? undefined,endTime:r.end_time ?? undefined,agenda:r.agenda,notes:r.notes,decisions:r.decisions,followUps:r.follow_ups})); }
  upsertOneOnOne(m: OneOnOne): void { this.db.prepare('INSERT INTO one_on_ones(id,person_id,date,start_time,end_time,agenda,notes,decisions,follow_ups) VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET person_id=excluded.person_id,date=excluded.date,start_time=excluded.start_time,end_time=excluded.end_time,agenda=excluded.agenda,notes=excluded.notes,decisions=excluded.decisions,follow_ups=excluded.follow_ups').run(m.id,m.personId,m.date,m.startTime ?? null,m.endTime ?? null,m.agenda,m.notes,m.decisions,m.followUps); }
  deleteOneOnOne(id: string): boolean { return this.db.prepare('DELETE FROM one_on_ones WHERE id=?').run(id).changes > 0; }
  private overridesFor(id: string) {
    const rows = this.db.prepare('SELECT * FROM task_overrides WHERE task_id = ?').all(id) as unknown as OverrideRow[];
    return Object.fromEntries(rows.map((o) => [o.original_date, o.moved_date]));
  }

  listTasks(): Task[] {
    const rows = this.db.prepare('SELECT * FROM tasks ORDER BY created_at, rowid').all() as unknown as TaskRow[];
    const byTask: Record<string, Record<string, string>> = {};
    for (const o of this.db.prepare('SELECT * FROM task_overrides').all() as unknown as OverrideRow[]) (byTask[o.task_id] ??= {})[o.original_date] = o.moved_date;
    return rows.map((r) => toTask(r, byTask[r.id] ?? {}));
  }

  getTask(id: string): Task | undefined {
    const row = this.db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as TaskRow | undefined;
    return row && toTask(row, this.overridesFor(id));
  }

  createTask(t: Task): void {
    transaction(this.db, () => {
      this.db
        .prepare('INSERT INTO tasks (id, title, category, date, time, end_time, deadline, done, status, started_at, completed_at, rec_freq, rec_interval, rec_until, goal_id, assignee_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
        .run(t.id, t.title, t.category, t.date ?? null, t.time ?? null, t.endTime ?? null, t.deadline ?? null, t.done ? 1 : 0, t.status ?? (t.done ? 'done' : 'todo'), t.startedAt ?? null, t.completedAt ?? null, t.recurrence?.freq ?? null, t.recurrence?.interval ?? null, t.recurrence?.until ?? null, t.goalId ?? null, t.assigneeId ?? null);
      this.replaceOverrides(t);
    });
  }

  updateTask(t: Task): void {
    transaction(this.db, () => {
      this.db
        .prepare('UPDATE tasks SET title=?, category=?, date=?, time=?, end_time=?, deadline=?, done=?, status=?, started_at=?, completed_at=?, rec_freq=?, rec_interval=?, rec_until=?, goal_id=?, assignee_id=? WHERE id=?')
        .run(t.title, t.category, t.date ?? null, t.time ?? null, t.endTime ?? null, t.deadline ?? null, t.done ? 1 : 0, t.status ?? (t.done ? 'done' : 'todo'), t.startedAt ?? null, t.completedAt ?? null, t.recurrence?.freq ?? null, t.recurrence?.interval ?? null, t.recurrence?.until ?? null, t.goalId ?? null, t.assigneeId ?? null, t.id);
      this.replaceOverrides(t);
    });
  }

  private replaceOverrides(t: Task) {
    this.db.prepare('DELETE FROM task_overrides WHERE task_id = ?').run(t.id);
    const ins = this.db.prepare('INSERT INTO task_overrides (task_id, original_date, moved_date) VALUES (?,?,?)');
    for (const [from, to] of Object.entries(t.overrides)) ins.run(t.id, from, to);
  }

  deleteTask(id: string): boolean {
    return this.db.prepare('DELETE FROM tasks WHERE id = ?').run(id).changes > 0;
  }

  listGoals(): Goal[] {
    return (this.db.prepare('SELECT id, title, category, deadline, priority, completed FROM goals ORDER BY created_at, rowid').all() as {id:string;title:string;category:Goal['category'];deadline:string|null;priority:Goal['priority'];completed:number}[]).map(g => ({id:g.id,title:g.title,category:g.category,...(g.deadline ? {deadline:g.deadline} : {}),priority:g.priority,completed:!!g.completed}));
  }

  createGoal(g: Goal): void {
    this.db.prepare('INSERT INTO goals (id, title, category, deadline, priority, completed) VALUES (?,?,?,?,?,?)').run(g.id, g.title, g.category, g.deadline ?? null, g.priority ?? 'medium', g.completed ? 1 : 0);
  }

  updateGoal(g: Goal): boolean {
    return this.db.prepare('UPDATE goals SET title=?, category=?, deadline=?, priority=?, completed=? WHERE id=?').run(g.title, g.category, g.deadline ?? null, g.priority ?? 'medium', g.completed ? 1 : 0, g.id).changes > 0;
  }

  deleteGoal(id: string): boolean {
    return this.db.prepare('DELETE FROM goals WHERE id = ?').run(id).changes > 0;
  }
}
