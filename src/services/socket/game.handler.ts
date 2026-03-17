import { IS_SOCKET_MOCK_ENABLED } from '../../config/env'
import { socket } from '../../lib/socket'
import {
  mockEmitGameAction,
  mockEmitGameSync,
  mockEmitPromptResponse,
} from '../../mocks/handlers/game.handler'
import { useGameStore } from '../../stores/game.store'
import type {
  GameAck,
  GameError,
  GamePatchEnvelope,
  GamePromptResponse,
  PendingGameAction,
  GameId,
} from '../../types/domain'
import {
  normalizePatchEnvelopePayload,
  normalizePromptChoiceValue,
  normalizePromptPayload,
  normalizeSnapshotPayload,
} from './gameContractAdapters'

type Teardown = () => void

type SetupGameHandlersOptions = {
  gameId?: GameId | null
}

type GamePatchPayload = {
  gameId?: GameId | null
  revision?: number
  turn?: number
  patch?: GamePatchEnvelope['patch']
  events?: GamePatchEnvelope['events']
  snapshot?: unknown
}

type GameActionPayload = {
  actionId?: string
  type: string
  gameId?: GameId | null
  payload?: Record<string, unknown>
}

type GameSyncPayload = {
  gameId?: GameId | null
  knownRevision?: number
}

type PromptResponsePayload = GamePromptResponse & {
  gameId?: GameId | null
}

let teardownGameHandlersRef: Teardown | null = null
const USE_GAME_SOCKET_MOCK = IS_SOCKET_MOCK_ENABLED

const createActionId = () => `game-action-${Date.now()}`

const PROMPT_ID_REQUIRED_ERROR: GameError = {
  code: 'INVALID_PROMPT',
  message: 'game:prompt payload must include promptId.',
}

const GAME_ID_REQUIRED_ERROR: GameError = {
  code: 'INVALID_GAME_ID',
  message: 'Game events must include a valid gameId.',
}

const toFiniteNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number.parseFloat(value)
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }

  return null
}

const getResolvedGameId = (gameId?: GameId | null): GameId | null => {
  const gameStore = useGameStore.getState()
  return gameId ?? gameStore.gameId ?? gameStore.session.gameId ?? null
}

const createPendingAction = (
  action: Required<Pick<GameActionPayload, 'actionId' | 'type'>> &
    Pick<GameActionPayload, 'payload'>
): PendingGameAction => ({
  actionId: action.actionId,
  type: action.type,
  requestedAt: Date.now(),
  payload: action.payload,
})

