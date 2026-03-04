import { delay, http, HttpResponse } from 'msw'
import { socket } from '../../lib/socket'
import type {
  BuildingLevel,
  GameAck,
  GameError,
  GamePatchEnvelope,
  GamePrompt,
  GamePromptResponse,
  GameSnapshot,
  Player,
  PlayerId,
  Tile,
} from '../../types/domain'
import { mockMessages, mockPlayers, mockTiles } from '../gameMockData'

const MOCK_PLAYER_ID = 'mock-player-1'
const MOCK_BUILD_COST = 30
const MOCK_PASS_GO_SALARY = 200
const MOCK_TURN_TIMEOUT_SEC = 30

type DiceRequestBody = {
  player_id: string
}

type TileActionRequestBody = {
  tile_index: number
  level?: number
}

type SocketWithListeners = {
  listeners: (name: string) => Array<(eventPayload: unknown) => void>
}

type GameStateResponse = {
  players: Player[]
  tiles: Tile[]
  messages: typeof mockMessages
  currentTurn: PlayerId
  round: number
  revision: number
  phase: GameSnapshot['phase']
  prompt: GamePrompt | null
}

type MockGameActionPayload = {
  actionId?: string
  type: string
  roomId?: string | null
  gameId?: string | null
  payload?: Record<string, unknown>
}

type MockGameSyncPayload = {
  roomId?: string | null
  gameId?: string | null
  reset?: boolean
}

const clonePlayers = () => structuredClone(mockPlayers)
const cloneTiles = () => structuredClone(mockTiles)
const cloneMessages = () => structuredClone(mockMessages)

const createInitialGameState = (): GameStateResponse => ({
  players: clonePlayers(),
  tiles: cloneTiles(),
  messages: cloneMessages(),
  currentTurn: MOCK_PLAYER_ID,
  round: 1,
  revision: 1,
  phase: 'waiting',
  prompt: null,
})

const mockGameState: GameStateResponse = createInitialGameState()

const resetMockGameState = () => {
  const initialState = createInitialGameState()
  mockGameState.players = initialState.players
  mockGameState.tiles = initialState.tiles
  mockGameState.messages = initialState.messages
  mockGameState.currentTurn = initialState.currentTurn
  mockGameState.round = initialState.round
  mockGameState.revision = initialState.revision
  mockGameState.phase = initialState.phase
  mockGameState.prompt = initialState.prompt
}

const getMockGameId = (roomId?: string | null, gameId?: string | null) =>
  gameId ?? (roomId ? `game-${roomId}` : 'game-mock-room')

const buildStateResponse = () => ({
  players: structuredClone(mockGameState.players),
  tiles: structuredClone(mockGameState.tiles),
  messages: structuredClone(mockGameState.messages),
  currentTurn: mockGameState.currentTurn,
  round: mockGameState.round,
  revision: mockGameState.revision,
})

const buildSnapshot = (
  roomId?: string | null,
  gameId?: string | null
): GameSnapshot => ({
  roomId: roomId ?? null,
  gameId: getMockGameId(roomId, gameId),
  revision: mockGameState.revision,
  phase: mockGameState.phase,
  players: structuredClone(mockGameState.players),
  tiles: structuredClone(mockGameState.tiles),
  currentPlayerId: mockGameState.currentTurn,
  currentTurn: mockGameState.currentTurn,
  round: mockGameState.round,
  turnTimeoutSec: MOCK_TURN_TIMEOUT_SEC,
  prompt: mockGameState.prompt,
  gameResult: null,
  isGameOver: false,
  winnerId: null,
})

const emitSocketEvent = (eventName: string, payload: unknown) => {
  const socketWithListeners = socket as unknown as SocketWithListeners

  socketWithListeners.listeners(eventName).forEach((listener) => {
    listener(payload)
  })
}

