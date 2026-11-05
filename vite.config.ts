import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: '/sorry-zombies/',
  test: { include: ['src/**/*.test.ts'] },
});
