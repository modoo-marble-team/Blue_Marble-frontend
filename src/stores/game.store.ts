import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type {
  ActiveModal,
  ChatMessage,
  GameAck,
  GameError,
  GamePatchEnvelope,
  GameResult,
  GameSnapshot,
  GameState,
  GameTimerSync,
  PendingGameAction,
  Player,
  PlayerId,
  ServerEvent,
  Tile,
} from '../types/domain'

interface GameActions {
  setGameState: (state: Partial<GameState>) => void
  updatePlayer: (playerId: PlayerId, updates: Partial<Player>) => void
  updateTile: (tileIndex: number, updates: Partial<Tile>) => void
  setCurrentTurn: (playerId: PlayerId | null) => void
  setModal: (modal: ActiveModal) => void
  setGameResult: (result: GameResult) => void
  addMessage: (message: ChatMessage) => void
  replaceFromSnapshot: (snapshot: GameSnapshot) => void
  applyPatchEnvelope: (envelope: GamePatchEnvelope) => void
  applyTimerSync: (timerSync: GameTimerSync) => void
  setPendingAction: (action: PendingGameAction | null) => void
  resolveAck: (ack: GameAck) => void
  setPrompt: (prompt: GameState['prompt']) => void
  clearPrompt: (promptId?: string) => void
  enqueueEvents: (events: ServerEvent[]) => void
  consumeNextEvent: () => ServerEvent | null
  setLastError: (error: GameError | null) => void
  resetGame: () => void
}

type GameStoreState = GameState & GameActions

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const ARRAY_PATH_IDENTITY_KEYS = ['id', 'index', 'tileId', 'tile_id'] as const

const normalizeTile = (tile: Tile): Tile => {
  const ownerId =
    tile.ownerId !== undefined ? tile.ownerId : (tile.owner_id ?? null)

  return {
    ...tile,
    ownerId,
    owner_id: ownerId,
  }
}

const normalizePlayer = (player: Player): Player => ({
  ...player,
  state:
    player.state ??
    (player.is_bankrupt ? 'bankrupt' : player.is_in_jail ? 'island' : 'normal'),
})

const normalizeState = (state: Partial<GameState>): Partial<GameState> => {
  const normalizedState: Partial<GameState> = { ...state }

  if ('currentPlayerId' in state || 'currentTurn' in state) {
    const canonicalCurrentPlayerId =
      state.currentPlayerId !== undefined
        ? state.currentPlayerId
        : (state.currentTurn ?? null)

    normalizedState.currentPlayerId = canonicalCurrentPlayerId
    normalizedState.currentTurn = canonicalCurrentPlayerId
  }

  if ('tiles' in state) {
    normalizedState.tiles = state.tiles?.map(normalizeTile) ?? []
  }

  if ('players' in state) {
    normalizedState.players = state.players?.map(normalizePlayer) ?? []
  }

  if ('prompt' in state) {
    normalizedState.prompt = state.prompt ?? null
  }

  if ('pendingAction' in state) {
    normalizedState.pendingAction = state.pendingAction ?? null
  }

  if ('lastAck' in state) {
    normalizedState.lastAck = state.lastAck ?? null
  }

  if ('lastError' in state) {
    normalizedState.lastError = state.lastError ?? null
  }

  if ('eventQueue' in state) {
    normalizedState.eventQueue = state.eventQueue ?? []
  }

  return normalizedState
}

const toPathSegments = (
  path: string | Array<string | number>
): Array<string | number> => {
  if (Array.isArray(path)) {
    return path
  }

  return path
    .split('.')
    .map((segment) =>
      /^\d+$/.test(segment) ? Number.parseInt(segment, 10) : segment
    )
}

const resolveArraySegmentToIndex = (
  target: unknown[],
  segment: string | number
): number | null => {
  const segmentText = String(segment)
  const identityMatchedIndex = target.findIndex((item) => {
    if (!isRecord(item)) {
      return false
    }

    return ARRAY_PATH_IDENTITY_KEYS.some((key) => {
      const candidate = item[key]
      return candidate !== undefined && candidate !== null
        ? String(candidate) === segmentText
        : false
    })
  })

  if (identityMatchedIndex >= 0) {
    return identityMatchedIndex
  }

  const parsedIndex =
    typeof segment === 'number'
      ? segment
      : /^\d+$/.test(segment)
        ? Number.parseInt(segment, 10)
        : Number.NaN

  if (
    Number.isInteger(parsedIndex) &&
    parsedIndex >= 0 &&
    parsedIndex < target.length
  ) {
    return parsedIndex
  }

  return null
}

