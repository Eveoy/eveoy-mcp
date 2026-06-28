import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/__tests__/*.test.ts', 'tests/**/*.test.ts'],
    // tdd-guard reporter feeds the local TDD-guard hook. Safe in CI: the package is a
    // devDependency (in the lockfile), so `npm ci` resolves it; it only writes a local file.
    reporters: ['default', ['tdd-guard-vitest', { projectRoot: root }]],
  },
  resolve: {
    alias: { '@': resolve(root, './src') },
  },
});
