import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    css: true,
    setupFiles: ['./src/test/setup.ts'],
    include: [
      'src/pages/lobby/**/*.test.ts',
      'src/pages/lobby/**/*.test.tsx',
      'src/pages/waiting-room/**/*.test.ts',
      'src/pages/waiting-room/**/*.test.tsx',
      'src/features/presence/**/*.test.ts',
      'src/features/presence/**/*.test.tsx',
      'src/features/room-chat/**/*.test.ts',
      'src/features/room-chat/**/*.test.tsx',
    ],
    exclude: [
      'e2e/**',
      '**/node_modules/**',
      '**/dist/**',
      '**/.{idea,git,cache,output,temp}/**',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: './coverage-owner',
      include: [
        'src/pages/lobby/**/*.{ts,tsx}',
        'src/pages/waiting-room/**/*.{ts,tsx}',
        'src/features/presence/**/*.{ts,tsx}',
        'src/features/room-chat/**/*.{ts,tsx}',
      ],
      exclude: [
        '**/*.test.ts',
        '**/*.test.tsx',
        '**/*.d.ts',
        '**/types.ts',
        'src/pages/waiting-room/components/DevControlPanel.tsx',
        'src/features/room-chat/DevRoomChatControlPanel.tsx',
      ],
    },
  },
})