const getTargetContainer = (
  draft: Record<string, unknown>,
  path: Array<string | number>
) => {
  const parentPath = path.slice(0, -1)
  let cursor: unknown = draft

  for (const segment of parentPath) {
    if (Array.isArray(cursor)) {
      const arrayIndex = resolveArraySegmentToIndex(cursor, segment)
      if (arrayIndex == null) {
        return null
      }

      cursor = cursor[arrayIndex]
      continue
    }

    if (isRecord(cursor)) {
      cursor = cursor[String(segment)]
      continue
    }

    return null
  }

  return cursor
}

const setValueAtPath = (
  draft: Record<string, unknown>,
  path: Array<string | number>,
  value: unknown
) => {
  const target = getTargetContainer(draft, path)
  const key = path[path.length - 1]

  if (key === undefined || target === null) {
    return
  }

  if (Array.isArray(target)) {
    const arrayIndex = resolveArraySegmentToIndex(target, key)
    if (arrayIndex == null) {
      return
    }

    target[arrayIndex] = value
    return
  }

  if (isRecord(target)) {
    target[String(key)] = value
  }
}

const getValueAtPath = (
  draft: Record<string, unknown>,
  path: Array<string | number>
) => {
  let cursor: unknown = draft

  for (const segment of path) {
    if (Array.isArray(cursor)) {
      const arrayIndex = resolveArraySegmentToIndex(cursor, segment)
      if (arrayIndex == null) {
        return undefined
      }

      cursor = cursor[arrayIndex]
      continue
    }

    if (isRecord(cursor)) {
      cursor = cursor[String(segment)]
      continue
    }

    return undefined
  }

  return cursor
}

const removeValueAtPath = (
  draft: Record<string, unknown>,
  path: Array<string | number>,
  index?: number,
  value?: unknown
) => {
  const target = getValueAtPath(draft, path)

  if (Array.isArray(target)) {
    if (typeof index === 'number') {
      target.splice(index, 1)
      return
    }

    if (value !== undefined) {
      const matchedIndex = target.findIndex((item) => item === value)
      if (matchedIndex >= 0) {
        target.splice(matchedIndex, 1)
      }
    }
    return
  }

  const container = getTargetContainer(draft, path)
  const key = path[path.length - 1]

  if (key !== undefined && Array.isArray(container)) {
    const arrayIndex = resolveArraySegmentToIndex(container, key)
    if (arrayIndex != null) {
      container.splice(arrayIndex, 1)
    }
    return
  }

  if (key !== undefined && isRecord(container)) {
    delete container[String(key)]
  }
}

const INITIAL_STATE: GameState = {
  roomId: null,
  gameId: null,
  revision: 0,
  phase: 'waiting',
  players: [],
  tiles: [],
  messages: [],
  currentTurn: null,
  currentPlayerId: null,
  round: 1,
  turnTimeoutSec: 30,
  turnTimerKey: 0,
  activeModal: null,
  prompt: null,
  pendingAction: null,
  lastAck: null,
  lastError: null,
  eventQueue: [],
  session: {
    roomId: null,
    gameId: null,
    transport: null,
    syncedAt: null,
  },
  gameResult: null,
  isGameOver: false,
  winnerId: null,
}

