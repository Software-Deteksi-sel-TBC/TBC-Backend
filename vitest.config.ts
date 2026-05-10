import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    env: {
      JWT_SECRET: 'test-secret-key-for-unit-tests',
    },
  },
});