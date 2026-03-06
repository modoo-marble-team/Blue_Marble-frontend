import { useGameStore } from '../../stores/game.store'
import type { BuildingLevel as StoreBuildingLevel } from '../../types/domain'
import type { PlayerState, TileOwner } from './board.constants'

const toStoreBuildingLevel = (level: number): StoreBuildingLevel =>
  Math.min(Math.max(level, 0), 7) as StoreBuildingLevel

export function syncMockStorePlayers(nextPlayers: PlayerState[]) {
  const { players: storePlayers, setGameState } = useGameStore.getState()
  if (storePlayers.length === 0) {
    return
  }

  setGameState({
    players: nextPlayers.map((player, index) => {
      const storePlayer = storePlayers[index]

      return {
        id: storePlayer?.id ?? String(player.id),
        nickname: player.name,
        position: player.pos,
        balance: player.money,
        owned_tiles: storePlayer?.owned_tiles ?? [],
        is_in_jail: storePlayer?.is_in_jail ?? false,
        jail_turn_count: storePlayer?.jail_turn_count ?? 0,
        is_bankrupt: storePlayer?.is_bankrupt ?? false,
        color: player.color,
        avatar: storePlayer?.avatar,
      }
    }),
  })
}

export function syncMockStoreCurrentTurn(playerIdx: number) {
  const { players: storePlayers, setCurrentTurn } = useGameStore.getState()
  const nextTurnPlayer = storePlayers[playerIdx]
  if (nextTurnPlayer) {
    setCurrentTurn(nextTurnPlayer.id)
  }
}

export function syncMockStoreBankrupt(playerIdx: number) {
  const { players: storePlayers, updatePlayer } = useGameStore.getState()
  const bankruptPlayer = storePlayers[playerIdx]
  if (bankruptPlayer) {
    updatePlayer(bankruptPlayer.id, { is_bankrupt: true })
  }
}

export function syncMockStoreTileOwners(
  nextTileOwners: Record<number, TileOwner>
) {
  const {
    tiles: storeTiles,
    players: storePlayers,
    setGameState,
  } = useGameStore.getState()

  if (storeTiles.length === 0) {
    return
  }

  setGameState({
    tiles: storeTiles.map((tile) => {
      const owner = nextTileOwners[tile.index]
      if (!owner) {
        return {
          ...tile,
          ownerId: null,
          owner_id: null,
          building: 0 as StoreBuildingLevel,
        }
      }

      const ownerPlayer =
        storePlayers.find(
          (player) => String(player.id) === String(owner.ownerId)
        ) ??
        (typeof owner.ownerId === 'number'
          ? storePlayers[owner.ownerId]
          : undefined)

      return {
        ...tile,
        ownerId: ownerPlayer?.id ?? String(owner.ownerId),
        owner_id: ownerPlayer?.id ?? String(owner.ownerId),
        building: toStoreBuildingLevel(owner.level),
      }
    }),
  })
}
