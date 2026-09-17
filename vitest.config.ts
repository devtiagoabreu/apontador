import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(process.cwd(), 'src'),
    },
  },
  esbuild: {
    jsx: 'automatic',
  },
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', '.next'],
    environmentMatchGlobs: [['src/**/*.test.tsx', 'jsdom']],
    env: {
      DATABASE_URL: 'postgres://usuario:senha@localhost:5432/apontador_test',
      NEXTAUTH_URL: 'http://localhost:3000',
      NEXTAUTH_SECRET: 'test-secret',
      NODE_ENV: 'test',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/lib/**/*.{ts,tsx}', 'src/components/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/**/*.d.ts', 'src/**/index.ts'],
    },
  },
});
