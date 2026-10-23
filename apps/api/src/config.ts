import { z } from 'zod';

const Env = z.object({
  PORT: z.coerce.number().default(4173),
  HOST: z.string().default('0.0.0.0'),
  DB_PATH: z.string().default('./data/weekplan.db'),
  /** If set, every /api request (except /api/health) needs `Authorization: Bearer <token>`. */
  API_TOKEN: z.string().optional(),
  /** Directory with the built web app; if set the API serves it too. */
  WEB_DIST: z.string().optional(),
});
export type Config = z.infer<typeof Env>;
export const loadConfig = (env: NodeJS.ProcessEnv = process.env): Config => Env.parse(env);
