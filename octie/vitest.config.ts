import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.{test,spec}.{js,ts}', 'src/**/*.{test,spec}.{js,ts}', 'test/**/*.{test,spec}.{js,ts}', 'tests/**/*.{test,spec}.{js,ts}'],
    exclude: ['node_modules', 'dist', 'web-ui/node_modules'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/**/*.spec.ts', 'src/types/**/*', 'dist/**/*', 'node_modules/**/*'],
      all: true,
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
        perFile: false,
        autoUpdate: true
      }
    },
    testTimeout: 10000,
    hookTimeout: 10000,
    teardownTimeout: 10000,
    reporters: ['default', 'html'],
    watch: false,
    // Benchmark configuration
    benchmark: {
      include: ['tests/benchmark/**/*.bench.ts'],
      exclude: ['node_modules', 'dist', 'web-ui/node_modules'],
      reporters: ['default'],
    }
  },
  resolve: {
    alias: {
      '@': '/src'
    }
  }
})
