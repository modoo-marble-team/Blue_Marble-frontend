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
  RoomId,
  GameId,
} from '../../types/domain'

type Teardown = () => void

type SetupGameHandlersOptions = {
  roomId?: RoomId | null
  gameId?: GameId | null
}

type GamePatchPayload = GamePatchEnvelope & {
  snapshot?: GameSnapshot
}

type GameActionPayload = {
  actionId?: string
  type: string
  roomId?: RoomId | null
  gameId?: GameId | null
  payload?: Record<string, unknown>
}

type GameSyncPayload = {
  roomId?: RoomId | null
  gameId?: GameId | null
  knownRevision?: number
}

type PromptResponsePayload = GamePromptResponse & {
  roomId?: RoomId | null
  gameId?: GameId | null
}

let teardownGameHandlersRef: Teardown | null = null
const USE_GAME_SOCKET_MOCK = IS_SOCKET_MOCK_ENABLED

const createActionId = () => `game-action-${Date.now()}`

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
      gameStore.replaceFromSnapshot(payload.snapshot)
      return
    }

    gameStore.applyPatchEnvelope({
      revision: payload.revision,
      patch: payload.patch,
      events: payload.events,
    })
  }

  const handleGamePrompt = (prompt: GamePrompt) => {
    useGameStore.getState().setPrompt(prompt)
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

  if (options.roomId || options.gameId) {
    const gameStore = useGameStore.getState()
    gameStore.setGameState({
      roomId: options.roomId ?? gameStore.roomId,
      gameId: options.gameId ?? gameStore.gameId,
      session: {
        ...gameStore.session,
        roomId: options.roomId ?? gameStore.session.roomId,
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
  roomId,
  gameId,
  payload,
}: GameActionPayload) => {
  const gameStore = useGameStore.getState()

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
      roomId,
      gameId,
      payload,
    })
    return actionId
  }

  socket.emit('game:action', {
    actionId,
    type,
    roomId,
    gameId,
    payload,
  })

  return actionId
}

export const emitGameSync = ({
  roomId,
  gameId,
  knownRevision,
}: GameSyncPayload) => {
  if (USE_GAME_SOCKET_MOCK) {
    mockEmitGameSync({
      roomId,
      gameId,
      knownRevision,
    })
    return
  }

  socket.emit('game:sync', {
    gameId,
    knownRevision,
  })
}

export const emitPromptResponse = ({
  promptId,
  choice,
  gameId,
}: PromptResponsePayload) => {
  if (USE_GAME_SOCKET_MOCK) {
    mockEmitPromptResponse({
      promptId,
      choice,
    })
    return
  }

  socket.emit('game:prompt_response', {
    gameId,
    promptId,
    choice,
  })
}

// Deprecated compatibility wrapper until all callers move to emitGameAction.
export const emitRollDice = (payload: { room_id: string }) => {
  emitGameAction({
    type: 'ROLL_DICE',
    roomId: payload.room_id,
  })
}