const emitLegacyGameState = () => {
  emitSocketEvent('game_state', {
    players: structuredClone(mockGameState.players),
    tiles: structuredClone(mockGameState.tiles),
    current_turn: mockGameState.currentTurn,
    round: mockGameState.round,
    timeout_sec: MOCK_TURN_TIMEOUT_SEC,
  })
}

const emitLegacyTurnStart = () => {
  emitSocketEvent('turn_start', {
    player_id: mockGameState.currentTurn,
    round: mockGameState.round,
    timeout_sec: MOCK_TURN_TIMEOUT_SEC,
  })
}

const emitGameAck = (ack: GameAck) => {
  emitSocketEvent('game:ack', ack)
}

const emitGamePatch = (
  payload: GamePatchEnvelope & { snapshot?: GameSnapshot }
) => {
  emitSocketEvent('game:patch', payload)
}

const emitGamePrompt = (prompt: GamePrompt) => {
  mockGameState.prompt = prompt
  emitSocketEvent('game:prompt', prompt)
}

const emitGameError = (error: GameError) => {
  emitSocketEvent('game:error', error)
}

const getCurrentPlayer = () =>
  mockGameState.players.find(
    (player) => String(player.id) === String(mockGameState.currentTurn)
  )

const getTileByIndex = (tileIndex: number) =>
  mockGameState.tiles.find((tile) => tile.index === tileIndex)

const isOwnableTile = (tile: Tile | undefined): tile is Tile =>
  !!tile && (tile.type === 'city' || tile.type === 'property')

const ensureOwnedTiles = (player: Player, tileIndex: number) => {
  if (!player.owned_tiles.includes(tileIndex)) {
    player.owned_tiles.push(tileIndex)
  }
}

const removeOwnedTile = (player: Player, tileIndex: number) => {
  player.owned_tiles = player.owned_tiles.filter(
    (ownedTile) => ownedTile !== tileIndex
  )
}

const getSellRefund = (tile: Tile, requestedLevel?: number) => {
  const sellLevel = requestedLevel ?? tile.building

  if (sellLevel > 0) {
    return {
      refund: MOCK_BUILD_COST,
      nextBuilding: Math.max(0, sellLevel - 1) as BuildingLevel,
      releaseOwnership: false,
    }
  }

  return {
    refund: tile.price ?? 0,
    nextBuilding: 0 as BuildingLevel,
    releaseOwnership: true,
  }
}

const getNextActivePlayerId = (currentPlayerId: PlayerId) => {
  const currentIndex = mockGameState.players.findIndex(
    (player) => String(player.id) === String(currentPlayerId)
  )

  if (currentIndex < 0) {
    return currentPlayerId
  }

  for (let step = 1; step <= mockGameState.players.length; step++) {
    const nextPlayer =
      mockGameState.players[
        (currentIndex + step) % mockGameState.players.length
      ]

    if (!nextPlayer.is_bankrupt) {
      return nextPlayer.id
    }
  }

  return currentPlayerId
}

const advanceMockTurn = () => {
  mockGameState.currentTurn = getNextActivePlayerId(mockGameState.currentTurn)
}

const nextRevision = () => {
  mockGameState.revision += 1
  return mockGameState.revision
}

const buildErrorResponse = (message: string, status: number) =>
  HttpResponse.json({ message }, { status })

const emitSnapshotPatch = (
  roomId?: string | null,
  gameId?: string | null,
  events?: GamePatchEnvelope['events']
) => {
  emitGamePatch({
    revision: mockGameState.revision,
    patch: [],
    events,
    snapshot: buildSnapshot(roomId, gameId),
  })
}

