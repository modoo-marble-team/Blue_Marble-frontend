import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createAuthSessionFixture } from '../../../../test/fixtures'
import { useAuthStore } from '../store'
import { useAuthBootstrap } from './useAuthBootstrap'

const {
  refreshAccessTokenMock,
  restoreAuthSessionMock,
  shouldClearAuthSessionMock,
  disconnectSocketAndClearAuthMock,
} = vi.hoisted(() => ({
  refreshAccessTokenMock: vi.fn(),
  restoreAuthSessionMock: vi.fn(),
  shouldClearAuthSessionMock: vi.fn(),
  disconnectSocketAndClearAuthMock: vi.fn(),
}))

vi.mock('../../api/api', () => ({
  refreshAccessToken: refreshAccessTokenMock,
  restoreAuthSession: restoreAuthSessionMock,
  shouldClearAuthSession: shouldClearAuthSessionMock,
}))

vi.mock('../../../../lib/socket', () => ({
  disconnectSocketAndClearAuth: disconnectSocketAndClearAuthMock,
}))

function createDeferredPromise<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void

  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve
    reject = nextReject
  })

  return { promise, resolve, reject }
}

describe('useAuthBootstrap', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.removeItem('marble-pop-auth-session')
    useAuthStore.setState({ session: null })
    shouldClearAuthSessionMock.mockReturnValue(true)
  })

  it('세션이 없으면 refresh fallback으로 세션 복구를 시도한다', async () => {
    refreshAccessTokenMock.mockResolvedValue({
      access_token: 'refreshed-token',
      token_type: 'Bearer',
      expires_in: 3600,
    })
    restoreAuthSessionMock.mockResolvedValue(
      createAuthSessionFixture({
        accessToken: 'refreshed-token',
        userId: 'guest-user',
        nickname: '게스트',
        isGuest: true,
        provider: 'guest',
      })
    )

    const { result } = renderHook(() => useAuthBootstrap())

    await waitFor(() => {
      expect(result.current).toBe(false)
    })

    expect(refreshAccessTokenMock).toHaveBeenCalledTimes(1)
    expect(restoreAuthSessionMock).toHaveBeenCalledWith({
      accessToken: 'refreshed-token',
      fallbackSession: null,
    })
    expect(useAuthStore.getState().session).toMatchObject({
      accessToken: 'refreshed-token',
      userId: 'guest-user',
      nickname: '게스트',
      isGuest: true,
    })
  })

  it('refresh fallback이 실패하면 비로그인 상태로 bootstrap을 종료한다', async () => {
    refreshAccessTokenMock.mockRejectedValue(new Error('refresh failed'))

    const { result } = renderHook(() => useAuthBootstrap())

    await waitFor(() => {
      expect(result.current).toBe(false)
    })

    expect(refreshAccessTokenMock).toHaveBeenCalledTimes(1)
    expect(restoreAuthSessionMock).not.toHaveBeenCalled()
    expect(useAuthStore.getState().session).toBeNull()
  })

  it('복구 중 새 세션이 들어오면 이전 복구 결과를 무시하고 bootstrap을 종료한다', async () => {
    const deferredRestore =
      createDeferredPromise<ReturnType<typeof createAuthSessionFixture>>()

    restoreAuthSessionMock.mockReturnValue(deferredRestore.promise)

    useAuthStore.setState({
      session: createAuthSessionFixture({
        accessToken: 'stale-token',
        userId: 'stale-user',
        nickname: '예전세션',
      }),
    })

    const { result } = renderHook(() => useAuthBootstrap())

    expect(result.current).toBe(true)

    act(() => {
      useAuthStore.getState().setSession(
        createAuthSessionFixture({
          accessToken: 'guest-token',
          userId: 'guest-user',
          nickname: '게스트',
          isGuest: true,
          provider: 'guest',
        })
      )
    })

    await waitFor(() => {
      expect(result.current).toBe(false)
    })

    await act(async () => {
      deferredRestore.resolve(
        createAuthSessionFixture({
          accessToken: 'restored-token',
          userId: 'restored-user',
          nickname: '복구세션',
        })
      )
      await deferredRestore.promise
    })

    expect(useAuthStore.getState().session).toMatchObject({
      accessToken: 'guest-token',
      userId: 'guest-user',
      nickname: '게스트',
      isGuest: true,
    })
  })

  it('refresh fallback 중 새 세션이 들어오면 이전 복구 결과를 무시한다', async () => {
    const deferredRefresh = createDeferredPromise<{
      access_token: string
      token_type: string
      expires_in: number
    }>()
    const deferredRestore =
      createDeferredPromise<ReturnType<typeof createAuthSessionFixture>>()

    refreshAccessTokenMock.mockReturnValue(deferredRefresh.promise)
    restoreAuthSessionMock.mockReturnValue(deferredRestore.promise)

    const { result } = renderHook(() => useAuthBootstrap())

    expect(result.current).toBe(true)

    act(() => {
      useAuthStore.getState().setSession(
        createAuthSessionFixture({
          accessToken: 'guest-token',
          userId: 'guest-user',
          nickname: '게스트',
          isGuest: true,
          provider: 'guest',
        })
      )
    })

    await waitFor(() => {
      expect(result.current).toBe(false)
    })

    await act(async () => {
      deferredRefresh.resolve({
        access_token: 'refreshed-token',
        token_type: 'Bearer',
        expires_in: 3600,
      })
      await deferredRefresh.promise
    })

    await act(async () => {
      deferredRestore.resolve(
        createAuthSessionFixture({
          accessToken: 'refreshed-token',
          userId: 'restored-user',
          nickname: '복구세션',
        })
      )
      await deferredRestore.promise
    })

    expect(useAuthStore.getState().session).toMatchObject({
      accessToken: 'guest-token',
      userId: 'guest-user',
      nickname: '게스트',
      isGuest: true,
    })
  })
})
