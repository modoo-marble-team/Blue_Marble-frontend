import { renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useNicknameAvailability } from './useNicknameAvailability'

describe('useNicknameAvailability', () => {
  it('실서버 모드에서는 형식 검증만 통과해도 제출 가능 상태로 수렴한다', async () => {
    const { result } = renderHook(() => useNicknameAvailability('마블왕자'))

    await waitFor(() => {
      expect(result.current.isCheckingNickname).toBe(false)
      expect(result.current.isNicknameAvailable).toBe(true)
      expect(result.current.isAvailabilityCheckSupported).toBe(false)
    })
  })
})
