import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      reportsDirectory: './coverage',
      // 覆盖率阈值（暂时设低，后续逐步提高）
      thresholds: {
        statements: 50,
        branches: 50,
        functions: 50,
        lines: 50,
      },
    },
  },
});
