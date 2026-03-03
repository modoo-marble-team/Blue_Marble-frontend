import { delay, http, HttpResponse } from 'msw'
import { socket } from '../../lib/socket'
import { BuildingLevel, Player, Tile } from '../../types/domain'
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

type GameStateResponse = {
  players: Player[]
  tiles: Tile[]
  messages: typeof mockMessages
  currentTurn: string
  round: number
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
})

const mockGameState: GameStateResponse = createInitialGameState()

const resetMockGameState = () => {
  const initialState = createInitialGameState()
  mockGameState.players = initialState.players
  mockGameState.tiles = initialState.tiles
  mockGameState.messages = initialState.messages
  mockGameState.currentTurn = initialState.currentTurn
  mockGameState.round = initialState.round
}

const buildStateResponse = () => ({
  players: structuredClone(mockGameState.players),
  tiles: structuredClone(mockGameState.tiles),
  messages: structuredClone(mockGameState.messages),
  currentTurn: mockGameState.currentTurn,
  round: mockGameState.round,
})

const emitSocketEvent = (eventName: string, payload: unknown) => {
  const socketWithListeners = socket as unknown as {
    listeners: (name: string) => Array<(eventPayload: unknown) => void>
  }

  socketWithListeners.listeners(eventName).forEach((listener) => {
    listener(payload)
  })
}

const emitGameState = () => {
  emitSocketEvent('game_state', {
    players: structuredClone(mockGameState.players),
    tiles: structuredClone(mockGameState.tiles),
    current_turn: mockGameState.currentTurn,
    round: mockGameState.round,
    timeout_sec: MOCK_TURN_TIMEOUT_SEC,
  })
}

const emitTurnStart = () => {
  emitSocketEvent('turn_start', {
    player_id: mockGameState.currentTurn,
    round: mockGameState.round,
    timeout_sec: MOCK_TURN_TIMEOUT_SEC,
  })
}

const getCurrentPlayer = () =>
  mockGameState.players.find(
    (player) => player.id === mockGameState.currentTurn
  )

const getTileByIndex = (tileIndex: number) =>
  mockGameState.tiles.find((tile) => tile.index === tileIndex)

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

const getNextActivePlayerId = (currentPlayerId: string) => {
  const currentIndex = mockGameState.players.findIndex(
    (player) => player.id === currentPlayerId
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

const buildErrorResponse = (message: string, status: number) =>
  HttpResponse.json({ message }, { status })

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
        (player) => player.id === player_id
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
        emitGameState()
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

    if (!player || !tile || tile.type !== 'property') {
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
      emitGameState()
      emitTurnStart()
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

    if (!player || !tile || tile.type !== 'property') {
      return buildErrorResponse(
        '\uAC74\uC124\uD560 \uC218 \uC5C6\uB294 \uD0C0\uC77C\uC785\uB2C8\uB2E4.',
        404
      )
    }

    if (tile.owner_id !== player.id) {
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
      emitGameState()
      emitTurnStart()
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

    if (!player || !tile || tile.type !== 'property') {
      return buildErrorResponse(
        '\uB9E4\uAC01\uD560 \uC218 \uC5C6\uB294 \uD0C0\uC77C\uC785\uB2C8\uB2E4.',
        404
      )
    }

    if (tile.owner_id !== player.id) {
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
      removeOwnedTile(player, tile_index)
    }

    setTimeout(() => {
      emitGameState()
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
