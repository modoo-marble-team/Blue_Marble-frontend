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
