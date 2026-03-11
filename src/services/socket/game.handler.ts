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
  GamePrompt,
  GamePromptResponse,
  GameSnapshot,
  PendingGameAction,
  GameId,
  GamePromptChoice,
} from '../../types/domain'

type Teardown = () => void

type SetupGameHandlersOptions = {
  gameId?: GameId | null
}

type GamePatchPayload = GamePatchEnvelope & {
  snapshot?: GameSnapshot
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

type PromptCompatPayload = Partial<GamePrompt> & {
  promptId?: string | null
  timeoutMs?: number | null
  payload?: Record<string, unknown>
}

let teardownGameHandlersRef: Teardown | null = null
const USE_GAME_SOCKET_MOCK = IS_SOCKET_MOCK_ENABLED

const createActionId = () => `game-action-${Date.now()}`

const PROMPT_ID_REQUIRED_ERROR: GameError = {
  code: 'INVALID_PROMPT',
  message: '유효한 promptId를 포함한 game:prompt payload가 필요합니다.',
}

const GAME_ID_REQUIRED_ERROR: GameError = {
  code: 'INVALID_GAME_ID',
  message: '게임 이벤트는 gameId를 필수로 전송해야 합니다.',
}

const PHASE_TO_INTERNAL_MAP: Record<string, GameSnapshot['phase']> = {
  WAIT_ROLL: 'rolling',
  MOVING: 'moving',
  RESOLVING: 'resolving',
  WAIT_PROMPT: 'prompt',
  TURN_END: 'resolving',
  GAME_OVER: 'finished',
}

const normalizePhase = (phase: unknown): GameSnapshot['phase'] => {
  if (typeof phase !== 'string') {
    return 'waiting'
  }

  const normalizedPhase = phase.trim().toUpperCase()
  return PHASE_TO_INTERNAL_MAP[normalizedPhase] ?? 'waiting'
}

const normalizePromptChoiceValue = (choice: unknown): string =>
  typeof choice === 'string' ? choice.trim().toUpperCase() : ''

const normalizePromptChoice = (
  choice: unknown,
  fallbackIndex: number
): GamePromptChoice | null => {
  if (!choice || typeof choice !== 'object') {
    return null
  }

  const candidate = choice as Partial<GamePromptChoice>
  const value = normalizePromptChoiceValue(candidate.value)
  if (!value) {
    return null
  }

  return {
    id:
      typeof candidate.id === 'string' && candidate.id.trim().length > 0
        ? candidate.id
        : `${value.toLowerCase()}-${fallbackIndex}`,
    label:
      typeof candidate.label === 'string' && candidate.label.trim().length > 0
        ? candidate.label
        : value,
    value,
    description:
      typeof candidate.description === 'string' &&
      candidate.description.trim().length > 0
        ? candidate.description
        : undefined,
  }
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

const normalizePromptPayload = (
  promptPayload: PromptCompatPayload
): GamePrompt | null => {
  const promptIdCandidate =
    (typeof promptPayload.promptId === 'string' && promptPayload.promptId) ||
    (typeof promptPayload.id === 'string' && promptPayload.id) ||
    null
  const promptId = promptIdCandidate?.trim()

  if (!promptId) {
    return null
  }

  const payloadRecord =
    promptPayload.payload && typeof promptPayload.payload === 'object'
      ? promptPayload.payload
      : undefined
  const timeoutSecFromPayload = toFiniteNumber(
    payloadRecord ? payloadRecord.timeoutSec : undefined
  )
  const timeoutMsFromPayload = toFiniteNumber(
    payloadRecord ? payloadRecord.timeoutMs : undefined
  )
  const timeoutSecDirect = toFiniteNumber(promptPayload.timeoutSec)
  const timeoutMsDirect = toFiniteNumber(promptPayload.timeoutMs)

  const timeoutSecRaw =
    timeoutSecDirect ??
    timeoutSecFromPayload ??
    (timeoutMsDirect != null
      ? Math.ceil(timeoutMsDirect / 1000)
      : timeoutMsFromPayload != null
        ? Math.ceil(timeoutMsFromPayload / 1000)
        : null)
  const timeoutSec =
    timeoutSecRaw != null && timeoutSecRaw > 0 ? timeoutSecRaw : undefined

  const normalizedChoices = Array.isArray(promptPayload.choices)
    ? promptPayload.choices
        .map((choice, index) => normalizePromptChoice(choice, index))
        .filter((choice): choice is GamePromptChoice => choice !== null)
    : undefined

  return {
    id: promptId,
    type:
      typeof promptPayload.type === 'string' && promptPayload.type.trim().length
        ? promptPayload.type
        : 'UNKNOWN_PROMPT',
    playerId:
      promptPayload.playerId === undefined
        ? null
        : (promptPayload.playerId ?? null),
    title:
      typeof promptPayload.title === 'string' &&
      promptPayload.title.trim().length > 0
        ? promptPayload.title
        : undefined,
    message:
      typeof promptPayload.message === 'string' &&
      promptPayload.message.trim().length > 0
        ? promptPayload.message
        : undefined,
    timeoutSec,
    choices: normalizedChoices,
    payload: payloadRecord,
  }
}

const normalizeSnapshotPayload = (snapshot: GameSnapshot): GameSnapshot => ({
  ...snapshot,
  phase: normalizePhase(snapshot.phase),
  prompt: snapshot.prompt ? normalizePromptPayload(snapshot.prompt) : null,
})

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

    if (payload.snapshot) {
      gameStore.replaceFromSnapshot(normalizeSnapshotPayload(payload.snapshot))
      return
    }

    gameStore.applyPatchEnvelope({
      revision: payload.revision,
      patch: payload.patch,
      events: payload.events,
    })
  }

  const handleGamePrompt = (promptPayload: PromptCompatPayload) => {
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
