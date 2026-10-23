import fastifyStatic from '@fastify/static';
import { MemberSchema, OneOnOneSchema, EndSchema, GoalInputSchema, MoveSchema, endSeries, TaskInputSchema, moveTask, toggleTask, setStatus, type Task } from '@weekplan/shared';
import { z } from 'zod';
import Fastify, { type FastifyInstance } from 'fastify';
import { timingSafeEqual } from 'node:crypto';
import { ZodError } from 'zod';
import type { PlannerStore } from './store';

interface IdRoute { Params: { id: string }; Body: unknown }

export interface AppOptions { store: PlannerStore; apiToken?: string; webDist?: string; logger?: boolean }

const safeEqual = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

export async function buildApp({ store, apiToken, webDist, logger = false }: AppOptions): Promise<FastifyInstance> {
  const app = Fastify({ logger });

  app.setErrorHandler((err: Error & { statusCode?: number }, req, reply) => {
    if (err instanceof ZodError) return reply.code(400).send({ error: 'validation', issues: err.issues });
    if (/UNIQUE constraint failed|PRIMARY KEY/.test(err.message)) return reply.code(409).send({ error: 'already exists' });
    if (/FOREIGN KEY constraint failed/.test(err.message)) return reply.code(422).send({ error: 'unknown reference' });
    if (err.statusCode && err.statusCode < 500) return reply.code(err.statusCode).send({ error: err.message });
    req.log.error(err);
    return reply.code(500).send({ error: 'internal error' });
  });

  app.addHook('onRequest', async (req, reply) => {
    if (!apiToken || !req.url.startsWith('/api') || req.url === '/api/health') return;
    const given = req.headers.authorization ?? '';
    if (!safeEqual(given, `Bearer ${apiToken}`)) return reply.code(401).send({ error: 'unauthorized' });
  });

  await app.register(
    async (api) => {
      const notFound = (reply: { code(n: number): { send(b: unknown): unknown } }) => reply.code(404).send({ error: 'not found' });

      api.get('/health', async () => ({ ok: true }));
      api.get('/state', async () => ({ tasks: store.listTasks(), goals: store.listGoals(), people: store.listPeople(), oneOnOnes: store.listOneOnOnes() }));

      api.put<IdRoute>('/people/:id', async (req, reply) => { const p = MemberSchema.parse(req.body); if(p.id !== req.params.id) return reply.code(400).send({error:'id mismatch'}); store.upsertPerson(p); return p; });
      api.delete<IdRoute>('/people/:id', async (req, reply) => store.deletePerson(req.params.id) ? reply.code(204).send() : notFound(reply));
      api.put<IdRoute>('/one-on-ones/:id', async (req, reply) => { const m = OneOnOneSchema.parse(req.body); if(m.id !== req.params.id) return reply.code(400).send({error:'id mismatch'}); if(!store.listPeople().some(p => p.id === m.personId)) return reply.code(422).send({error:'unknown person'}); store.upsertOneOnOne(m); return m; });
      api.delete<IdRoute>('/one-on-ones/:id', async (req, reply) => store.deleteOneOnOne(req.params.id) ? reply.code(204).send() : notFound(reply));
      api.post('/tasks', async (req, reply) => {
        const input = TaskInputSchema.parse(req.body);
        const task: Task = { ...input, date: input.date ?? null, overrides: {} };
        store.createTask(task);
        return reply.code(201).send(task);
      });
      api.put<{ Params: { id: string } }>('/tasks/:id', async (req, reply) => {
        const input = TaskInputSchema.parse(req.body);
        if (input.id !== req.params.id) return reply.code(400).send({ error: 'id mismatch' });
        const old = store.getTask(req.params.id);
        if (!old) return notFound(reply);
        const updated: Task = { ...old, ...input, date: input.date ?? null, overrides: old.overrides };
        store.updateTask(updated);
        return updated;
      });
      api.patch<{ Params: { id: string } }>('/tasks/:id/status', async (req, reply) => {
        const { status } = z.object({ status: z.enum(['todo', 'doing', 'done']) }).parse(req.body);
        const task = store.getTask(req.params.id);
        if (!task) return notFound(reply);
        const next = setStatus(task, status, new Date().toISOString().slice(0,10));
        store.updateTask(next);
        return next;
      });
      api.post<{ Params: { id: string } }>('/tasks/:id/toggle', async (req, reply) => {
        const task = store.getTask(req.params.id);
        if (!task) return notFound(reply);
        const next = toggleTask(task);
        store.updateTask(next);
        return next;
      });
      api.post<{ Params: { id: string } }>('/tasks/:id/move', async (req, reply) => {
        const { originalDate, to } = MoveSchema.parse(req.body);
        const task = store.getTask(req.params.id);
        if (!task) return notFound(reply);
        if (task.recurrence && (!originalDate || to === null)) return reply.code(400).send({ error: 'recurring tasks need originalDate and a target date' });
        const next = moveTask(task, originalDate, to);
        store.updateTask(next);
        return next;
      });
      api.post<{ Params: { id: string } }>('/tasks/:id/end', async (req, reply) => {
        const { until } = EndSchema.parse(req.body);
        const task = store.getTask(req.params.id);
        if (!task) return notFound(reply);
        const next = endSeries(task, until);
        store.updateTask(next);
        return next;
      });
      api.delete<{ Params: { id: string } }>('/tasks/:id', async (req, reply) =>
        store.deleteTask(req.params.id) ? reply.code(204).send() : notFound(reply));

      api.post('/goals', async (req, reply) => {
        const goal = GoalInputSchema.parse(req.body);
        store.createGoal(goal);
        return reply.code(201).send(goal);
      });
      api.put<{ Params: { id: string } }>('/goals/:id', async (req, reply) => {
        const goal = GoalInputSchema.parse(req.body);
        if (goal.id !== req.params.id) return reply.code(400).send({ error: 'id mismatch' });
        return store.updateGoal(goal) ? goal : notFound(reply);
      });
      api.delete<{ Params: { id: string } }>('/goals/:id', async (req, reply) =>
        store.deleteGoal(req.params.id) ? reply.code(204).send() : notFound(reply));
    },
    { prefix: '/api' },
  );

  if (webDist) {
    await app.register(fastifyStatic, { root: webDist });
    app.setNotFoundHandler((req, reply) =>
      req.url.startsWith('/api') ? reply.code(404).send({ error: 'not found' }) : reply.sendFile('index.html'));
  }
  return app;
}
