import {
  LEVEL_LABELS,
  TILES,
  getTollCost,
  type BuildingLevel,
} from '../../components/board/board.constants'
import { formatWon } from '../../lib/utils'

const PROPERTY_BUILDING_LEVELS: readonly BuildingLevel[] = [0, 1, 2, 3]

export const RULEBOOK_TOLL_LABELS = {
  land: LEVEL_LABELS[0],
  villa: LEVEL_LABELS[1],
  hotel: LEVEL_LABELS[2],
  landmark: LEVEL_LABELS[3],
} as const

export type GameRulebookCityTollByLevel = {
  land: number
  villa: number
  hotel: number
  landmark: number
}

export type GameRulebookCityTollDisplayByLevel = {
  land: string
  villa: string
  hotel: string
  landmark: string
}

export type GameRulebookCityRow = {
  tileId: number
  cityName: string
  tier: number
  tierLabel: string
  priceWon: number
  priceDisplay: string
  tollByLevel: GameRulebookCityTollByLevel
  tollDisplay: GameRulebookCityTollDisplayByLevel
}

export type GameRulebookTierSummary = {
  tier: number
  tierLabel: string
  basePriceWon: number
  basePriceDisplay: string
}

export type GameRulebookData = {
  tiers: GameRulebookTierSummary[]
  cityRows: GameRulebookCityRow[]
}

export const formatRulebookMoney = (won: number) =>
  `${formatWon(won)} (${won.toLocaleString('ko-KR')}원)`

const toTollByLevel = (basePriceWon: number): GameRulebookCityTollByLevel => {
  const [land, villa, hotel, landmark] = PROPERTY_BUILDING_LEVELS.map((level) =>
    getTollCost(basePriceWon, level)
  ) as [number, number, number, number]

  return {
    land,
    villa,
    hotel,
    landmark,
  }
}

export const buildGameRulebookData = (): GameRulebookData => {
  const propertyTiles = TILES.filter(
    (tile): tile is (typeof TILES)[number] & { price: number } =>
      tile.type === 'PROPERTY' &&
      typeof tile.price === 'number' &&
      Number.isFinite(tile.price)
  )

  const sortedTierPrices = [
    ...new Set(propertyTiles.map((tile) => tile.price)),
  ].sort((left, right) => right - left)

  const tierByPrice = new Map<number, number>()
  sortedTierPrices.forEach((priceWon, index) => {
    tierByPrice.set(priceWon, index + 1)
  })

  const tiers = sortedTierPrices.map((priceWon, index) => {
    const tier = index + 1
    return {
      tier,
      tierLabel: `티어 ${tier}`,
      basePriceWon: priceWon,
      basePriceDisplay: formatRulebookMoney(priceWon),
    }
  })

  const cityRows = propertyTiles
    .map((tile) => {
      const tier = tierByPrice.get(tile.price)
      if (!tier) {
        throw new Error(`Tier mapping is missing for city price: ${tile.price}`)
      }

      const tollByLevel = toTollByLevel(tile.price)

      return {
        tileId: tile.id,
        cityName: tile.name,
        tier,
        tierLabel: `티어 ${tier}`,
        priceWon: tile.price,
        priceDisplay: formatRulebookMoney(tile.price),
        tollByLevel,
        tollDisplay: {
          land: formatRulebookMoney(tollByLevel.land),
          villa: formatRulebookMoney(tollByLevel.villa),
          hotel: formatRulebookMoney(tollByLevel.hotel),
          landmark: formatRulebookMoney(tollByLevel.landmark),
        },
      }
    })
    .sort((left, right) => {
      if (left.tier !== right.tier) {
        return left.tier - right.tier
      }
      return left.tileId - right.tileId
    })

  return {
    tiers,
    cityRows,
  }
}
