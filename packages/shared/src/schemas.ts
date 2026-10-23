import { z } from 'zod';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'expected YYYY-MM-DD');
const id = z.string().min(1).max(64);
export const CategorySchema = z.enum(['work', 'team', 'learning', 'personal']);

export const TaskInputSchema = z
  .object({
  id,
  title: z.string().trim().min(1).max(200),
  category: CategorySchema,
  /** Omit/null for an unscheduled (backlog) task. */
  date: isoDate.nullable().optional(),
  time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  deadline: isoDate.optional(),
  done: z.boolean().default(false),
  createdAt: isoDate.optional(),
  startedAt: isoDate.optional(),
  completedAt: isoDate.optional(),
  status: z.enum(['todo', 'doing', 'done']).optional(),
  recurrence: z.object({ freq: z.enum(['daily', 'weekly', 'monthly']), interval: z.number().int().min(1).max(52), until: isoDate.optional() }).optional(),
  goalId: id.optional(),
  assigneeId: id.optional(),
})
  .refine((t) => !t.recurrence || !!t.date, { message: 'recurring tasks need a date', path: ['date'] });
export const MoveSchema = z.object({ originalDate: isoDate.optional(), to: isoDate.nullable() });
export const EndSchema = z.object({ until: isoDate });
export const GoalInputSchema = z.object({ id, title: z.string().trim().min(1).max(200), category: CategorySchema, deadline: isoDate.optional(), priority: z.enum(['low','medium','high']).optional(), completed: z.boolean().optional() });