const handleRollDiceAction = (
  action: Required<Pick<MockGameActionPayload, 'type' | 'actionId'>> &
    Pick<MockGameActionPayload, 'roomId' | 'gameId'>
) => {
  const currentPlayer = getCurrentPlayer()

  if (!currentPlayer) {
    emitGameAck({
      actionId: action.actionId,
      type: action.type,
      ok: false,
      message: '현재 턴 플레이어를 찾을 수 없습니다.',
      errorCode: 'PLAYER_NOT_FOUND',
    })
    return
  }

  const dice1 = Math.floor(Math.random() * 6) + 1
  const dice2 = Math.floor(Math.random() * 6) + 1
  const total = dice1 + dice2
  const fromIndex = currentPlayer.position
  const toIndex = (fromIndex + total) % mockGameState.tiles.length
  const passGo = fromIndex + total >= mockGameState.tiles.length

  currentPlayer.position = toIndex
  if (passGo) {
    currentPlayer.balance += MOCK_PASS_GO_SALARY
  }

  advanceMockTurn()
  mockGameState.phase = 'rolling'
  const revision = nextRevision()

  emitGameAck({
    actionId: action.actionId,
    type: action.type,
    ok: true,
    revision,
  })

  emitSnapshotPatch(action.roomId, action.gameId, [
    {
      type: 'ROLL_DICE',
      playerId: currentPlayer.id,
      payload: {
        dice: [dice1, dice2],
        total,
      },
    },
    {
      type: 'MOVE_PLAYER',
      playerId: currentPlayer.id,
      tileIndex: toIndex,
      amount: passGo ? MOCK_PASS_GO_SALARY : undefined,
      payload: {
        fromIndex,
        toIndex,
        passGo,
      },
    },
  ])
}

const handleBuyPropertyAction = (
  action: Required<Pick<MockGameActionPayload, 'type' | 'actionId'>> &
    Pick<MockGameActionPayload, 'roomId' | 'gameId' | 'payload'>
) => {
  const tileIndex = Number(action.payload?.tile_index)
  const player = getCurrentPlayer()
  const tile = getTileByIndex(tileIndex)

  if (!player || !isOwnableTile(tile)) {
    emitGameAck({
      actionId: action.actionId,
      type: action.type,
      ok: false,
      message: '구매할 수 없는 타일입니다.',
      errorCode: 'TILE_NOT_OWNABLE',
    })
    return
  }

  if (tile.owner_id) {
    emitGameAck({
      actionId: action.actionId,
      type: action.type,
      ok: false,
      message: '이미 소유된 타일입니다.',
      errorCode: 'TILE_ALREADY_OWNED',
    })
    return
  }

  const price = tile.price ?? 0
  if (player.balance < price) {
    emitGameAck({
      actionId: action.actionId,
      type: action.type,
      ok: false,
      message: '보유 금액이 부족합니다.',
      errorCode: 'INSUFFICIENT_BALANCE',
    })
    return
  }

  player.balance -= price
  tile.owner_id = player.id
  tile.ownerId = player.id
  tile.building = 0
  ensureOwnedTiles(player, tileIndex)
  const revision = nextRevision()

  emitGameAck({
    actionId: action.actionId,
    type: action.type,
    ok: true,
    revision,
  })

  emitSnapshotPatch(action.roomId, action.gameId, [
    {
      type: 'BUY_PROPERTY',
      playerId: player.id,
      tileIndex,
      amount: price,
    },
  ])
}

