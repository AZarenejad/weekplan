// Bundles the API (and the shared workspace package) into one file; real dependencies stay external.
import { build } from 'esbuild';
import { readFileSync } from 'node:fs';

const { dependencies } = JSON.parse(readFileSync('./package.json', 'utf8'));
await build({
  entryPoints: ['src/server.ts'],
  outfile: 'dist/server.js',
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  external: Object.keys(dependencies),
  sourcemap: true,
});
