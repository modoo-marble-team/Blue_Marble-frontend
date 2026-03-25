import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { OnlineUserPayload } from '../types'

interface MockSocket {
  connected: boolean
  listeners: ReturnType<typeof vi.fn>
}

interface LoadedOnlineUsersSocketModule {
  socket: MockSocket
  connectSocketWithAuthIfNeededMock: ReturnType<typeof vi.fn>
  getMockOnlineUsersSnapshotMock: ReturnType<typeof vi.fn>
  subscribeMockOnlineUsersChangeMock: ReturnType<typeof vi.fn>
  listenerMock: ReturnType<typeof vi.fn>
  module: typeof import('./onlineUsersSocket')
}

// mock/real 환경에 따라 onlineUsersSocket 모듈을 새로 로드
async function loadOnlineUsersSocketModule(
  useSocketMock: boolean,
  isConnected = false,
  mockUsers: OnlineUserPayload[] = []
): Promise<LoadedOnlineUsersSocketModule> {
  vi.resetModules()
  vi.stubEnv('VITE_USE_SOCKET_MOCK', useSocketMock ? 'true' : 'false')

  const listenerMock = vi.fn()

  const socket: MockSocket = {
    connected: isConnected,
    listeners: vi.fn((eventName: string) => {
      if (eventName !== 'online_users') {
        return []
      }

      return [listenerMock]
    }),
  }

  const connectSocketWithAuthIfNeededMock = vi.fn(() => {
    socket.connected = true
  })
  const getMockOnlineUsersSnapshotMock = vi.fn(() =>
    mockUsers.map((user) => ({ ...user }))
  )
  const subscribeMockOnlineUsersChangeMock = vi.fn(
    (listener: (users: OnlineUserPayload[]) => void) => {
      void listener
      return vi.fn()
    }
  )

  vi.doMock('../../../lib/socket', () => ({
    socket,
    connectSocketWithAuthIfNeeded: connectSocketWithAuthIfNeededMock,
  }))

  vi.doMock('../mock/mockData', () => ({
    getMockOnlineUsersSnapshot: getMockOnlineUsersSnapshotMock,
    subscribeMockOnlineUsersChange: subscribeMockOnlineUsersChangeMock,
  }))

  const module = await import('./onlineUsersSocket')

  return {
    socket,
    connectSocketWithAuthIfNeededMock,
    getMockOnlineUsersSnapshotMock,
    subscribeMockOnlineUsersChangeMock,
    listenerMock,
    module,
  }
}

describe('onlineUsersSocket', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('VITE_USE_SOCKET_MOCK 값에 따라 mock 모드 여부를 반환한다', async () => {
    const { module: mockModeModule } = await loadOnlineUsersSocketModule(true)
    const { module: realModeModule } = await loadOnlineUsersSocketModule(false)

    expect(mockModeModule.isOnlineUsersSocketMockMode()).toBe(true)
    expect(realModeModule.isOnlineUsersSocketMockMode()).toBe(false)
  })

  it('emitMockOnlineUsersSnapshot은 online_users 리스너로 스냅샷을 전달한다', async () => {
    const users: OnlineUserPayload[] = [
      {
        id: 'user-1',
        nickname: '마블왕',
        status: 'lobby',
      },
    ]
    const { module, listenerMock, getMockOnlineUsersSnapshotMock, socket } =
      await loadOnlineUsersSocketModule(true, false, users)

    module.emitMockOnlineUsersSnapshot()

    expect(getMockOnlineUsersSnapshotMock).toHaveBeenCalledTimes(1)
    expect(socket.listeners).toHaveBeenCalledWith('online_users')
    expect(listenerMock).toHaveBeenCalledWith({
      users,
    })
  })

  it('startOnlineUsersMockBroadcast는 즉시 1회 + 주기 브로드캐스트 후 stop으로 정지된다', async () => {
    const users: OnlineUserPayload[] = [
      {
        id: 'user-1',
        nickname: '마블왕',
        status: 'lobby',
      },
    ]
    const { module, listenerMock, subscribeMockOnlineUsersChangeMock } =
      await loadOnlineUsersSocketModule(true, false, users)

    const stopBroadcast = module.startOnlineUsersMockBroadcast()

    // 시작 시 즉시 1회 브로드캐스트
    expect(listenerMock).toHaveBeenCalledTimes(1)
    expect(subscribeMockOnlineUsersChangeMock).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(5_000)
    expect(listenerMock).toHaveBeenCalledTimes(2)

    stopBroadcast()

    vi.advanceTimersByTime(5_000)
    expect(listenerMock).toHaveBeenCalledTimes(2)
  })

  it('ensureOnlineUsersSocketConnection은 연결 상태와 무관하게 auth 기준 재동기화를 시도한다', async () => {
    const disconnected = await loadOnlineUsersSocketModule(true, false)
    disconnected.module.ensureOnlineUsersSocketConnection()

    expect(
      disconnected.connectSocketWithAuthIfNeededMock
    ).toHaveBeenCalledTimes(1)

    const connected = await loadOnlineUsersSocketModule(true, true)
    connected.module.ensureOnlineUsersSocketConnection()

    expect(connected.connectSocketWithAuthIfNeededMock).toHaveBeenCalledTimes(1)
  })

  it('requestOnlineUsersSnapshotSync는 즉시 refresh 요청을 보내고 mock 모드에서는 스냅샷도 즉시 브로드캐스트한다', async () => {
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener')
    const dispatchEventSpy = vi.spyOn(window, 'dispatchEvent')
    const mockListener = vi.fn()
    window.addEventListener('online-users-refresh-request', mockListener)

    const { module, listenerMock } = await loadOnlineUsersSocketModule(
      true,
      false,
      [
        {
          id: 'user-1',
          nickname: '마블왕',
          status: 'in_room',
        },
      ]
    )

    module.requestOnlineUsersSnapshotSync()

    expect(dispatchEventSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'online-users-refresh-request',
      })
    )
    expect(listenerMock).toHaveBeenCalledTimes(1)

    window.removeEventListener('online-users-refresh-request', mockListener)
    addEventListenerSpy.mockRestore()
    dispatchEventSpy.mockRestore()
  })

  it('requestOnlineUsersSnapshotSync는 follow-up 옵션이 있으면 짧은 지연 뒤 한 번 더 요청한다', async () => {
    const dispatchEventSpy = vi.spyOn(window, 'dispatchEvent')
    const { module, listenerMock } = await loadOnlineUsersSocketModule(
      true,
      false,
      [
        {
          id: 'user-1',
          nickname: '마블왕',
          status: 'lobby',
        },
      ]
    )

    module.requestOnlineUsersSnapshotSync({
      includeFollowUpRefresh: true,
    })

    expect(dispatchEventSpy).toHaveBeenCalledTimes(1)
    expect(listenerMock).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(400)

    expect(dispatchEventSpy).toHaveBeenCalledTimes(2)
    expect(listenerMock).toHaveBeenCalledTimes(2)

    dispatchEventSpy.mockRestore()
  })
})
