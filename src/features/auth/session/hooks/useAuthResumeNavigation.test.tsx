import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createAuthSessionFixture } from '../../../../test/fixtures'
import { useAuthResumeNavigation } from './useAuthResumeNavigation'

const {
  clearSessionMock,
  disconnectSocketAndClearAuthMock,
  getMyContextMock,
  locationRef,
  navigateMock,
  shouldClearAuthSessionMock,
} = vi.hoisted(() => ({
  clearSessionMock: vi.fn(),
  disconnectSocketAndClearAuthMock: vi.fn(),
  getMyContextMock: vi.fn(),
  locationRef: {
    current: {
      pathname: '/',
      state: null,
    },
  },
  navigateMock: vi.fn(),
  shouldClearAuthSessionMock: vi.fn(),
}))

vi.mock('react-router-dom', () => ({
  useLocation: () => locationRef.current,
  useNavigate: () => navigateMock,
}))

vi.mock('../../api/api', () => ({
  getMyContext: getMyContextMock,
  shouldClearAuthSession: shouldClearAuthSessionMock,
}))

vi.mock('../store', () => ({
  useAuthStore: (selector: (state: { clearSession: () => void }) => unknown) =>
    selector({
      clearSession: clearSessionMock,
    }),
}))

vi.mock('../../../../lib/socket', () => ({
  disconnectSocketAndClearAuth: disconnectSocketAndClearAuthMock,
}))

describe('useAuthResumeNavigation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    locationRef.current = {
      pathname: '/',
      state: null,
    }
    shouldClearAuthSessionMock.mockReturnValue(false)
  })

  it('resume_target이 room이면 room_status와 무관하게 대기방 경로로 복귀한다', async () => {
    getMyContextMock.mockResolvedValue({
      roomId: 'room-42',
      roomTitle: '친구방',
      roomStatus: 'playing',
      gameId: null,
      presenceStatus: 'playing',
      resumeTarget: 'room',
    })

    const { result } = renderHook(() =>
      useAuthResumeNavigation({
        session: createAuthSessionFixture({
          accessToken: 'resume-token',
          userId: 'user-1',
        }),
      })
    )

    expect(result.current).toBe(true)

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/rooms/room-42', {
        replace: true,
        state: {
          roomId: 'room-42',
          roomTitle: '친구방',
        },
      })
    })
  })

  it('home 경로에서 context 조회가 실패하면 lobby로 fallback 이동한다', async () => {
    getMyContextMock.mockRejectedValue(new Error('temporary error'))

    renderHook(() =>
      useAuthResumeNavigation({
        session: createAuthSessionFixture({
          accessToken: 'resume-token',
          userId: 'user-1',
        }),
      })
    )

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/lobby', { replace: true })
    })
  })

  it('401 오류면 세션과 소켓을 정리하고 홈으로 복귀한다', async () => {
    const authError = new Error('unauthorized')
    getMyContextMock.mockRejectedValue(authError)
    shouldClearAuthSessionMock.mockReturnValue(true)

    renderHook(() =>
      useAuthResumeNavigation({
        session: createAuthSessionFixture({
          accessToken: 'expired-token',
          userId: 'user-1',
        }),
      })
    )

    await waitFor(() => {
      expect(clearSessionMock).toHaveBeenCalledTimes(1)
      expect(disconnectSocketAndClearAuthMock).toHaveBeenCalledTimes(1)
      expect(navigateMock).toHaveBeenCalledWith('/', { replace: true })
    })
  })

  it('skip이면 context 조회를 생략한다', () => {
    renderHook(() =>
      useAuthResumeNavigation({
        session: createAuthSessionFixture({
          accessToken: 'resume-token',
          userId: 'user-1',
        }),
        skip: true,
      })
    )

    expect(getMyContextMock).not.toHaveBeenCalled()
    expect(navigateMock).not.toHaveBeenCalled()
  })
})
