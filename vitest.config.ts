import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    css: true,
    setupFiles: ['./src/test/setup.ts'],
    passWithNoTests: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: './coverage',
      // 현재 테스트 스위트 기준으로 유지 가능한 최소 커버리지 기준선
      thresholds: {
        statements: 55,
        branches: 49,
        functions: 55,
        lines: 56,
      },
    },
  },
})
