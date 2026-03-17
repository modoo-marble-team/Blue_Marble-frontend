import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

type SetupOptions = {
  mockEnabled: boolean
  socketConnected: boolean
}

async function setupUseDiceRoll(options: SetupOptions) {
  vi.resetModules()

  const emitGameAction = vi.fn()

  vi.doMock('../../config/env', () => ({
    IS_SOCKET_MOCK_ENABLED: options.mockEnabled,
  }))
  vi.doMock('../../lib/socket', () => ({
    socket: {
      connected: options.socketConnected,
    },
  }))
  vi.doMock('../../services/socket/game.handler', () => ({
    emitGameAction,
  }))

  const { useDiceRoll } = await import('./useDiceRoll')
  return {
    useDiceRoll,
    emitGameAction,
  }
}

describe('useDiceRoll', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('non-mock 모드에서 소켓 연결 시 game:action(ROLL_DICE)만 전송한다', async () => {
    const { useDiceRoll, emitGameAction } = await setupUseDiceRoll({
      mockEnabled: false,
      socketConnected: true,
    })
    const { result } = renderHook(() => useDiceRoll())

    act(() => {
      result.current('game-1')
    })

    expect(emitGameAction).toHaveBeenCalledWith({
      type: 'ROLL_DICE',
      gameId: 'game-1',
      payload: {
        diceId: 0,
      },
    })
  })

  it('non-mock 모드에서 소켓 미연결이면 아무 동작도 하지 않는다', async () => {
    const { useDiceRoll, emitGameAction } = await setupUseDiceRoll({
      mockEnabled: false,
      socketConnected: false,
    })
    const { result } = renderHook(() => useDiceRoll())

    act(() => {
      result.current('game-1')
    })

    expect(emitGameAction).not.toHaveBeenCalled()
  })

  it('non-mock 모드에서 currentTurn과 무관하게 소켓 연결 시 전송한다', async () => {
    const { useDiceRoll, emitGameAction } = await setupUseDiceRoll({
      mockEnabled: false,
      socketConnected: true,
    })
    const { result } = renderHook(() => useDiceRoll())

    act(() => {
      result.current('game-1')
    })

    expect(emitGameAction).toHaveBeenCalledWith({
      type: 'ROLL_DICE',
      gameId: 'game-1',
      payload: {
        diceId: 0,
      },
    })
  })

  it('mock 모드에서는 game:action(ROLL_DICE) 경로를 사용한다', async () => {
    const { useDiceRoll, emitGameAction } = await setupUseDiceRoll({
      mockEnabled: true,
      socketConnected: false,
    })
    const { result } = renderHook(() => useDiceRoll())

    act(() => {
      result.current('game-1')
    })

    expect(emitGameAction).toHaveBeenCalledWith({
      type: 'ROLL_DICE',
      gameId: 'game-1',
      payload: {
        diceId: 0,
      },
    })
  })

  it('gameId가 없으면 어떤 모드에서도 전송하지 않는다', async () => {
    const { useDiceRoll, emitGameAction } = await setupUseDiceRoll({
      mockEnabled: true,
      socketConnected: true,
    })
    const { result } = renderHook(() => useDiceRoll())

    act(() => {
      result.current(null)
    })

    expect(emitGameAction).not.toHaveBeenCalled()
  })
})
