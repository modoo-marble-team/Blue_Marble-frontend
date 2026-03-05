import {
  PLAYER_COLORS,
  type PlayerState,
  type TileOwner,
  type BuildingLevel,
} from './board.constants'

type SyncPlayerPayload = {
  id: string | number
  nickname?: string
  name?: string
  position?: number
  pos?: number
  balance?: number
  money?: number
  color?: string
}

type SyncTilePayload = {
  index?: number
  id?: number
  owner_id?: string | number | null
  ownerId?: string | number | null
  building?: number
  level?: number
}

export function mapSyncPayloadPlayers(
  payloadPlayers: SyncPlayerPayload[],
  previousPlayers: PlayerState[]
) {
  const prevById = new Map(
    previousPlayers.map((player) => [String(player.id), player])
  )
  const serverToBoardId = new Map<string, number>()
  const nextById = new Map<string, PlayerState>()

  payloadPlayers.forEach((player, index) => {
    const prevPlayer = prevById.get(String(player.id))
    const parsedPlayerId =
      typeof player.id === 'number'
        ? player.id
        : Number.parseInt(String(player.id), 10)
    const boardPlayerId = (
      Number.isNaN(parsedPlayerId) ? (prevPlayer?.id ?? index) : parsedPlayerId
    ) as number

    serverToBoardId.set(String(player.id), boardPlayerId)

    nextById.set(String(player.id), {
      id: boardPlayerId,
      name:
        player.nickname ??
        player.name ??
        prevPlayer?.name ??
        `Player ${index + 1}`,
      color:
        player.color ??
        prevPlayer?.color ??
        PLAYER_COLORS[index % PLAYER_COLORS.length],
      pos: player.position ?? player.pos ?? prevPlayer?.pos ?? 0,
      money: player.balance ?? player.money ?? prevPlayer?.money ?? 0,
    })
  })

  const orderedPlayers = previousPlayers.map((prevPlayer) => {
    return nextById.get(String(prevPlayer.id)) ?? prevPlayer
  })
  const additionalPlayers = Array.from(nextById.values()).filter(
    (nextPlayer) =>
      !orderedPlayers.some(
        (orderedPlayer) => orderedPlayer.id === nextPlayer.id
      )
  )

  return {
    nextPlayers: [...orderedPlayers, ...additionalPlayers],
    serverToBoardId,
  }
}

export function mapSyncPayloadTileOwners(
  payloadTiles: SyncTilePayload[],
  players: PlayerState[],
  serverToBoardId: Map<string, number>,
  toBoardBuildingLevel: (
    tile: { building?: number; level?: number },
    hasOwner: boolean
  ) => BuildingLevel
) {
  const nextOwners: Record<number, TileOwner> = {}

  payloadTiles.forEach((tile) => {
    const tileIndex = tile.index ?? tile.id
    const ownerRaw = tile.owner_id ?? tile.ownerId
    if (
      tileIndex === undefined ||
      ownerRaw === null ||
      ownerRaw === undefined
    ) {
      return
    }

    const mappedOwnerId = serverToBoardId.get(String(ownerRaw))
    const parsedOwnerId =
      typeof ownerRaw === 'number'
        ? ownerRaw
        : Number.parseInt(String(ownerRaw), 10)
    const ownerId =
      mappedOwnerId ?? (Number.isNaN(parsedOwnerId) ? null : parsedOwnerId)
    if (ownerId === null) return

    const ownerPlayer = players.find(
      (player) => String(player.id) === String(ownerId)
    )
    nextOwners[tileIndex] = {
      ownerId,
      ownerColor:
        ownerPlayer?.color ?? PLAYER_COLORS[ownerId % PLAYER_COLORS.length],
      level: toBoardBuildingLevel(tile, true),
    }
  })

  return nextOwners
}

export function findSyncTurnIndex(
  nextTurnRaw: string | number | null | undefined,
  players: PlayerState[],
  serverToBoardId: Map<string, number>
) {
  if (nextTurnRaw === undefined || nextTurnRaw === null) {
    return -1
  }

  const mappedTurnId = serverToBoardId.get(String(nextTurnRaw))

  return players.findIndex(
    (player) =>
      player.id === mappedTurnId || String(player.id) === String(nextTurnRaw)
  )
}
