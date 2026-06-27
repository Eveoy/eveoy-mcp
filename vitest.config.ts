import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/__tests__/*.test.ts', 'tests/**/*.test.ts'],
    reporters: [
      'default',
      ['tdd-guard-vitest', { projectRoot: root }],
    ],
  },
  resolve: {
    alias: { '@': resolve(root, './src') },
  },
});
