import { formatWon } from '../../lib/utils'
import type { GameRanking, GameResult } from '../../types/domain'

type GameResultTilePayload = {
  owner_id?: string | number | null
  ownerId?: string | number | null
  type?: string
  transportType?: string
}

export interface GameResultModalRowViewModel {
  id: string
  nickname: string
  totalAssetText: string
  ownedCityCountText: string
}

function isPropertyTile(tile: GameResultTilePayload) {
  const transportType =
    typeof tile.transportType === 'string'
      ? tile.transportType.trim().toUpperCase()
      : ''

  if (transportType === 'PROPERTY') {
    return true
  }

  if (typeof tile.type !== 'string') {
    return false
  }

  const normalizedType = tile.type.trim()
  if (!normalizedType) {
    return false
  }

  const upperType = normalizedType.toUpperCase()
  if (upperType === 'PROPERTY') {
    return true
  }

  const lowerType = normalizedType.toLowerCase()
  return lowerType === 'property' || lowerType === 'city'
}

function getOwnedCityCountText(
  playerId: string | number,
  ownedCityCountByPlayer: Map<string, number>
) {
  return `${ownedCityCountByPlayer.get(String(playerId)) ?? 0}개`
}

export function countOwnedCitiesByPlayer(tiles: GameResultTilePayload[]) {
  const ownedCityCountByPlayer = new Map<string, number>()

  tiles.forEach((tile) => {
    if (!isPropertyTile(tile)) {
      return
    }

    const ownerId = tile.owner_id ?? tile.ownerId ?? null
    if (ownerId == null) {
      return
    }

    const playerId = String(ownerId)
    ownedCityCountByPlayer.set(
      playerId,
      (ownedCityCountByPlayer.get(playerId) ?? 0) + 1
    )
  })

  return ownedCityCountByPlayer
}

export function buildGameResultModalRows(params: {
  rankings?: GameRanking[]
  winner?: GameResult['winner'] | null
  tiles?: GameResultTilePayload[]
}): GameResultModalRowViewModel[] {
  const { rankings, winner, tiles = [] } = params
  const ownedCityCountByPlayer = countOwnedCitiesByPlayer(tiles)

  if (rankings && rankings.length > 0) {
    return rankings.map((ranking) => ({
      id: String(ranking.player_id),
      nickname: ranking.nickname,
      totalAssetText: formatWon(ranking.final_assets),
      ownedCityCountText: getOwnedCityCountText(
        ranking.player_id,
        ownedCityCountByPlayer
      ),
    }))
  }

  if (winner) {
    return [
      {
        id: String(winner.playerId),
        nickname: winner.nickname,
        totalAssetText: formatWon(winner.assets),
        ownedCityCountText: getOwnedCityCountText(
          winner.playerId,
          ownedCityCountByPlayer
        ),
      },
    ]
  }

  return []
}
