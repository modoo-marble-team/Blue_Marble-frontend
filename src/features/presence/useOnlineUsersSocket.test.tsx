import { renderHook, waitFor, act } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useOnlineUsersSocket } from './useOnlineUsersSocket'
import type { OnlineUsersEventPayload } from './types'
import { createOnlineUserPayloadFixture } from '../../test/fixtures'
import {
  emitSocketEvent,
  getSocketEventHandler,
} from '../../test/socketEmitter'

const {
  socketOnMock,
  socketOffMock,
  getOnlineUsersSnapshotMock,
  normalizeOnlineUsersPayloadMock,
  isOnlineUsersSocketMockModeMock,
  startOnlineUsersMockBroadcastMock,
  stopMockBroadcastMock,
  ensureOnlineUsersSocketConnectionMock,
  onlineUsersRefreshRequestEventName,
} = vi.hoisted(() => ({
  socketOnMock: vi.fn(),
  socketOffMock: vi.fn(),
  getOnlineUsersSnapshotMock: vi.fn(),
  normalizeOnlineUsersPayloadMock: vi.fn((users) => users),
  isOnlineUsersSocketMockModeMock: vi.fn(),
  startOnlineUsersMockBroadcastMock: vi.fn(),
  stopMockBroadcastMock: vi.fn(),
  ensureOnlineUsersSocketConnectionMock: vi.fn(),
  onlineUsersRefreshRequestEventName: 'online-users-refresh-request',
}))

vi.mock('../../lib/socket', () => ({
  socket: {
    on: socketOnMock,
    off: socketOffMock,
  },
}))

vi.mock('./api', () => ({
  getOnlineUsersSnapshot: getOnlineUsersSnapshotMock,
  normalizeOnlineUsersPayload: normalizeOnlineUsersPayloadMock,
}))

vi.mock('./onlineUsersSocket', () => ({
  ONLINE_USERS_EVENT_NAME: 'online_users',
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
  })

  it('실소켓 모드 cleanup 시 connect 구독도 해제한다', () => {
    const { unmount } = renderHook(() => useOnlineUsersSocket())

    unmount()

    expect(socketOffMock).toHaveBeenCalledWith('connect', expect.any(Function))
  })
})
