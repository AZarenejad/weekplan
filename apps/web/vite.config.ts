import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './',
  plugins: [react()],
  // `VITE_API_URL=/api npm run dev:web` talks to `npm run dev:api` through this proxy.
  server: { proxy: { '/api': 'http://localhost:4173' } },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
});
