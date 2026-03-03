import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// 각 테스트 종료 후 DOM을 정리해 케이스 간 상태 누수를 방지
afterEach(() => {
  cleanup()
})