const handleBuildPropertyAction = (
  action: Required<Pick<MockGameActionPayload, 'type' | 'actionId'>> &
    Pick<MockGameActionPayload, 'roomId' | 'gameId' | 'payload'>
) => {
  const tileIndex = Number(action.payload?.tile_index)
  const player = getCurrentPlayer()
  const tile = getTileByIndex(tileIndex)

  if (!player || !isOwnableTile(tile)) {
    emitGameAck({
      actionId: action.actionId,
      type: action.type,
      ok: false,
      message: '건설할 수 없는 타일입니다.',
      errorCode: 'TILE_NOT_BUILDABLE',
    })
    return
  }

  if (String(tile.owner_id) !== String(player.id)) {
    emitGameAck({
      actionId: action.actionId,
      type: action.type,
      ok: false,
      message: '본인 소유 타일만 건설할 수 있습니다.',
      errorCode: 'FORBIDDEN_BUILD',
    })
    return
  }

  if (tile.building >= 5) {
    emitGameAck({
      actionId: action.actionId,
      type: action.type,
      ok: false,
      message: '최대 단계까지 건설했습니다.',
      errorCode: 'MAX_BUILDING_LEVEL',
    })
    return
  }

  if (player.balance < MOCK_BUILD_COST) {
    emitGameAck({
      actionId: action.actionId,
      type: action.type,
      ok: false,
      message: '건설 비용이 부족합니다.',
      errorCode: 'INSUFFICIENT_BALANCE',
    })
    return
  }

  player.balance -= MOCK_BUILD_COST
  tile.building = (tile.building + 1) as BuildingLevel
  const revision = nextRevision()

  emitGameAck({
    actionId: action.actionId,
    type: action.type,
    ok: true,
    revision,
  })

  emitSnapshotPatch(action.roomId, action.gameId, [
    {
      type: 'BUILD_PROPERTY',
      playerId: player.id,
      tileIndex,
      amount: MOCK_BUILD_COST,
      payload: { buildingLevel: tile.building },
    },
  ])
}

const handleSellPropertyAction = (
  action: Required<Pick<MockGameActionPayload, 'type' | 'actionId'>> &
    Pick<MockGameActionPayload, 'roomId' | 'gameId' | 'payload'>
) => {
  const tileIndex = Number(action.payload?.tile_index)
  const level =
    typeof action.payload?.level === 'number' ? action.payload.level : undefined
  const player = getCurrentPlayer()
  const tile = getTileByIndex(tileIndex)

  if (!player || !isOwnableTile(tile)) {
    emitGameAck({
      actionId: action.actionId,
      type: action.type,
      ok: false,
      message: '매각할 수 없는 타일입니다.',
      errorCode: 'TILE_NOT_SELLABLE',
    })
    return
  }

  if (String(tile.owner_id) !== String(player.id)) {
    emitGameAck({
      actionId: action.actionId,
      type: action.type,
      ok: false,
      message: '본인 소유 타일만 매각할 수 있습니다.',
      errorCode: 'FORBIDDEN_SELL',
    })
    return
  }

  const { refund, nextBuilding, releaseOwnership } = getSellRefund(tile, level)
  player.balance += refund
  tile.building = nextBuilding

  if (releaseOwnership) {
    tile.owner_id = null
    tile.ownerId = null
    removeOwnedTile(player, tileIndex)
  }

  const revision = nextRevision()

  emitGameAck({
    actionId: action.actionId,
    type: action.type,
    ok: true,
    revision,
  })

  emitSnapshotPatch(action.roomId, action.gameId, [
    {
      type: 'SELL_PROPERTY',
      playerId: player.id,
      tileIndex,
      amount: refund,
      payload: {
        buildingLevel: tile.building,
        releaseOwnership,
      },
    },
  ])
}

export const mockEmitGameSync = ({
  roomId,
  gameId,
  reset,
}: MockGameSyncPayload) => {
  if (reset) {
    resetMockGameState()
  }

  setTimeout(() => {
    emitSnapshotPatch(roomId, gameId)
  }, 0)
}

