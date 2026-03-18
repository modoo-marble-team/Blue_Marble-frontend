import { afterEach, describe, expect, it, vi } from 'vitest'

interface MockSocket {
  auth: Record<string, unknown>
  connected: boolean
  connect: ReturnType<typeof vi.fn>
  disconnect: ReturnType<typeof vi.fn>
}

describe('socket helpers', () => {
  afterEach(() => {
    vi.resetModules()
    vi.unstubAllEnvs()
  })

  it('disconnectSocketAndClearAuth는 auth를 비우고 연결 중이면 disconnect한다', async () => {
    vi.resetModules()

    const socket: MockSocket = {
      auth: { token: 'session-token' },
      connected: true,
      connect: vi.fn(),
      disconnect: vi.fn(),
    }

    vi.doMock('socket.io-client', () => ({
      io: () => socket,
    }))

    const module = await import('./socket')

    module.disconnectSocketAndClearAuth()

    expect(socket.auth).toEqual({})
    expect(socket.disconnect).toHaveBeenCalledTimes(1)
  })

  it('reconnectSocketWithUpdatedAuthIfConnected는 연결 중이고 토큰이 바뀌면 재연결한다', async () => {
    vi.resetModules()

    const socket: MockSocket = {
      auth: { token: 'stale-token' },
      connected: true,
      connect: vi.fn(),
      disconnect: vi.fn(),
    }

    vi.doMock('socket.io-client', () => ({
      io: () => socket,
    }))
    vi.doMock('../features/auth/session/store', () => ({
      useAuthStore: {
        getState: () => ({
          session: {
            accessToken: 'fresh-token',
          },
        }),
      },
    }))

    const module = await import('./socket')

    module.reconnectSocketWithUpdatedAuthIfConnected()

    expect(socket.auth).toEqual({ token: 'fresh-token' })
    expect(socket.disconnect).toHaveBeenCalledTimes(1)
    expect(socket.connect).toHaveBeenCalledTimes(1)
  })

  it('reconnectSocketWithUpdatedAuthIfConnected는 미연결 상태에서 새 연결을 만들지 않는다', async () => {
    vi.resetModules()

    const socket: MockSocket = {
      auth: { token: 'stale-token' },
      connected: false,
      connect: vi.fn(),
      disconnect: vi.fn(),
    }

    vi.doMock('socket.io-client', () => ({
      io: () => socket,
    }))
    vi.doMock('../features/auth/session/store', () => ({
      useAuthStore: {
        getState: () => ({
          session: {
            accessToken: 'fresh-token',
          },
        }),
      },
    }))

    const module = await import('./socket')

    module.reconnectSocketWithUpdatedAuthIfConnected()

    expect(socket.auth).toEqual({ token: 'fresh-token' })
    expect(socket.disconnect).not.toHaveBeenCalled()
    expect(socket.connect).not.toHaveBeenCalled()
  })

  it('disconnectSocketAndClearAuth는 미연결 상태면 disconnect를 호출하지 않는다', async () => {
    vi.resetModules()

    const socket: MockSocket = {
      auth: { token: 'session-token' },
      connected: false,
      connect: vi.fn(),
      disconnect: vi.fn(),
    }

    vi.doMock('socket.io-client', () => ({
      io: () => socket,
    }))

    const module = await import('./socket')

    module.disconnectSocketAndClearAuth()

    expect(socket.auth).toEqual({})
    expect(socket.disconnect).not.toHaveBeenCalled()
  })
})
