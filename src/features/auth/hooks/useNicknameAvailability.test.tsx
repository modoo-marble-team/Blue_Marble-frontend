import { renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useNicknameAvailability } from './useNicknameAvailability'

vi.mock('../mockApi', () => ({
  validateNickname: vi.fn((nickname: string) => {
    const normalizedNickname = nickname.trim()

    if (normalizedNickname.length < 2) {
      return {
        ok: false,
        normalizedNickname,
        message: '닉네임은 2~10자여야 합니다.',
      }
    }

    return {
      ok: true,
      normalizedNickname,
    }
  }),
  mockCheckNicknameAvailability: vi.fn(async (nickname: string) => ({
    ok: true,
    normalizedNickname: nickname,
    isAvailable: true,
  })),
}))

describe('useNicknameAvailability', () => {
  it('형식 검증을 통과하면 중복 확인이 완료된 뒤 사용 가능 상태로 수렴한다', async () => {
    const { result } = renderHook(() => useNicknameAvailability('마블왕자'))

    await waitFor(() => {
      expect(result.current.isCheckingNickname).toBe(false)
      expect(result.current.isNicknameAvailable).toBe(true)
    })
  })
})