export const setupGameHandlers = (
  options: SetupGameHandlersOptions = {}
): Teardown => {
  teardownGameHandlersRef?.()

  const handleGameAck = (ack: GameAck) => {
    const gameStore = useGameStore.getState()
    gameStore.resolveAck(ack)

    if (typeof ack.revision === 'number' && ack.revision > gameStore.revision) {
      gameStore.setGameState({ revision: ack.revision })
    }
  }

  const handleGamePatch = (payload: GamePatchPayload) => {
    const gameStore = useGameStore.getState()
    const revision = toFiniteNumber(payload.revision) ?? 0
    const turn = toFiniteNumber(payload.turn) ?? undefined
    const normalizedPatchEnvelope = normalizePatchEnvelopePayload({
      gameId: typeof payload.gameId === 'string' ? payload.gameId : undefined,
      revision,
      turn,
      patch: Array.isArray(payload.patch) ? payload.patch : [],
      events: Array.isArray(payload.events) ? payload.events : [],
    })

    if (payload.snapshot) {
      const normalizedSnapshot = normalizeSnapshotPayload(payload.snapshot, {
        envelopeRevision: normalizedPatchEnvelope.revision,
        envelopeGameId:
          typeof payload.gameId === 'string' ? payload.gameId : undefined,
      })

      if (!normalizedSnapshot) {
        gameStore.setLastError({
          code: 'INVALID_SNAPSHOT',
          message: 'Received game:patch snapshot payload is invalid.',
        })
        return
      }

      gameStore.replaceFromSnapshot(normalizedSnapshot)
      const normalizedEvents = normalizedPatchEnvelope.events ?? []
      if (normalizedEvents.length > 0) {
        gameStore.enqueueEvents(normalizedEvents)
      }
      return
    }

    gameStore.applyPatchEnvelope(normalizedPatchEnvelope)
  }

  const handleGamePrompt = (promptPayload: unknown) => {
    const normalizedPrompt = normalizePromptPayload(promptPayload)
    if (!normalizedPrompt) {
      useGameStore.getState().setLastError(PROMPT_ID_REQUIRED_ERROR)
      return
    }

    useGameStore.getState().setPrompt(normalizedPrompt)
  }

  const handleGameError = (error: GameError) => {
    useGameStore.getState().setLastError(error)
  }

  socket.on('game:ack', handleGameAck)
  socket.on('game:patch', handleGamePatch)
  socket.on('game:prompt', handleGamePrompt)
  socket.on('game:error', handleGameError)

  const teardown = () => {
    socket.off('game:ack', handleGameAck)
    socket.off('game:patch', handleGamePatch)
    socket.off('game:prompt', handleGamePrompt)
    socket.off('game:error', handleGameError)
  }

  teardownGameHandlersRef = teardown

  if (options.gameId) {
    const gameStore = useGameStore.getState()
    gameStore.setGameState({
      gameId: options.gameId ?? gameStore.gameId,
      session: {
        ...gameStore.session,
        gameId: options.gameId ?? gameStore.session.gameId,
        transport: 'event-socket',
      },
    })
  }

  return teardown
}

export const emitGameAction = ({
  actionId = createActionId(),
  type,
  gameId,
  payload,
}: GameActionPayload) => {
  const gameStore = useGameStore.getState()
  const resolvedGameId = getResolvedGameId(gameId)

  if (!resolvedGameId) {
    gameStore.setLastError(GAME_ID_REQUIRED_ERROR)
    return null
  }

  gameStore.setPendingAction(
    createPendingAction({
      actionId,
      type,
      payload,
    })
  )

  if (USE_GAME_SOCKET_MOCK) {
    mockEmitGameAction({
      actionId,
      type,
      gameId: resolvedGameId,
      payload,
    })
    return actionId
  }

  socket.emit('game:action', {
    actionId,
    type,
    gameId: resolvedGameId,
    payload,
  })

  return actionId
}

export const emitGameSync = ({ gameId, knownRevision }: GameSyncPayload) => {
  const resolvedGameId = getResolvedGameId(gameId)
  if (!resolvedGameId) {
    useGameStore.getState().setLastError(GAME_ID_REQUIRED_ERROR)
    return
  }

  if (USE_GAME_SOCKET_MOCK) {
    mockEmitGameSync({
      gameId: resolvedGameId,
      knownRevision,
    })
    return
  }

  socket.emit('game:sync', {
    gameId: resolvedGameId,
    knownRevision,
  })
}

export const emitPromptResponse = ({
  promptId,
  choice,
  gameId,
}: PromptResponsePayload) => {
  const resolvedGameId = getResolvedGameId(gameId)
  if (!resolvedGameId) {
    useGameStore.getState().setLastError(GAME_ID_REQUIRED_ERROR)
    return
  }

  const normalizedChoice = normalizePromptChoiceValue(choice)
  if (!promptId || !normalizedChoice) {
    useGameStore.getState().setLastError(PROMPT_ID_REQUIRED_ERROR)
    return
  }

  if (USE_GAME_SOCKET_MOCK) {
    mockEmitPromptResponse({
      gameId: resolvedGameId,
      promptId,
      choice: normalizedChoice,
    })
    return
  }

  socket.emit('game:prompt_response', {
    gameId: resolvedGameId,
    promptId,
    choice: normalizedChoice,
  })
}
