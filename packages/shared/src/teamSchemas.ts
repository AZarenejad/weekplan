import { z } from 'zod';
const id = z.string().min(1).max(64);
export const MemberSchema = z.object({ id, name: z.string().trim().min(1).max(120), role: z.string().max(120).optional() });
export const OneOnOneSchema = z.object({ id, personId: id, date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(), endTime: z.string().regex(/^\d{2}:\d{2}$/).optional(), agenda: z.string().max(10000).default(''), notes: z.string().max(20000).default(''), decisions: z.string().max(10000).default(''), followUps: z.string().max(10000).default('') }).refine(x => !x.startTime || !x.endTime || x.endTime > x.startTime, { message: 'end time must follow start time' });
