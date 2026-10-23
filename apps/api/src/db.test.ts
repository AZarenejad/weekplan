import { describe, expect, it } from 'vitest';
import { migrate, openDb } from './db';

describe('migrations', () => {
  it('are idempotent', () => {
    const db = openDb(':memory:');
    const version = () => (db.prepare('PRAGMA user_version').get() as { user_version: number }).user_version;
    const v = version();
    migrate(db);
    expect(version()).toBe(v);
    expect(v).toBeGreaterThan(0);
  });
});

describe('migration to v3 (nullable date)', () => {
  it('keeps existing tasks and their overrides', () => {
    const db = openDb(':memory:');
    db.exec('PRAGMA user_version = 0; DROP TABLE one_on_ones; DROP TABLE team_members; DROP TABLE task_overrides; DROP TABLE tasks; DROP TABLE goals;');
    migrate(db, 2);
    db.exec(`INSERT INTO tasks (id, title, category, date, rec_freq, rec_interval) VALUES ('t', 'Gam', 'team', '2026-10-21', 'weekly', 1);
             INSERT INTO task_overrides VALUES ('t', '2026-10-21', '2026-10-23');`);
    migrate(db);
    expect(db.prepare('SELECT title FROM tasks').all()).toHaveLength(1);
    expect(db.prepare('SELECT moved_date FROM task_overrides').get()).toMatchObject({ moved_date: '2026-10-23' });
    db.exec("INSERT INTO tasks (id, title, category) VALUES ('u', 'No date', 'work')");
  });
});

describe('goal metadata migration', () => {
  it('creates editable goal columns', () => {
    const db = openDb(':memory:');
    const columns = (db.prepare('PRAGMA table_info(goals)').all() as { name: string }[]).map(c => c.name);
    expect(columns).toEqual(expect.arrayContaining(['deadline', 'priority', 'completed']));
  });
});

describe('team and 1:1 persistence', () => {
  it('stores people, meetings and task ownership across database reopen', async () => {
    const { SqliteStore } = await import('./store');
    const db = openDb(':memory:');
    const store = new SqliteStore(db);
    store.upsertPerson({id:'p1', name:'Sara', role:'Backend'});
    store.createTask({id:'t1', title:'Kafka follow-up', category:'work', date:null, done:false, overrides:{}, assigneeId:'p1'});
    store.upsertOneOnOne({id:'m1',personId:'p1',date:'2026-10-22',agenda:'Growth',notes:'Discussed',decisions:'Review',followUps:'Check next week'});
    expect(store.listPeople()[0].name).toBe('Sara');
    expect(store.getTask('t1')?.assigneeId).toBe('p1');
    expect(store.listOneOnOnes()[0].followUps).toBe('Check next week');
    expect(store.deletePerson('p1')).toBe(true);
    expect(store.getTask('t1')?.assigneeId).toBeUndefined();
    expect(store.listOneOnOnes()).toHaveLength(0);
    db.close();
  });
});
