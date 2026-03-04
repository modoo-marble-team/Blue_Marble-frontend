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
      // WIP 예외는 임시 운영만 허용하며, 이슈 번호/복귀 조건/만료 시점을 주석으로 남긴다.
      // 테스트 안정화 이후 상향된 최소 커버리지 기준선
      thresholds: {
        statements: 60,
        branches: 55,
        functions: 60,
        lines: 60,
      },
    },
  },
})
