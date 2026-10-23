import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname } from 'node:path';
import type { DatabaseSync } from 'node:sqlite';

// Built-in SQLite (no native addon to compile). Loaded via require so bundlers/test runners leave `node:sqlite` alone.
const { DatabaseSync: Sqlite } = createRequire(import.meta.url)('node:sqlite') as typeof import('node:sqlite');

export type Db = DatabaseSync;

export function transaction<T>(db: Db, fn: () => T): T {
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

/** Append-only list. Index i brings the schema to version i+1 (stored in PRAGMA user_version). */
const MIGRATIONS: string[] = [
  `CREATE TABLE goals (
     id TEXT PRIMARY KEY, title TEXT NOT NULL, category TEXT NOT NULL,
     created_at TEXT NOT NULL DEFAULT (datetime('now')));
   CREATE TABLE tasks (
     id TEXT PRIMARY KEY, title TEXT NOT NULL, category TEXT NOT NULL,
     date TEXT NOT NULL, time TEXT, done INTEGER NOT NULL DEFAULT 0,
     rec_freq TEXT, rec_interval INTEGER,
     goal_id TEXT REFERENCES goals(id) ON DELETE SET NULL,
     created_at TEXT NOT NULL DEFAULT (datetime('now')));
   CREATE TABLE task_overrides (
     task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
     original_date TEXT NOT NULL, moved_date TEXT NOT NULL,
     PRIMARY KEY (task_id, original_date));
   CREATE INDEX idx_tasks_goal ON tasks(goal_id);
   CREATE INDEX idx_tasks_date ON tasks(date);`,
  `ALTER TABLE tasks ADD COLUMN rec_until TEXT;`,
  // v3: tasks.date becomes nullable (unscheduled/backlog tasks). SQLite can't drop NOT NULL, so rebuild the table.
  `CREATE TABLE tasks_new (
     id TEXT PRIMARY KEY, title TEXT NOT NULL, category TEXT NOT NULL,
     date TEXT, time TEXT, done INTEGER NOT NULL DEFAULT 0,
     rec_freq TEXT, rec_interval INTEGER, rec_until TEXT,
     goal_id TEXT REFERENCES goals(id) ON DELETE SET NULL,
     created_at TEXT NOT NULL DEFAULT (datetime('now')));
   INSERT INTO tasks_new (id, title, category, date, time, done, rec_freq, rec_interval, rec_until, goal_id, created_at)
     SELECT id, title, category, date, time, done, rec_freq, rec_interval, rec_until, goal_id, created_at FROM tasks;
   DROP TABLE tasks;
   ALTER TABLE tasks_new RENAME TO tasks;
   CREATE INDEX idx_tasks_goal ON tasks(goal_id);
   CREATE INDEX idx_tasks_date ON tasks(date);`,
  `ALTER TABLE tasks ADD COLUMN end_time TEXT; ALTER TABLE tasks ADD COLUMN deadline TEXT;`,
  `ALTER TABLE goals ADD COLUMN deadline TEXT; ALTER TABLE goals ADD COLUMN priority TEXT NOT NULL DEFAULT 'medium'; ALTER TABLE goals ADD COLUMN completed INTEGER NOT NULL DEFAULT 0;`,
  `ALTER TABLE tasks ADD COLUMN status TEXT NOT NULL DEFAULT 'todo'; UPDATE tasks SET status = 'done' WHERE done = 1;`,
  `ALTER TABLE tasks ADD COLUMN started_at TEXT; ALTER TABLE tasks ADD COLUMN completed_at TEXT; UPDATE tasks SET completed_at = substr(created_at,1,10) WHERE done = 1;`,
  `CREATE TABLE team_members (id TEXT PRIMARY KEY, name TEXT NOT NULL, role TEXT);
   CREATE TABLE one_on_ones (id TEXT PRIMARY KEY, person_id TEXT NOT NULL REFERENCES team_members(id) ON DELETE CASCADE, date TEXT NOT NULL, start_time TEXT, end_time TEXT, agenda TEXT NOT NULL DEFAULT '', notes TEXT NOT NULL DEFAULT '', decisions TEXT NOT NULL DEFAULT '', follow_ups TEXT NOT NULL DEFAULT '');
   CREATE INDEX idx_one_on_ones_person ON one_on_ones(person_id, date);
   ALTER TABLE tasks ADD COLUMN assignee_id TEXT REFERENCES team_members(id) ON DELETE SET NULL;`,
];

export function migrate(db: Db, target = MIGRATIONS.length): void {
  const current = (db.prepare('PRAGMA user_version').get() as { user_version: number }).user_version;
  // Foreign keys must be off while rebuilding tables (DROP TABLE would otherwise cascade-delete child rows).
  db.exec('PRAGMA foreign_keys = OFF');
  try {
    for (let v = current; v < target; v++) {
      transaction(db, () => {
        db.exec(MIGRATIONS[v]);
        db.exec(`PRAGMA user_version = ${v + 1}`);
      });
    }
  } finally {
    db.exec('PRAGMA foreign_keys = ON');
  }
}

export function openDb(path: string): Db {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new Sqlite(path);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  migrate(db);
  return db;
}
