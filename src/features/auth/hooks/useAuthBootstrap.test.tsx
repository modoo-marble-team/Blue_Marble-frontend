import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createAuthSessionFixture } from '../../../test/fixtures'
import { useAuthStore } from '../store'
import { useAuthBootstrap } from './useAuthBootstrap'

const { restoreAuthSessionMock, shouldClearAuthSessionMock } = vi.hoisted(
  () => ({
    restoreAuthSessionMock: vi.fn(),
    shouldClearAuthSessionMock: vi.fn(),
  })
)

vi.mock('../api', () => ({
  restoreAuthSession: restoreAuthSessionMock,
  shouldClearAuthSession: shouldClearAuthSessionMock,
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

  it('세션이 없으면 bootstrap을 바로 종료한다', async () => {
    const { result } = renderHook(() => useAuthBootstrap())

    await waitFor(() => {
      expect(result.current).toBe(false)
    })

    expect(restoreAuthSessionMock).not.toHaveBeenCalled()
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
})
