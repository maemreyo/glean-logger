/// <reference types="vitest" />

export default {
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'dist/',
        'dist-dev/',
        'src/**/*.test.ts',
        'test/**/*.ts',
        '**/*.config.ts',
        'coverage/',
      ],
      lines: 80,
      functions: 80,
      branches: 80,
      statements: 80,
    },
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
    exclude: ['node_modules', 'dist', 'dist-dev'],
  },
};
