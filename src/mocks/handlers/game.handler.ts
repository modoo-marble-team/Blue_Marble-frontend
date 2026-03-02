import { delay, http, HttpResponse } from 'msw'
import { socket } from '../../lib/socket'
import { BuildingLevel, Player, Tile } from '../../types/domain'
import { mockMessages, mockPlayers, mockTiles } from '../gameMockData'

const MOCK_PLAYER_ID = 'me'
const MOCK_BUILD_COST = 30

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

const mockGameState: GameStateResponse = {
  players: clonePlayers(),
  tiles: cloneTiles(),
  messages: cloneMessages(),
  currentTurn: MOCK_PLAYER_ID,
  round: 1,
}

const buildStateResponse = () => ({
  players: structuredClone(mockGameState.players),
  tiles: structuredClone(mockGameState.tiles),
  messages: structuredClone(mockGameState.messages),
  currentTurn: mockGameState.currentTurn,
  round: mockGameState.round,
})

const getCurrentPlayer = () =>
  mockGameState.players.find((player) => player.id === mockGameState.currentTurn)

const getTileByIndex = (tileIndex: number) =>
  mockGameState.tiles.find((tile) => tile.index === tileIndex)

const ensureOwnedTiles = (player: Player, tileIndex: number) => {
  if (!player.owned_tiles.includes(tileIndex)) {
    player.owned_tiles.push(tileIndex)
  }
}

const removeOwnedTile = (player: Player, tileIndex: number) => {
  player.owned_tiles = player.owned_tiles.filter((ownedTile) => ownedTile !== tileIndex)
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

export const gameHandlers = [
  http.post('/api/game/roll-dice', async ({ request }) => {
    const { player_id } = (await request.json()) as DiceRequestBody

    const dice1 = Math.floor(Math.random() * 6) + 1
    const dice2 = Math.floor(Math.random() * 6) + 1
    const isDouble = dice1 === dice2
    const total = dice1 + dice2

    setTimeout(() => {
      const socketWithListeners = socket as unknown as {
        listeners: (eventName: string) => Array<(payload: unknown) => void>
      }
      const diceListeners = socketWithListeners.listeners('dice_rolled')

      diceListeners.forEach((listener) =>
        listener({
          player_id,
          dice: [dice1, dice2],
          is_double: isDouble,
          double_count: isDouble ? 1 : 0,
        })
      )

      const currentPlayer = mockGameState.players.find(
        (player) => player.id === player_id
      )
      const fromIndex = currentPlayer?.position ?? 0
      const toIndex = (fromIndex + total) % mockGameState.tiles.length

      if (currentPlayer) {
        currentPlayer.position = toIndex
      }

      setTimeout(() => {
        const moveListeners = socketWithListeners.listeners('player_moved')
        moveListeners.forEach((listener) =>
          listener({
            player_id,
            from_index: fromIndex,
            to_index: toIndex,
            trigger: 'dice',
            pass_go: fromIndex + total >= mockGameState.tiles.length,
            pass_go_salary: 200,
          })
        )
      }, 800)
    }, 100)

    return HttpResponse.json({
      success: true,
      dice: [dice1, dice2],
    })
  }),

  http.get('/api/game/state', async () => {
    await delay(150)
    return HttpResponse.json(buildStateResponse())
  }),

  http.post('/api/game/buy', async ({ request }) => {
    const { tile_index } = (await request.json()) as TileActionRequestBody
    const player = getCurrentPlayer()
    const tile = getTileByIndex(tile_index)

    if (!player || !tile || tile.type !== 'property') {
      return HttpResponse.json(
        { message: '구매할 수 없는 타일입니다.' },
        { status: 404 }
      )
    }

    if (tile.owner_id) {
      return HttpResponse.json(
        { message: '이미 소유된 타일입니다.' },
        { status: 409 }
      )
    }

    const price = tile.price ?? 0
    if (player.balance < price) {
      return HttpResponse.json(
        { message: '보유 금액이 부족합니다.' },
        { status: 409 }
      )
    }

    player.balance -= price
    tile.owner_id = player.id
    tile.building = 0
    ensureOwnedTiles(player, tile_index)

    await delay(150)
    return HttpResponse.json({
      success: true,
      tile_index,
      state: buildStateResponse(),
    })
  }),

  http.post('/api/game/build', async ({ request }) => {
    const { tile_index } = (await request.json()) as TileActionRequestBody
    const player = getCurrentPlayer()
    const tile = getTileByIndex(tile_index)

    if (!player || !tile || tile.type !== 'property') {
      return HttpResponse.json(
        { message: '건설할 수 없는 타일입니다.' },
        { status: 404 }
      )
    }

    if (tile.owner_id !== player.id) {
      return HttpResponse.json(
        { message: '본인 소유 타일만 건설할 수 있습니다.' },
        { status: 403 }
      )
    }

    if (tile.building >= 5) {
      return HttpResponse.json(
        { message: '최대 단계까지 건설되었습니다.' },
        { status: 409 }
      )
    }

    if (player.balance < MOCK_BUILD_COST) {
      return HttpResponse.json(
        { message: '건설 비용이 부족합니다.' },
        { status: 409 }
      )
    }

    player.balance -= MOCK_BUILD_COST
    tile.building = (tile.building + 1) as BuildingLevel

    await delay(150)
    return HttpResponse.json({
      success: true,
      tile_index,
      building: tile.building,
      state: buildStateResponse(),
    })
  }),

  http.post('/api/game/sell', async ({ request }) => {
    const { tile_index, level } = (await request.json()) as TileActionRequestBody
    const player = getCurrentPlayer()
    const tile = getTileByIndex(tile_index)

    if (!player || !tile || tile.type !== 'property') {
      return HttpResponse.json(
        { message: '매각할 수 없는 타일입니다.' },
        { status: 404 }
      )
    }

    if (tile.owner_id !== player.id) {
      return HttpResponse.json(
        { message: '본인 소유 타일만 매각할 수 있습니다.' },
        { status: 403 }
      )
    }

    const { refund, nextBuilding, releaseOwnership } = getSellRefund(tile, level)

    player.balance += refund
    tile.building = nextBuilding

    if (releaseOwnership) {
      tile.owner_id = null
      removeOwnedTile(player, tile_index)
    }

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
