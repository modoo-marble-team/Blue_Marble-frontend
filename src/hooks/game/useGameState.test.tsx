import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

type SetupOptions = {
  accessToken: string | null
  mockEnabled?: boolean
  socketConnected?: boolean
  localGameId?: string | null
  sessionGameId?: string | null
  sessionSyncedAt?: string | null
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
    sessionGameId: options.sessionGameId ?? options.localGameId ?? null,
    sessionSyncedAt: options.sessionSyncedAt ?? null,
    currentTurn: options.currentTurn ?? null,
    revision: options.revision ?? 0,
    playersLength: options.playersLength ?? 0,
    tilesLength: options.tilesLength ?? 0,
    phase: options.phase ?? 'rolling',
    isGameOver: options.isGameOver ?? false,
  }

  const socketHandlers = new Map<string, (...args: unknown[]) => void>()
  const connectSocketWithAuthIfNeeded = vi.fn()
  const socketDisconnectMock = vi.fn()
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
      disconnect: socketDisconnectMock,
    },
    connectSocketWithAuthIfNeeded,
  }))
  vi.doMock('../../services/socket/game.handler', () => ({
    setupGameHandlers,
    emitGameSync,
    emitGameSyncTimer,
  }))
  vi.doMock('../../stores/game.store', () => {
    const buildState = () => ({
      currentPlayerId: runtime.currentTurn,
      currentTurn: runtime.currentTurn,
      phase: runtime.phase,
      isGameOver: runtime.isGameOver,
      gameId: runtime.localGameId,
      players: createPlayers(runtime.playersLength),
      session: {
        roomId: 'room-1',
        gameId: runtime.sessionGameId,
        transport: 'event-socket',
        syncedAt: runtime.sessionSyncedAt,
      },
    })

    const useGameStore = (
      selector: (state: ReturnType<typeof buildState>) => unknown
    ) => selector(buildState())

    ;(
      useGameStore as typeof useGameStore & {
        getState: () => {
          gameId: string | null
          players: unknown[]
          tiles: unknown[]
          revision: number
          phase: string
          isGameOver: boolean
          session: {
            roomId: string | null
            gameId: string | null
            transport: string | null
            syncedAt: string | null
          }
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
      session: {
        roomId: 'room-1',
        gameId: runtime.sessionGameId,
        transport: 'event-socket',
        syncedAt: runtime.sessionSyncedAt,
      },
    })

    return { useGameStore }
  })

  const { useGameState } = await import('./useGameState')

  return {
    useGameState,
    runtime,
    socketHandlers,
    socketDisconnectMock,
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

  it('reconnect 시에는 local state 유무와 무관하게 full sync를 재요청한다', async () => {
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
      sessionGameId: 'game-2',
      sessionSyncedAt: '2026-04-09T00:00:00.000Z',
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
      knownRevision: -1,
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
      tilesLength: 4,
    })

    renderHook(() => useGameState('game-new'))

    expect(emitGameSync).toHaveBeenCalledWith({
      gameId: 'game-new',
      knownRevision: -1,
    })
  })

  it('mock 모드에서 초기 동기화 전에는 isInitialSyncPending=true를 반환한다', async () => {
    const { useGameState, runtime, socketDisconnectMock } =
      await setupUseGameState({
        accessToken: null,
        mockEnabled: true,
        localGameId: null,
        sessionGameId: null,
        sessionSyncedAt: null,
        playersLength: 0,
        tilesLength: 0,
      })

    const { result, rerender } = renderHook(() => useGameState('game-mock'))

    expect(socketDisconnectMock).toHaveBeenCalledTimes(1)
    expect(result.current.isInitialSyncPending).toBe(true)

    runtime.localGameId = 'game-mock'
    runtime.sessionGameId = 'game-mock'
    runtime.sessionSyncedAt = '2026-04-09T00:00:00.000Z'
    runtime.playersLength = 2
    runtime.tilesLength = 2
    rerender()

    expect(result.current.isInitialSyncPending).toBe(false)
  })
})
