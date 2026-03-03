import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    css: true,
    setupFiles: ['./src/test/setup.ts'],
    passWithNoTests: true,
    // Playwright E2E 스펙은 Vitest 실행/커버리지 집계 대상에서 제외
    exclude: [
      'e2e/**',
      '**/node_modules/**',
      '**/dist/**',
      '**/.{idea,git,cache,output,temp}/**',
    ],
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