export const useGameStore = create<GameStoreState>()(
  immer<GameStoreState>((set, get) => ({
    ...INITIAL_STATE,

    setGameState: (state) =>
      set((draft) => {
        Object.assign(draft, normalizeState(state))
      }),

    updatePlayer: (playerId, updates) =>
      set((draft) => {
        const player = draft.players.find(
          (p) => String(p.id) === String(playerId)
        )
        if (player) {
          Object.assign(player, updates)
          Object.assign(player, normalizePlayer(player))
        }
      }),

    updateTile: (tileIndex, updates) =>
      set((draft) => {
        const tile = draft.tiles.find((t) => t.index === tileIndex)
        if (tile) {
          Object.assign(tile, updates)
          Object.assign(tile, normalizeTile(tile))
        }
      }),

    setCurrentTurn: (playerId) =>
      set((draft) => {
        draft.currentTurn = playerId
        draft.currentPlayerId = playerId
      }),

    setModal: (modal) =>
      set((draft) => {
        draft.activeModal = modal
      }),

    setGameResult: (result) =>
      set((draft) => {
        draft.gameResult = result
      }),

    addMessage: (message) =>
      set((draft) => {
        draft.messages.push(message)
      }),

    replaceFromSnapshot: (snapshot) =>
      set((draft) => {
        Object.assign(draft, normalizeState(snapshot))
        if (!('prompt' in snapshot)) {
          draft.prompt = null
        }
        if (!('pendingAction' in snapshot)) {
          draft.pendingAction = null
        }
        draft.session.roomId = snapshot.roomId ?? draft.session.roomId
        draft.session.gameId = snapshot.gameId ?? draft.session.gameId
        draft.session.transport = 'event-socket'
        draft.session.syncedAt = new Date().toISOString()
        draft.turnTimerKey = Date.now()
      }),

    applyPatchEnvelope: (envelope) =>
      set((draft) => {
        const hasRevision = envelope.revision > 0
        if (hasRevision && envelope.revision < draft.revision) {
          return
        }

        for (const operation of envelope.patch) {
          const path = toPathSegments(operation.path)

          switch (operation.op) {
            case 'set':
              setValueAtPath(
                draft as unknown as Record<string, unknown>,
                path,
                operation.value
              )
              break
            case 'inc': {
              const currentValue = getValueAtPath(
                draft as unknown as Record<string, unknown>,
                path
              )
              if (typeof currentValue === 'number') {
                setValueAtPath(
                  draft as unknown as Record<string, unknown>,
                  path,
                  currentValue + operation.value
                )
              }
              break
            }
            case 'push': {
              const target = getValueAtPath(
                draft as unknown as Record<string, unknown>,
                path
              )
              if (Array.isArray(target)) {
                target.push(operation.value)
              }
              break
            }
            case 'remove':
              removeValueAtPath(
                draft as unknown as Record<string, unknown>,
                path,
                operation.index,
                operation.value
              )
              break
          }
        }

        if (hasRevision) {
          draft.revision = envelope.revision
        }
        draft.eventQueue.push(...(envelope.events ?? []))
        Object.assign(draft, normalizeState(draft))
      }),

    applyTimerSync: (timerSync) =>
      set((draft) => {
        const nowIso = new Date().toISOString()

        if (timerSync.gameId != null) {
          draft.gameId = timerSync.gameId
          draft.session.gameId = timerSync.gameId
        }

        if (typeof timerSync.turnRemainingSec === 'number') {
          const normalizedTurnRemainingSec = Math.max(
            0,
            Math.trunc(timerSync.turnRemainingSec)
          )
          draft.turnTimeoutSec = normalizedTurnRemainingSec
          draft.turnTimerKey = Date.now()
        }

        if (
          draft.prompt &&
          typeof timerSync.promptId === 'string' &&
          draft.prompt.id === timerSync.promptId &&
          typeof timerSync.promptRemainingSec === 'number'
        ) {
          draft.prompt.timeoutSec = Math.max(
            0,
            Math.trunc(timerSync.promptRemainingSec)
          )
        }

        draft.session.transport = 'event-socket'
        draft.session.syncedAt = timerSync.syncedAt ?? nowIso
      }),

    setPendingAction: (action) =>
      set((draft) => {
        draft.pendingAction = action
      }),

    resolveAck: (ack) =>
      set((draft) => {
        draft.lastAck = ack
        draft.lastError = ack.ok
          ? null
          : {
              code: ack.error?.code ?? 'GAME_ACTION_REJECTED',
              message: ack.error?.message ?? '게임 액션이 거부되었습니다.',
              actionId: ack.actionId,
            }

        if (draft.pendingAction?.actionId === ack.actionId) {
          draft.pendingAction = null
        }
      }),

    setPrompt: (prompt) =>
      set((draft) => {
        draft.prompt = prompt
        draft.phase = prompt ? 'prompt' : draft.phase
      }),

    clearPrompt: (promptId) =>
      set((draft) => {
        if (!draft.prompt) {
          return
        }

        if (promptId && draft.prompt.id !== promptId) {
          return
        }

        draft.prompt = null
      }),

    enqueueEvents: (events) =>
      set((draft) => {
        draft.eventQueue.push(...events)
      }),

    consumeNextEvent: (): ServerEvent | null => {
      const state = get()
      const nextEvent = state.eventQueue[0] ?? null

      if (!nextEvent) {
        return null
      }

      set((draft) => {
        draft.eventQueue.shift()
      })

      return nextEvent
    },

    setLastError: (error: GameError | null) =>
      set((draft) => {
        draft.lastError = error
      }),

    resetGame: () =>
      set((draft) => {
        Object.assign(draft, INITIAL_STATE)
      }),
  }))
)
