import {
  INIT_PLAYERS,
  TILES,
  getBuildCost,
  type BuildingLevel,
  type PlayerState,
} from '../../components/board/board.constants'
import type { Player, PlayerId, Tile } from '../../types/domain'

const toBoardPlayerId = (playerId: PlayerId, fallbackIndex: number) => {
  if (typeof playerId === 'number') {
    return playerId
  }

  const parsedPlayerId = Number.parseInt(String(playerId), 10)
  return Number.isNaN(parsedPlayerId) ? fallbackIndex : parsedPlayerId
}

export const mapStorePlayersToBoardPlayers = (storePlayers: Player[]) =>
  (storePlayers.length > 0 ? storePlayers : INIT_PLAYERS).map(
    (storePlayerOrFallback, index) => {
      const initialPlayer = INIT_PLAYERS[index] ?? INIT_PLAYERS[0]
      const storePlayer =
        storePlayers.length > 0 ? (storePlayerOrFallback as Player) : undefined

      if (!storePlayer) {
        return storePlayerOrFallback as PlayerState
      }

      return {
        ...initialPlayer,
        id: toBoardPlayerId(storePlayer.id, initialPlayer.id),
        name: storePlayer.nickname || initialPlayer.name,
        color: storePlayer.color || initialPlayer.color,
        pos: storePlayer.position,
        money: storePlayer.balance,
        skipTurns: storePlayer.jail_turn_count,
        state: storePlayer.state ?? initialPlayer.state,
        stateDuration: storePlayer.stateDuration ?? initialPlayer.stateDuration,
      }
    }
  )

export const findBoardCurrentPlayerIndex = (
  storePlayers: Player[],
  currentTurn: PlayerId | null
) => {
  if (currentTurn == null) {
    return 0
  }

  const nextTurnIndex = storePlayers.findIndex(
    (player) => String(player.id) === String(currentTurn)
  )

  return nextTurnIndex >= 0 ? nextTurnIndex : 0
}

export const mapStoreTilesToBoardTiles = (
  storeTiles: Tile[],
  storePlayers: Player[],
  boardPlayers: PlayerState[]
) => {
  if (storeTiles.length === 0) {
    return storeTiles
  }

  return storeTiles.map((tile) => {
    if (tile.owner_id === null || tile.owner_id === undefined) {
      return tile
    }

    const ownerStoreIndex = storePlayers.findIndex(
      (player) => String(player.id) === String(tile.owner_id)
    )

    if (ownerStoreIndex < 0) {
      return tile
    }

    const boardOwner = boardPlayers[ownerStoreIndex]
    if (!boardOwner) {
      return tile
    }

    return {
      ...tile,
      owner_id: boardOwner.id,
    }
  })
}

const getOwnedTileIndices = (player: Player, storeTiles: Tile[]) => {
  const ownedTileIndexSet = new Set<number>(player.owned_tiles)
  const normalizedPlayerId = String(player.id)

  for (const tile of storeTiles) {
    const ownerId =
      tile.ownerId !== undefined ? tile.ownerId : (tile.owner_id ?? null)
    if (ownerId == null) {
      continue
    }

    if (String(ownerId) === normalizedPlayerId) {
      ownedTileIndexSet.add(tile.index)
    }
  }

  return ownedTileIndexSet
}

export const calcPlayerTotalAssets = (
  player: Player,
  storeTiles: Tile[]
): number => {
  const ownedTileIndices = getOwnedTileIndices(player, storeTiles)
  let assets = player.balance

  for (const tileIndex of ownedTileIndices) {
    const serverTile = storeTiles.find((tile) => tile.index === tileIndex)
    const staticTile = TILES.find((tile) => tile.id === tileIndex)
    const landPrice = serverTile?.price ?? staticTile?.price ?? 0
    const buildingLevel: BuildingLevel =
      (serverTile?.building as BuildingLevel | undefined) ?? 0

    assets += landPrice

    for (let level = 0 as BuildingLevel; level < buildingLevel; level++) {
      assets += getBuildCost(landPrice, level as BuildingLevel)
    }
  }

  return assets
}
