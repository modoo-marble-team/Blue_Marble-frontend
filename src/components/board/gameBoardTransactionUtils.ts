import { type BuildingLevel, type TileOwner } from './board.constants'

export function findBoardSellTarget(
  tileOwners: Record<number, TileOwner>,
  playerId: number
) {
  const ownedTileEntries = Object.entries(tileOwners)
    .filter(([, owner]) => owner.ownerId === playerId)
    .sort(([, left], [, right]) => right.level - left.level)

  if (ownedTileEntries.length === 0) {
    return null
  }

  const [tileIdText, owner] = ownedTileEntries[0]

  return {
    tileId: Number(tileIdText),
    owner,
  }
}

export function createBoardPurchasedTileOwner(
  ownerId: number,
  ownerColor: string
): TileOwner {
  return {
    ownerId,
    ownerColor,
    level: 1,
  }
}

export function upgradeBoardTileOwner(
  tileOwners: Record<number, TileOwner>,
  tileId: number
) {
  const existing = tileOwners[tileId]
  if (!existing) {
    return tileOwners
  }

  return {
    ...tileOwners,
    [tileId]: {
      ...existing,
      level: Math.min(existing.level + 1, 5) as BuildingLevel,
    },
  }
}

export function getBoardTollAmount(
  price: number,
  owner: TileOwner | undefined,
  calcToll: (price: number, level: BuildingLevel) => number
) {
  return owner ? calcToll(price, owner.level) : 0
}
