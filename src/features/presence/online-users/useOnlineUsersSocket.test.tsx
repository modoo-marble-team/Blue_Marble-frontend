import { renderHook, waitFor, act } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useOnlineUsersSocket } from './useOnlineUsersSocket'
import type { OnlineUsersEventPayload } from '../types'
import { createOnlineUserPayloadFixture } from '../../../test/fixtures'
import {
  emitSocketEvent,
  getSocketEventHandler,
} from '../../../test/socketEmitter'

const {
  socketOnMock,
  socketOffMock,
  getOnlineUsersSnapshotMock,
  normalizeOnlineUsersPayloadMock,
  normalizeOnlineUserStatusChangedPayloadMock,
  isOnlineUsersSocketMockModeMock,
  startOnlineUsersMockBroadcastMock,
  stopMockBroadcastMock,
  ensureOnlineUsersSocketConnectionMock,
  onlineUsersRefreshRequestEventName,
  onlineUserStatusChangedEventName,
} = vi.hoisted(() => ({
  socketOnMock: vi.fn(),
  socketOffMock: vi.fn(),
  getOnlineUsersSnapshotMock: vi.fn(),
  normalizeOnlineUsersPayloadMock: vi.fn((users) => users),
  normalizeOnlineUserStatusChangedPayloadMock: vi.fn((payload) => payload),
  isOnlineUsersSocketMockModeMock: vi.fn(),
  startOnlineUsersMockBroadcastMock: vi.fn(),
  stopMockBroadcastMock: vi.fn(),
  ensureOnlineUsersSocketConnectionMock: vi.fn(),
  onlineUsersRefreshRequestEventName: 'online-users-refresh-request',
  onlineUserStatusChangedEventName: 'user_status_changed',
}))

vi.mock('../../../lib/socket', () => ({
  socket: {
    on: socketOnMock,
    off: socketOffMock,
  },
}))

vi.mock('./api', () => ({
  getOnlineUsersSnapshot: getOnlineUsersSnapshotMock,
  normalizeOnlineUsersPayload: normalizeOnlineUsersPayloadMock,
  normalizeOnlineUserStatusChangedPayload:
    normalizeOnlineUserStatusChangedPayloadMock,
}))

vi.mock('./onlineUsersSocket', () => ({
  ONLINE_USERS_EVENT_NAME: 'online_users',
  ONLINE_USER_STATUS_CHANGED_EVENT_NAME: onlineUserStatusChangedEventName,
  ONLINE_USERS_REFRESH_REQUEST_EVENT_NAME: onlineUsersRefreshRequestEventName,
  isOnlineUsersSocketMockMode: isOnlineUsersSocketMockModeMock,
  startOnlineUsersMockBroadcast: startOnlineUsersMockBroadcastMock,
  ensureOnlineUsersSocketConnection: ensureOnlineUsersSocketConnectionMock,
}))

