import { beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from './app';
import { openDb } from './db';
import { SqliteStore } from './store';

const task = { id: 't1', title: 'Gam meeting', category: 'team', date: '2026-10-21', recurrence: { freq: 'weekly', interval: 1 } };
let app: FastifyInstance;
const call = (method: 'GET' | 'POST' | 'PUT' | 'DELETE', url: string, payload?: object) => app.inject({ method, url, payload });

describe('api', () => {
  beforeEach(async () => { app = await buildApp({ store: new SqliteStore(openDb(':memory:')) }); });

  it('creates goals and tasks and returns them in /state', async () => {
    expect((await call('POST', '/api/goals', { id: 'g1', title: 'IP reassembly', category: 'work' })).statusCode).toBe(201);
    expect((await call('POST', '/api/tasks', { ...task, id: 't2', category: 'work', recurrence: undefined, goalId: 'g1' })).statusCode).toBe(201);
    const state = (await call('GET', '/api/state')).json();
    expect(state.goals).toHaveLength(1);
    expect(state.tasks[0]).toMatchObject({ id: 't2', goalId: 'g1', done: false, overrides: {} });
  });

  it('moving a recurring occurrence persists an override and never marks it done', async () => {
    await call('POST', '/api/tasks', task);
    await call('POST', '/api/tasks/t1/move', { originalDate: '2026-10-21', to: '2026-10-23' });
    await call('POST', '/api/tasks/t1/toggle');
    const t = (await call('GET', '/api/state')).json().tasks[0];
    expect(t).toMatchObject({ date: '2026-10-21', done: false, overrides: { '2026-10-21': '2026-10-23' } });
  });

  it('ending a series persists `until`', async () => {
    await call('POST', '/api/tasks', task);
    await call('POST', '/api/tasks/t1/end', { until: '2026-11-04' });
    expect((await call('GET', '/api/state')).json().tasks[0].recurrence).toEqual({ freq: 'weekly', interval: 1, until: '2026-11-04' });
  });

  it('supports unscheduled tasks: schedule, unschedule, and rejects unscheduling a series', async () => {
    await call('POST', '/api/tasks', { id: 'b', title: 'Learn eBPF', category: 'learning' });
    expect((await call('GET', '/api/state')).json().tasks[0].date).toBeNull();
    await call('POST', '/api/tasks/b/move', { to: '2026-10-25' });
    expect((await call('GET', '/api/state')).json().tasks[0].date).toBe('2026-10-25');
    await call('POST', '/api/tasks/b/move', { to: null });
    expect((await call('GET', '/api/state')).json().tasks[0].date).toBeNull();
    await call('POST', '/api/tasks', task);
    expect((await call('POST', '/api/tasks/t1/move', { to: null })).statusCode).toBe(400);
    expect((await call('POST', '/api/tasks', { ...task, id: 'z', date: null })).statusCode).toBe(400);
  });

  it('toggles one-off tasks and deletes them', async () => {
    await call('POST', '/api/tasks', { ...task, recurrence: undefined });
    expect((await call('POST', '/api/tasks/t1/toggle')).json().done).toBe(true);
    expect((await call('DELETE', '/api/tasks/t1')).statusCode).toBe(204);
    expect((await call('DELETE', '/api/tasks/t1')).statusCode).toBe(404);
  });

  it('rejects invalid input, duplicates and unknown goals', async () => {
    expect((await call('POST', '/api/tasks', { ...task, date: 'tomorrow' })).statusCode).toBe(400);
    await call('POST', '/api/tasks', task);
    expect((await call('POST', '/api/tasks', task)).statusCode).toBe(409);
    expect((await call('POST', '/api/tasks', { ...task, id: 'x', goalId: 'nope' })).statusCode).toBe(422);
  });

  it('deleting a goal keeps its tasks but unlinks them', async () => {
    await call('POST', '/api/goals', { id: 'g1', title: 'G', category: 'work' });
    await call('POST', '/api/tasks', { ...task, recurrence: undefined, goalId: 'g1' });
    await call('DELETE', '/api/goals/g1');
    expect((await call('GET', '/api/state')).json().tasks[0].goalId).toBeUndefined();
  });
});

describe('auth', () => {
  it('requires the token except on /health', async () => {
    app = await buildApp({ store: new SqliteStore(openDb(':memory:')), apiToken: 's3cret' });
    expect((await call('GET', '/api/health')).statusCode).toBe(200);
    expect((await call('GET', '/api/state')).statusCode).toBe(401);
    const ok = await app.inject({ method: 'GET', url: '/api/state', headers: { authorization: 'Bearer s3cret' } });
    expect(ok.statusCode).toBe(200);
  });
});


describe('goal metadata API', () => {
  it('persists updates and completion', async () => {
    const app = await buildApp({ store: new SqliteStore(openDb(':memory:')) });
    const call = (method: 'GET' | 'POST' | 'PUT', url: string, payload?: object) => app.inject({ method, url, payload });
    const goal = { id: 'g', title: 'Read', category: 'personal', deadline: '2026-11-12', priority: 'high', completed: false };
    expect((await call('POST', '/api/goals', goal)).statusCode).toBe(201);
    expect((await call('PUT', '/api/goals/g', { ...goal, completed: true })).statusCode).toBe(200);
    expect((await call('GET', '/api/state')).json().goals[0]).toMatchObject({ deadline: '2026-11-12', priority: 'high', completed: true });
    await app.close();
  });
});
