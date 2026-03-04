import { socket } from '../../lib/socket'
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
  reset?: boolean
}

type PromptResponsePayload = GamePromptResponse & {
  roomId?: RoomId | null
  gameId?: GameId | null
}

let teardownGameHandlersRef: Teardown | null = null

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

  socket.emit('game:action', {
    actionId,
    type,
    roomId,
    gameId,
    payload,
  })

  return actionId
}

export const emitGameSync = ({ roomId, gameId, reset }: GameSyncPayload) => {
  socket.emit('game:sync', {
    roomId,
    gameId,
    reset,
  })
}

export const emitPromptResponse = ({
  promptId,
  playerId,
  value,
  roomId,
  gameId,
}: PromptResponsePayload) => {
  socket.emit('game:prompt_response', {
    promptId,
    playerId,
    value,
    roomId,
    gameId,
  })
}

// Deprecated compatibility wrapper until all callers move to emitGameAction.
export const emitRollDice = (payload: { room_id: string }) => {
  emitGameAction({
    type: 'ROLL_DICE',
    roomId: payload.room_id,
  })
}

// Deprecated compatibility wrapper until board prompt flow is migrated.
export const emitConfirmPenalty = (payload: {
  room_id: string
  player_id: string
}) => {
  emitPromptResponse({
    promptId: 'legacy-penalty-confirm',
    playerId: payload.player_id,
    value: 'confirm',
    roomId: payload.room_id,
  })
}
