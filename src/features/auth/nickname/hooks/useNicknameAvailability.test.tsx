import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
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

  it('형식 검증을 통과하지 못하면 중복 확인을 시작하지 않는다', async () => {
    const { result } = renderHook(() => useNicknameAvailability('a'))

    await waitFor(() => {
      expect(result.current.nicknameValidation.ok).toBe(false)
      expect(result.current.isCheckingNickname).toBe(false)
      expect(result.current.isNicknameAvailable).toBeNull()
    })
  })
})

afterEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
})

describe('useNicknameAvailability (mock mode)', () => {
  it('mock 모드에서는 debounce 후 중복 확인 결과를 반영한다', async () => {
    vi.doMock('../../api/api', () => ({
      IS_AUTH_MOCK_ENABLED: true,
    }))

    const mockCheckNicknameAvailability = vi.fn().mockResolvedValue({
      ok: true,
      isAvailable: false,
    })

    vi.doMock('../../api/mockApi', () => ({
      mockCheckNicknameAvailability,
    }))

    const { useNicknameAvailability: useMockNicknameAvailability } =
      await import('./useNicknameAvailability')

    const { result } = renderHook(() =>
      useMockNicknameAvailability('중복닉네임')
    )

    await waitFor(() => {
      expect(result.current.isCheckingNickname).toBe(false)
      expect(result.current.isNicknameAvailable).toBe(false)
      expect(result.current.isAvailabilityCheckSupported).toBe(true)
    })

    expect(mockCheckNicknameAvailability).toHaveBeenCalledWith('중복닉네임')
  })
})
