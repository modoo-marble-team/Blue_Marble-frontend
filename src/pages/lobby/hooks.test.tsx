import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useLobbyRoomsQuery } from './hooks'

const {
  useQueryMock,
  useQueryClientMock,
  invalidateQueriesMock,
  connectSocketWithAuthIfNeededMock,
  requestOnlineUsersSnapshotSyncMock,
  socketOnMock,
  socketOffMock,
  lobbyUpdatedHandlerRef,
} = vi.hoisted(() => ({
  useQueryMock: vi.fn(),
  useQueryClientMock: vi.fn(),
  invalidateQueriesMock: vi.fn(),
  connectSocketWithAuthIfNeededMock: vi.fn(),
  requestOnlineUsersSnapshotSyncMock: vi.fn(),
  socketOnMock: vi.fn(),
  socketOffMock: vi.fn(),
  lobbyUpdatedHandlerRef: {
    current: null as (() => void) | null,
  },
}))

vi.mock('@tanstack/react-query', () => ({
  useQuery: useQueryMock,
  useQueryClient: useQueryClientMock,
}))

vi.mock('../../lib/socket', () => ({
  connectSocketWithAuthIfNeeded: connectSocketWithAuthIfNeededMock,
  socket: {
    on: socketOnMock,
    off: socketOffMock,
  },
}))

vi.mock('../../features/presence/online-users/onlineUsersSocket', () => ({
  requestOnlineUsersSnapshotSync: requestOnlineUsersSnapshotSyncMock,
}))

describe('useLobbyRoomsQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    lobbyUpdatedHandlerRef.current = null

    useQueryClientMock.mockReturnValue({
      invalidateQueries: invalidateQueriesMock,
    })
    useQueryMock.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    })
    socketOnMock.mockImplementation(
      (eventName: string, handler: (() => void) | undefined) => {
        if (eventName === 'lobby_updated' && handler) {
          lobbyUpdatedHandlerRef.current = handler
        }
      }
    )
  })

  it('lobby_updated 수신 시 방 목록 invalidate와 presence snapshot refresh를 함께 요청한다', () => {
    renderHook(() =>
      useLobbyRoomsQuery({
        searchRoom: '',
        roomFilter: 'ALL',
        excludePrivateRoom: false,
      })
    )

    act(() => {
      lobbyUpdatedHandlerRef.current?.()
    })

    expect(invalidateQueriesMock).toHaveBeenCalledWith({
      queryKey: ['lobby', 'rooms'],
    })
    expect(requestOnlineUsersSnapshotSyncMock).toHaveBeenCalledWith({
      includeFollowUpRefresh: true,
    })
  })

  it('언마운트 시 lobby_updated 리스너를 해제한다', () => {
    const { unmount } = renderHook(() =>
      useLobbyRoomsQuery({
        searchRoom: '',
        roomFilter: 'ALL',
        excludePrivateRoom: false,
      })
    )

    const subscribedHandler = lobbyUpdatedHandlerRef.current
    unmount()

    expect(socketOffMock).toHaveBeenCalledWith(
      'lobby_updated',
      subscribedHandler
    )
  })
})