describe('useOnlineUsersSocket', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    isOnlineUsersSocketMockModeMock.mockReturnValue(false)
    getOnlineUsersSnapshotMock.mockResolvedValue([])
    normalizeOnlineUsersPayloadMock.mockImplementation((users) =>
      Array.isArray(users)
        ? users.map((user) => ({
            ...user,
            id: String(user.id),
            nickname: user.nickname.trim(),
          }))
        : []
    )
    normalizeOnlineUserStatusChangedPayloadMock.mockImplementation(
      (payload) => {
        if (!payload || typeof payload !== 'object') {
          return null
        }

        const normalizedPayload = payload as {
          id?: unknown
          nickname?: unknown
          status?: unknown
        }

        if (
          (typeof normalizedPayload.id !== 'string' &&
            typeof normalizedPayload.id !== 'number') ||
          typeof normalizedPayload.nickname !== 'string' ||
          typeof normalizedPayload.status !== 'string'
        ) {
          return null
        }

        return {
          id: String(normalizedPayload.id),
          nickname: normalizedPayload.nickname.trim(),
          status: normalizedPayload.status,
        }
      }
    )
    startOnlineUsersMockBroadcastMock.mockReturnValue(stopMockBroadcastMock)
  })

  it('실소켓 모드에서 초기 REST 스냅샷을 반영한다', async () => {
    getOnlineUsersSnapshotMock.mockResolvedValue([
      createOnlineUserPayloadFixture({
        id: 'user-1',
        nickname: 'Goorm',
        status: 'lobby',
      }),
    ])

    const { result } = renderHook(() => useOnlineUsersSocket())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.isError).toBe(false)
    expect(result.current.data).toHaveLength(1)
    expect(result.current.data[0]).toMatchObject({
      id: 'user-1',
      nickname: 'Goorm',
      status: 'lobby',
      avatarText: 'G',
    })
    expect(ensureOnlineUsersSocketConnectionMock).toHaveBeenCalledTimes(1)
  })

  it('online_users 이벤트 수신 시 접속자 목록을 갱신한다', async () => {
    const { result } = renderHook(() => useOnlineUsersSocket())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    const handler = getSocketEventHandler<OnlineUsersEventPayload>(
      socketOnMock,
      'online_users'
    )
    expect(handler).not.toBeNull()

    act(() => {
      emitSocketEvent(socketOnMock, 'online_users', {
        users: [
          {
            id: 2,
            nickname: '  alpha ',
            status: 'in_room',
          },
        ],
      })
    })

    expect(result.current.data).toHaveLength(1)
    expect(result.current.data[0]).toMatchObject({
      id: '2',
      nickname: 'alpha',
      status: 'in_room',
      avatarText: 'A',
    })
  })

  it('실시간 online_users 이벤트 이후 늦게 도착한 snapshot 응답은 최신 목록을 덮어쓰지 않는다', async () => {
    let resolveSnapshot: ((users: unknown[]) => void) | null = null

    getOnlineUsersSnapshotMock.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveSnapshot = resolve
      })
    )

    const { result } = renderHook(() => useOnlineUsersSocket())

    act(() => {
      emitSocketEvent(socketOnMock, 'online_users', {
        users: [
          {
            id: 'user-live',
            nickname: '실시간유저',
            status: 'lobby',
          },
        ],
      })
    })

    expect(result.current.data).toHaveLength(1)
    expect(result.current.data[0]).toMatchObject({
      id: 'user-live',
      nickname: '실시간유저',
      status: 'lobby',
    })

    await act(async () => {
      resolveSnapshot?.([
        createOnlineUserPayloadFixture({
          id: 'user-stale',
          nickname: '오래된유저',
          status: 'in_room',
        }),
      ])
      await Promise.resolve()
    })

    expect(result.current.data).toHaveLength(1)
    expect(result.current.data[0]).toMatchObject({
      id: 'user-live',
      nickname: '실시간유저',
      status: 'lobby',
    })
  })

  it('user_status_changed offline 이벤트 수신 시 해당 사용자를 목록에서 제거한다', async () => {
    getOnlineUsersSnapshotMock.mockResolvedValue([
      createOnlineUserPayloadFixture({
        id: '1',
        nickname: '남아있는유저',
        status: 'lobby',
      }),
      createOnlineUserPayloadFixture({
        id: '2',
        nickname: '로그아웃유저',
        status: 'in_room',
      }),
    ])

    const { result } = renderHook(() => useOnlineUsersSocket())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    act(() => {
      emitSocketEvent(socketOnMock, onlineUserStatusChangedEventName, {
        id: 2,
        nickname: '로그아웃유저',
        status: 'offline',
      })
    })

    expect(result.current.data).toHaveLength(1)
    expect(result.current.data[0]).toMatchObject({
      id: '1',
      nickname: '남아있는유저',
      status: 'lobby',
    })
  })

  it('connect 이벤트 수신 시 최신 REST snapshot으로 다시 동기화한다', async () => {
    getOnlineUsersSnapshotMock.mockResolvedValueOnce([]).mockResolvedValueOnce([
      createOnlineUserPayloadFixture({
        id: 'user-2',
        nickname: 'Relogin',
        status: 'lobby',
      }),
    ])

    const { result } = renderHook(() => useOnlineUsersSocket())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.data).toEqual([])

    act(() => {
      emitSocketEvent(socketOnMock, 'connect', undefined)
    })

    await waitFor(() => {
      expect(result.current.data).toHaveLength(1)
    })

    expect(result.current.data[0]).toMatchObject({
      id: 'user-2',
      nickname: 'Relogin',
      status: 'lobby',
    })
  })

  it('disconnect 이벤트는 재연결 대기 상태로 취급하고 즉시 에러로 표시하지 않는다', async () => {
    getOnlineUsersSnapshotMock.mockResolvedValue([
      createOnlineUserPayloadFixture({
        id: 'user-4',
        nickname: 'WaitingRoom',
        status: 'in_room',
      }),
    ])

    const { result } = renderHook(() => useOnlineUsersSocket())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    act(() => {
      emitSocketEvent(socketOnMock, 'disconnect', undefined)
    })

    expect(result.current.isError).toBe(false)
    expect(result.current.isLoading).toBe(false)
    expect(result.current.data).toHaveLength(1)
  })

  it('connect_error 이벤트도 일시 재연결 경계로 취급하고 에러 문구를 띄우지 않는다', async () => {
    getOnlineUsersSnapshotMock.mockResolvedValue([])

    const { result } = renderHook(() => useOnlineUsersSocket())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    act(() => {
      emitSocketEvent(socketOnMock, 'connect_error', undefined)
    })

    expect(result.current.isError).toBe(false)
    expect(result.current.isLoading).toBe(false)
    expect(result.current.data).toEqual([])
  })

  it('refresh request 이벤트 수신 시 최신 REST snapshot으로 다시 동기화한다', async () => {
    getOnlineUsersSnapshotMock.mockResolvedValueOnce([]).mockResolvedValueOnce([
      createOnlineUserPayloadFixture({
        id: 'user-3',
        nickname: 'Waiting',
        status: 'in_room',
      }),
    ])

    const { result } = renderHook(() => useOnlineUsersSocket())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    act(() => {
      window.dispatchEvent(new Event(onlineUsersRefreshRequestEventName))
    })

    await waitFor(() => {
      expect(result.current.data).toHaveLength(1)
    })

    expect(result.current.data[0]).toMatchObject({
      id: 'user-3',
      nickname: 'Waiting',
      status: 'in_room',
    })
  })

  it('cleanup 시 구독 해제와 mock 브로드캐스트 정리를 수행한다', () => {
    isOnlineUsersSocketMockModeMock.mockReturnValue(true)

    const { unmount } = renderHook(() => useOnlineUsersSocket())

    expect(startOnlineUsersMockBroadcastMock).toHaveBeenCalledTimes(1)

    unmount()

    expect(stopMockBroadcastMock).toHaveBeenCalledTimes(1)
    expect(socketOffMock).toHaveBeenCalledWith(
      'online_users',
      expect.any(Function)
    )
    expect(socketOffMock).toHaveBeenCalledWith(
      onlineUserStatusChangedEventName,
      expect.any(Function)
    )
  })

  it('실소켓 모드 cleanup 시 connect 구독도 해제한다', () => {
    const { unmount } = renderHook(() => useOnlineUsersSocket())

    unmount()

    expect(socketOffMock).toHaveBeenCalledWith('connect', expect.any(Function))
  })
})
