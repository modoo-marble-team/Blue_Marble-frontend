import {
  INIT_PLAYERS,
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
  INIT_PLAYERS.map((initialPlayer, index) => {
    const storePlayer = storePlayers[index]
    if (!storePlayer) {
      return initialPlayer
    }

    return {
      ...initialPlayer,
      id: toBoardPlayerId(storePlayer.id, initialPlayer.id),
      name: storePlayer.nickname || initialPlayer.name,
      color: storePlayer.color || initialPlayer.color,
      pos: storePlayer.position,
      money: storePlayer.balance,
      skipTurns: storePlayer.jail_turn_count,
    }
  })

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
