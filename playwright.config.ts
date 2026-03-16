import { defineConfig, devices } from '@playwright/test'

// 로컬 디버그 실행(--debug/PW_LOCAL_DEBUG)에서만 큰 뷰포트를 사용
const isLocalDebugRun =
  !process.env.CI &&
  (process.env.PWDEBUG === '1' ||
    process.env.PWDEBUG === 'console' ||
    process.env.PW_LOCAL_DEBUG === 'true')

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['github'], ['html']] : 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        ...(isLocalDebugRun
          ? {
              viewport: { width: 1536, height: 960 },
              launchOptions: { args: ['--window-size=1536,960'] },
            }
          : {}),
      },
    },
  ],
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 4173',
    env: {
      ...process.env,
      // E2E는 auth/session까지 mock으로 고정해 로컬 .env 상태와 무관하게 동일한 플로우를 검증한다.
      // 필요하면 환경변수로 override할 수 있다.
      VITE_ENABLE_DEMO_MOCK: process.env.VITE_ENABLE_DEMO_MOCK ?? 'true',
      // 기본은 mock 소켓 모드로 CI 안정성을 유지하고, 필요 시 환경변수로 실소켓 모드 실행
      VITE_USE_SOCKET_MOCK: process.env.VITE_USE_SOCKET_MOCK ?? 'true',
    },
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
