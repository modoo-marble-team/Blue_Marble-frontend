import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

type SetupOptions = {
  accessToken: string | null
  mockEnabled?: boolean
  socketConnected?: boolean
  localGameId?: string | null
  currentTurn?: string | number | null
  revision?: number
  playersLength?: number
  tilesLength?: number
  phase?: 'waiting' | 'rolling' | 'moving' | 'resolving' | 'prompt' | 'finished'
  isGameOver?: boolean
}

const createPlayers = (length: number) =>
  Array.from({ length }, (_, index) => ({ id: `player-${index + 1}` }))

async function setupUseGameState(options: SetupOptions) {
  vi.resetModules()

  const runtime = {
    accessToken: options.accessToken,
    localGameId: options.localGameId ?? null,
    currentTurn: options.currentTurn ?? null,
    revision: options.revision ?? 0,
    playersLength: options.playersLength ?? 0,
    tilesLength: options.tilesLength ?? 0,
    phase: options.phase ?? 'rolling',
    isGameOver: options.isGameOver ?? false,
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
        phase: string
        isGameOver: boolean
      }) => unknown
    ) =>
      selector({
        currentPlayerId: runtime.currentTurn,
        currentTurn: runtime.currentTurn,
        phase: runtime.phase,
        isGameOver: runtime.isGameOver,
      })

    ;(
      useGameStore as typeof useGameStore & {
        getState: () => {
          gameId: string | null
          players: unknown[]
          tiles: unknown[]
          revision: number
          phase: string
          isGameOver: boolean
        }
      }
    ).getState = () => ({
      gameId: runtime.localGameId,
      players: createPlayers(runtime.playersLength),
      tiles: Array.from({ length: runtime.tilesLength }, (_, index) => ({
        index,
      })),
      revision: runtime.revision,
      phase: runtime.phase,
      isGameOver: runtime.isGameOver,
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

  it('소켓 reconnect 시 기존 local state가 있어도 current revision 기준으로 game sync를 재요청한다', async () => {
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
      localGameId: 'game-2',
      revision: 3,
      playersLength: 2,
      tilesLength: 2,
    })

    renderHook(() => useGameState('game-2'))

    expect(connectSocketWithAuthIfNeeded).toHaveBeenCalledTimes(1)
    expect(emitGameSync).toHaveBeenNthCalledWith(1, {
      gameId: 'game-2',
      knownRevision: -1,
    })
    expect(emitGameSyncTimer).toHaveBeenCalledTimes(1)

    const connectHandler = socketHandlers.get('connect')
    expect(connectHandler).toBeDefined()

    act(() => {
      connectHandler?.()
    })

    expect(emitGameSync).toHaveBeenCalledTimes(2)
    expect(emitGameSync).toHaveBeenNthCalledWith(2, {
      gameId: 'game-2',
      knownRevision: 3,
    })
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
      knownRevision: -1,
    })
    expect(emitGameSyncTimer).toHaveBeenCalledTimes(1)
  })

  it('게임 종료 상태면 sync와 timer sync를 시작하지 않는다', async () => {
    const {
      useGameState,
      setupGameHandlers,
      connectSocketWithAuthIfNeeded,
      emitGameSync,
      emitGameSyncTimer,
    } = await setupUseGameState({
      accessToken: 'token-over',
      mockEnabled: false,
      phase: 'finished',
      isGameOver: true,
    })

    renderHook(() => useGameState('game-over'))

    expect(setupGameHandlers).not.toHaveBeenCalled()
    expect(connectSocketWithAuthIfNeeded).not.toHaveBeenCalled()
    expect(emitGameSync).not.toHaveBeenCalled()
    expect(emitGameSyncTimer).not.toHaveBeenCalled()
  })

  it('게임 진행 중 종료되면 이후 reconnect/focus에서도 sync를 보내지 않는다', async () => {
    const {
      useGameState,
      runtime,
      socketHandlers,
      emitGameSync,
      emitGameSyncTimer,
    } = await setupUseGameState({
      accessToken: 'token-finish-during-game',
      mockEnabled: false,
      socketConnected: false,
    })

    const { rerender } = renderHook(() => useGameState('game-finished-later'))

    expect(emitGameSync).toHaveBeenCalledTimes(1)
    expect(emitGameSyncTimer).toHaveBeenCalledTimes(1)

    runtime.phase = 'finished'
    runtime.isGameOver = true
    rerender()

    const connectHandler = socketHandlers.get('connect')
    act(() => {
      connectHandler?.()
      window.dispatchEvent(new Event('focus'))
    })

    expect(emitGameSync).toHaveBeenCalledTimes(1)
    expect(emitGameSyncTimer).toHaveBeenCalledTimes(1)
  })

  it('local state가 다른 게임이면 full snapshot sync를 요청한다', async () => {
    const { useGameState, emitGameSync } = await setupUseGameState({
      accessToken: 'token-local-mismatch',
      mockEnabled: false,
      socketConnected: false,
      localGameId: 'game-old',
      revision: 9,
      playersLength: 4,
    })

    renderHook(() => useGameState('game-new'))

    expect(emitGameSync).toHaveBeenCalledWith({
      gameId: 'game-new',
      knownRevision: -1,
    })
  })
})
