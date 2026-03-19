import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

type SetupOptions = {
  accessToken: string | null
  mockEnabled?: boolean
  socketConnected?: boolean
  currentTurn?: string | number | null
  revision?: number
  playersLength?: number
}

const createPlayers = (length: number) =>
  Array.from({ length }, (_, index) => ({ id: `player-${index + 1}` }))

async function setupUseGameState(options: SetupOptions) {
  vi.resetModules()

  const runtime = {
    accessToken: options.accessToken,
    currentTurn: options.currentTurn ?? null,
    revision: options.revision ?? 0,
    playersLength: options.playersLength ?? 0,
  }

  const socketHandlers = new Map<string, (...args: unknown[]) => void>()
  const connectSocketWithAuthIfNeeded = vi.fn()
  const emitGameSync = vi.fn()
  const emitGameSyncTimer = vi.fn()
  const teardownHandlers = vi.fn()
  const setupGameHandlers = vi.fn(() => teardownHandlers)

  vi.doMock('../../config/env', () => ({
    IS_SOCKET_MOCK_ENABLED: options.mockEnabled ?? false,
  }))
  vi.doMock('../../features/auth/session/store', () => ({
    useAuthStore: (
      selector: (state: { session: { accessToken: string } | null }) => unknown
    ) =>
      selector({
        session: runtime.accessToken
          ? ({ accessToken: runtime.accessToken } as { accessToken: string })
          : null,
      }),
  }))
  vi.doMock('../../lib/socket', () => ({
    socket: {
      connected: options.socketConnected ?? false,
      on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
        socketHandlers.set(event, handler)
      }),
      off: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
        const registered = socketHandlers.get(event)
        if (registered === handler) {
          socketHandlers.delete(event)
        }
      }),
      disconnect: vi.fn(),
    },
    connectSocketWithAuthIfNeeded,
  }))
  vi.doMock('../../services/socket/game.handler', () => ({
    setupGameHandlers,
    emitGameSync,
    emitGameSyncTimer,
  }))
  vi.doMock('../../stores/game.store', () => {
    const useGameStore = (
      selector: (state: {
        currentPlayerId: string | number | null
        currentTurn: string | number | null
      }) => unknown
    ) =>
      selector({
        currentPlayerId: runtime.currentTurn,
        currentTurn: runtime.currentTurn,
      })

    ;(
      useGameStore as typeof useGameStore & {
        getState: () => { players: unknown[]; revision: number }
      }
    ).getState = () => ({
      players: createPlayers(runtime.playersLength),
      revision: runtime.revision,
    })

    return { useGameStore }
  })

  const { useGameState } = await import('./useGameState')

  return {
    useGameState,
    runtime,
    socketHandlers,
    connectSocketWithAuthIfNeeded,
    emitGameSync,
    emitGameSyncTimer,
    setupGameHandlers,
    teardownHandlers,
  }
}

describe('useGameState', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetModules()
  })

  it('real socket 모드에서 accessToken이 없으면 동기화를 시작하지 않는다', async () => {
    const {
      useGameState,
      connectSocketWithAuthIfNeeded,
      emitGameSync,
      emitGameSyncTimer,
      setupGameHandlers,
    } = await setupUseGameState({
      accessToken: null,
      mockEnabled: false,
    })

    renderHook(() => useGameState('game-1'))

    expect(setupGameHandlers).not.toHaveBeenCalled()
    expect(connectSocketWithAuthIfNeeded).not.toHaveBeenCalled()
    expect(emitGameSync).not.toHaveBeenCalled()
    expect(emitGameSyncTimer).not.toHaveBeenCalled()
  })

  it('소켓 connect 이벤트에서 game sync와 timer sync를 모두 재요청한다', async () => {
    const {
      useGameState,
      socketHandlers,
      connectSocketWithAuthIfNeeded,
      emitGameSync,
      emitGameSyncTimer,
    } = await setupUseGameState({
      accessToken: 'token-1',
      mockEnabled: false,
      socketConnected: false,
      revision: 3,
      playersLength: 0,
    })

    renderHook(() => useGameState('game-2'))

    expect(connectSocketWithAuthIfNeeded).toHaveBeenCalledTimes(1)
    expect(emitGameSync).toHaveBeenCalledWith({
      gameId: 'game-2',
      knownRevision: 0,
    })
    expect(emitGameSyncTimer).toHaveBeenCalledTimes(1)

    const connectHandler = socketHandlers.get('connect')
    expect(connectHandler).toBeDefined()

    act(() => {
      connectHandler?.()
    })

    expect(emitGameSync).toHaveBeenCalledTimes(2)
    expect(emitGameSyncTimer).toHaveBeenCalledTimes(2)
  })

  it('토큰 복구 후 rerender 시 지연된 초기 동기화를 시작한다', async () => {
    const {
      useGameState,
      runtime,
      connectSocketWithAuthIfNeeded,
      emitGameSync,
      emitGameSyncTimer,
    } = await setupUseGameState({
      accessToken: null,
      mockEnabled: false,
      socketConnected: false,
    })

    const { rerender } = renderHook(() => useGameState('game-3'))

    expect(connectSocketWithAuthIfNeeded).not.toHaveBeenCalled()
    expect(emitGameSync).not.toHaveBeenCalled()

    runtime.accessToken = 'restored-token'
    rerender()

    expect(connectSocketWithAuthIfNeeded).toHaveBeenCalledTimes(1)
    expect(emitGameSync).toHaveBeenCalledWith({
      gameId: 'game-3',
      knownRevision: 0,
    })
    expect(emitGameSyncTimer).toHaveBeenCalledTimes(1)
  })
})
