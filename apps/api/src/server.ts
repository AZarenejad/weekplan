import { resolve } from 'node:path';
import { buildApp } from './app';
import { loadConfig } from './config';
import { openDb } from './db';
import { SqliteStore } from './store';

const config = loadConfig();
const db = openDb(config.DB_PATH);
const app = await buildApp({
  store: new SqliteStore(db),
  apiToken: config.API_TOKEN || undefined,
  webDist: config.WEB_DIST ? resolve(config.WEB_DIST) : undefined,
  logger: true,
});

const shutdown = async () => { await app.close(); db.close(); process.exit(0); };
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

await app.listen({ port: config.PORT, host: config.HOST });