export const mockEmitGameAction = ({
  actionId = `mock-action-${Date.now()}`,
  type,
  roomId,
  gameId,
  payload,
}: MockGameActionPayload) => {
  const action = {
    actionId,
    type,
    roomId,
    gameId,
    payload,
  }

  setTimeout(() => {
    switch (type) {
      case 'ROLL_DICE':
        handleRollDiceAction(action)
        break
      case 'BUY_PROPERTY':
        handleBuyPropertyAction(action)
        break
      case 'BUILD_PROPERTY':
        handleBuildPropertyAction(action)
        break
      case 'SELL_PROPERTY':
        handleSellPropertyAction(action)
        break
      case 'REQUEST_BUY_PROPERTY_PROMPT': {
        emitGamePrompt({
          id: `prompt-buy-${Date.now()}`,
          type: 'buy',
          playerId: mockGameState.currentTurn,
          title: '도시 구매',
          message: '이 도시를 구매하시겠습니까?',
          timeoutSec: MOCK_TURN_TIMEOUT_SEC,
          payload,
        })
        break
      }
      default:
        emitGameError({
          code: 'UNSUPPORTED_GAME_ACTION',
          message: `지원하지 않는 게임 액션입니다: ${type}`,
          actionId,
        })
        emitGameAck({
          actionId,
          type,
          ok: false,
          message: '지원하지 않는 게임 액션입니다.',
          errorCode: 'UNSUPPORTED_GAME_ACTION',
        })
    }
  }, 0)

  return actionId
}

export const mockEmitPromptResponse = (response: GamePromptResponse) => {
  if (mockGameState.prompt?.id !== response.promptId) {
    emitGameError({
      code: 'PROMPT_NOT_FOUND',
      message: '유효하지 않은 prompt 응답입니다.',
    })
    return
  }

  mockGameState.prompt = null
  const revision = nextRevision()

  emitGameAck({
    actionId: `prompt-response-${Date.now()}`,
    type: 'PROMPT_RESPONSE',
    ok: true,
    revision,
    promptId: response.promptId,
  })

  emitSnapshotPatch(undefined, undefined, [
    {
      type: 'PROMPT_RESPONSE',
      playerId: response.playerId,
      payload: { value: response.value },
    },
  ])
}

