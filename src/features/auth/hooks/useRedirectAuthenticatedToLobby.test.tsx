import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createAuthSessionFixture } from '../../../test/fixtures'
import { useRedirectAuthenticatedToLobby } from './useRedirectAuthenticatedToLobby'

const { navigateMock } = vi.hoisted(() => ({
  navigateMock: vi.fn(),
}))

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigateMock,
}))

describe('useRedirectAuthenticatedToLobby', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('bootstrap 중에는 세션이 있어도 로비 리다이렉트를 생략한다', () => {
    const session = createAuthSessionFixture({
      userId: 'user-1',
      nickname: '테스터',
      needsNicknameSetup: false,
    })

    renderHook(() =>
      useRedirectAuthenticatedToLobby(session, {
        skip: true,
      })
    )

    expect(navigateMock).not.toHaveBeenCalled()
  })

  it('bootstrap이 끝난 뒤에는 활성 세션을 로비로 리다이렉트한다', () => {
    const session = createAuthSessionFixture({
      userId: 'user-1',
      nickname: '테스터',
      needsNicknameSetup: false,
    })

    renderHook(() => useRedirectAuthenticatedToLobby(session))

    expect(navigateMock).toHaveBeenCalledWith('/lobby', { replace: true })
  })
})