export const gameHandlers = [
  http.post('/api/game/:roomId/roll-dice', async ({ request }) => {
    const { player_id } = (await request.json()) as DiceRequestBody

    const dice1 = Math.floor(Math.random() * 6) + 1
    const dice2 = Math.floor(Math.random() * 6) + 1
    const isDouble = dice1 === dice2
    const total = dice1 + dice2

    setTimeout(() => {
      emitSocketEvent('dice_rolled', {
        player_id,
        dice: [dice1, dice2],
        is_double: isDouble,
        double_count: isDouble ? 1 : 0,
      })

      const currentPlayer = mockGameState.players.find(
        (player) => String(player.id) === String(player_id)
      )
      const fromIndex = currentPlayer?.position ?? 0
      const toIndex = (fromIndex + total) % mockGameState.tiles.length
      const passGo = fromIndex + total >= mockGameState.tiles.length

      if (currentPlayer) {
        currentPlayer.position = toIndex
        if (passGo) {
          currentPlayer.balance += MOCK_PASS_GO_SALARY
        }
      }

      setTimeout(() => {
        emitSocketEvent('player_moved', {
          player_id,
          from_index: fromIndex,
          to_index: toIndex,
          trigger: 'dice',
          pass_go: passGo,
          pass_go_salary: MOCK_PASS_GO_SALARY,
        })
        emitLegacyGameState()
      }, 800)
    }, 100)

    return HttpResponse.json({
      success: true,
      dice: [dice1, dice2],
    })
  }),

  http.get('/api/game/:roomId/state', async ({ request }) => {
    const url = new URL(request.url)
    if (url.searchParams.get('reset') === 'true') {
      resetMockGameState()
    }

    await delay(150)
    return HttpResponse.json(buildStateResponse())
  }),

  http.post('/api/game/:roomId/buy', async ({ request }) => {
    const { tile_index } = (await request.json()) as TileActionRequestBody
    const player = getCurrentPlayer()
    const tile = getTileByIndex(tile_index)

    if (!player || !isOwnableTile(tile)) {
      return buildErrorResponse(
        '\uAD6C\uB9E4\uD560 \uC218 \uC5C6\uB294 \uD0C0\uC77C\uC785\uB2C8\uB2E4.',
        404
      )
    }

    if (tile.owner_id) {
      return buildErrorResponse(
        '\uC774\uBBF8 \uC18C\uC720\uB41C \uD0C0\uC77C\uC785\uB2C8\uB2E4.',
        409
      )
    }

    const price = tile.price ?? 0
    if (player.balance < price) {
      return buildErrorResponse(
        '\uBCF4\uC720 \uAE08\uC561\uC774 \uBD80\uC871\uD569\uB2C8\uB2E4.',
        409
      )
    }

    player.balance -= price
    tile.owner_id = player.id
    tile.ownerId = player.id
    tile.building = 0
    ensureOwnedTiles(player, tile_index)
    advanceMockTurn()

    setTimeout(() => {
      emitSocketEvent('tile_purchased', {
        player_id: player.id,
        tile_index,
        tile_name: tile.name,
        price,
      })
      emitLegacyGameState()
      emitLegacyTurnStart()
    }, 0)

    await delay(150)
    return HttpResponse.json({
      success: true,
      tile_index,
      state: buildStateResponse(),
    })
  }),

  http.post('/api/game/:roomId/build', async ({ request }) => {
    const { tile_index } = (await request.json()) as TileActionRequestBody
    const player = getCurrentPlayer()
    const tile = getTileByIndex(tile_index)

    if (!player || !isOwnableTile(tile)) {
      return buildErrorResponse(
        '\uAC74\uC124\uD560 \uC218 \uC5C6\uB294 \uD0C0\uC77C\uC785\uB2C8\uB2E4.',
        404
      )
    }

    if (String(tile.owner_id) !== String(player.id)) {
      return buildErrorResponse(
        '\uBCF8\uC778 \uC18C\uC720 \uD0C0\uC77C\uB9CC \uAC74\uC124\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.',
        403
      )
    }

    if (tile.building >= 5) {
      return buildErrorResponse(
        '\uCD5C\uB300 \uB2E8\uACC4\uAE4C\uC9C0 \uAC74\uC124\uD588\uC2B5\uB2C8\uB2E4.',
        409
      )
    }

    if (player.balance < MOCK_BUILD_COST) {
      return buildErrorResponse(
        '\uAC74\uC124 \uBE44\uC6A9\uC774 \uBD80\uC871\uD569\uB2C8\uB2E4.',
        409
      )
    }

    player.balance -= MOCK_BUILD_COST
    tile.building = (tile.building + 1) as BuildingLevel
    advanceMockTurn()

    setTimeout(() => {
      emitLegacyGameState()
      emitLegacyTurnStart()
    }, 0)

    await delay(150)
    return HttpResponse.json({
      success: true,
      tile_index,
      building: tile.building,
      state: buildStateResponse(),
    })
  }),

  http.post('/api/game/:roomId/sell', async ({ request }) => {
    const { tile_index, level } =
      (await request.json()) as TileActionRequestBody
    const player = getCurrentPlayer()
    const tile = getTileByIndex(tile_index)

    if (!player || !isOwnableTile(tile)) {
      return buildErrorResponse(
        '\uB9E4\uAC01\uD560 \uC218 \uC5C6\uB294 \uD0C0\uC77C\uC785\uB2C8\uB2E4.',
        404
      )
    }

    if (String(tile.owner_id) !== String(player.id)) {
      return buildErrorResponse(
        '\uBCF8\uC778 \uC18C\uC720 \uD0C0\uC77C\uB9CC \uB9E4\uAC01\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.',
        403
      )
    }

    const { refund, nextBuilding, releaseOwnership } = getSellRefund(
      tile,
      level
    )

    player.balance += refund
    tile.building = nextBuilding

    if (releaseOwnership) {
      tile.owner_id = null
      tile.ownerId = null
      removeOwnedTile(player, tile_index)
    }

    setTimeout(() => {
      emitLegacyGameState()
    }, 0)

    await delay(150)
    return HttpResponse.json({
      success: true,
      tile_index,
      refund,
      building: tile.building,
      owner_id: tile.owner_id ?? null,
      state: buildStateResponse(),
    })
  }),
]
