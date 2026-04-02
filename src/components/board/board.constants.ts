export type TileType =
  | 'START'
  | 'PROPERTY'
  | 'CHANCE'
  | 'MOVE_TO_ISLAND'
  | 'ISLAND'
  | 'EVENT'
  | 'TRAVEL'

export type TileDir = 'top' | 'bottom' | 'left' | 'right' | 'corner'

/**
 * BuildingLevel:
 * 0: 토지
 * 1: 별장
 * 2: 호텔
 * 3: 랜드마크
 */
export type BuildingLevel = 0 | 1 | 2 | 3

export const LEVEL_LABELS: Record<number, string> = {
  0: '토지',
  1: '별장',
  2: '호텔',
  3: '랜드마크',
}

export const LEVEL_MODAL_ICONS: Record<number, string> = {
  0: '/BuyModal-land.svg',
  1: '/BuyModal-house.svg',
  2: '/BuyModal-hotel.svg',
  3: '/BuyModal-landmark.svg',
}

export interface TileOwner {
  ownerId: string | number
  ownerColor: string
  level: BuildingLevel
}

export interface TileData {
  id: number
  name: string
  type: TileType
  color?: string
  emoji?: string
  svgIcon?: string
  price?: number
}

export interface PlayerState {
  id: string | number
  name: string
  color: string
  pos: number
  money: number
  skipTurns?: number
  state?: 'normal' | 'island' | 'bankrupt' | 'locked' | 'disconnected'
  stateDuration?: number
}

type TierRuleWon = {
  tolls: [number, number, number, number]
  buildCosts: [number, number, number]
}

const PROPERTY_TIER_BY_PRICE_WON: Record<number, TierRuleWon> = {
  300_000_000: {
    tolls: [100_000_000, 150_000_000, 300_000_000, 800_000_000],
    buildCosts: [200_000_000, 300_000_000, 400_000_000],
  },
  500_000_000: {
    tolls: [150_000_000, 250_000_000, 650_000_000, 1_200_000_000],
    buildCosts: [250_000_000, 500_000_000, 700_000_000],
  },
  700_000_000: {
    tolls: [200_000_000, 400_000_000, 900_000_000, 1_800_000_000],
    buildCosts: [500_000_000, 900_000_000, 1_400_000_000],
  },
  1_100_000_000: {
    tolls: [350_000_000, 700_000_000, 1_300_000_000, 2_500_000_000],
    buildCosts: [800_000_000, 1_700_000_000, 3_000_000_000],
  },
  1_500_000_000: {
    tolls: [450_000_000, 900_000_000, 1_800_000_000, 3_200_000_000],
    buildCosts: [1_000_000_000, 1_800_000_000, 3_200_000_000],
  },
}

export const TILES: TileData[] = [
  { id: 0, name: '출발', type: 'START', emoji: '🚩' },
  {
    id: 1,
    name: '수원',
    type: 'PROPERTY',
    color: '#EF5350',
    price: 300_000_000,
  },
  {
    id: 2,
    name: '용인',
    type: 'PROPERTY',
    color: '#FFD15B',
    price: 300_000_000,
  },
  { id: 3, name: '찬스', type: 'CHANCE', svgIcon: '/event-question.svg' },
  {
    id: 4,
    name: '군산',
    type: 'PROPERTY',
    color: '#66BB6A',
    price: 300_000_000,
  },
  {
    id: 5,
    name: '태백',
    type: 'PROPERTY',
    color: '#42A5F5',
    price: 300_000_000,
  },
  {
    id: 6,
    name: '울산',
    type: 'PROPERTY',
    color: '#42A5F5',
    price: 300_000_000,
  },
  { id: 7, name: '이벤트', type: 'EVENT', svgIcon: '/chance-box.svg' },
  { id: 8, name: '무인도', type: 'ISLAND', emoji: '🏝️' },
  {
    id: 9,
    name: '경주',
    type: 'PROPERTY',
    color: '#FF7043',
    price: 300_000_000,
  },
  { id: 10, name: '찬스', type: 'CHANCE', svgIcon: '/event-question.svg' },
  {
    id: 11,
    name: '포항',
    type: 'PROPERTY',
    color: '#26A69A',
    price: 500_000_000,
  },
  {
    id: 12,
    name: '대구',
    type: 'PROPERTY',
    color: '#66BB6A',
    price: 700_000_000,
  },
  {
    id: 13,
    name: '창원',
    type: 'PROPERTY',
    color: '#7E57C2',
    price: 500_000_000,
  },
  {
    id: 14,
    name: '익산',
    type: 'PROPERTY',
    color: '#EF5350',
    price: 700_000_000,
  },
  {
    id: 15,
    name: '부산',
    type: 'PROPERTY',
    color: '#EF5350',
    price: 1_500_000_000,
  },
  { id: 16, name: '여행', type: 'TRAVEL', emoji: '✈️' },
  {
    id: 17,
    name: '제주',
    type: 'PROPERTY',
    color: '#42A5F5',
    price: 1_500_000_000,
  },
  {
    id: 18,
    name: '여수',
    type: 'PROPERTY',
    color: '#26A69A',
    price: 700_000_000,
  },
  {
    id: 19,
    name: '광주',
    type: 'PROPERTY',
    color: '#66BB6A',
    price: 700_000_000,
  },
  { id: 20, name: '이벤트', type: 'EVENT', svgIcon: '/chance-box.svg' },
  {
    id: 21,
    name: '춘천',
    type: 'PROPERTY',
    color: '#7E57C2',
    price: 500_000_000,
  },
  {
    id: 22,
    name: '강릉',
    type: 'PROPERTY',
    color: '#7E57C2',
    price: 1_100_000_000,
  },
  {
    id: 23,
    name: '전주',
    type: 'PROPERTY',
    color: '#FF7043',
    price: 500_000_000,
  },
  { id: 24, name: '섬으로 이동', type: 'MOVE_TO_ISLAND', emoji: '🚓' },
  {
    id: 25,
    name: '청주',
    type: 'PROPERTY',
    color: '#42A5F5',
    price: 500_000_000,
  },
  {
    id: 26,
    name: '천안',
    type: 'PROPERTY',
    color: '#42A5F5',
    price: 700_000_000,
  },
  { id: 27, name: '찬스', type: 'CHANCE', svgIcon: '/event-question.svg' },
  {
    id: 28,
    name: '대전',
    type: 'PROPERTY',
    color: '#66BB6A',
    price: 1_100_000_000,
  },
  {
    id: 29,
    name: '인천',
    type: 'PROPERTY',
    color: '#7E57C2',
    price: 1_100_000_000,
  },
  { id: 30, name: '이벤트', type: 'EVENT', svgIcon: '/chance-box.svg' },
  {
    id: 31,
    name: '서울',
    type: 'PROPERTY',
    color: '#FF7043',
    price: 1_500_000_000,
  },
]

export const TOP_ROW = [16, 17, 18, 19, 20, 21, 22, 23, 24]
export const BOTTOM_ROW = [0, 1, 2, 3, 4, 5, 6, 7, 8]
export const LEFT_COL = [9, 10, 11, 12, 13, 14, 15]
export const RIGHT_COL = [25, 26, 27, 28, 29, 30, 31]

export const CORNER_SIZE = 90
export const STRAIGHT_SIZE = 70
export const GRID_GAP = 2

export const PLAYER_COLORS = ['#EF5350', '#42A5F5', '#66BB6A', '#FFD15B']
export const DICE_TIMEOUT = 30

export const INIT_PLAYERS: PlayerState[] = [
  {
    id: 0,
    name: 'GoormEE',
    color: PLAYER_COLORS[0],
    pos: 0,
    money: 10_000_000_000,
    skipTurns: 0,
  },
  {
    id: 1,
    name: 'MarbleKing',
    color: PLAYER_COLORS[1],
    pos: 0,
    money: 10_000_000_000,
    skipTurns: 0,
  },
  {
    id: 2,
    name: 'Player 3',
    color: PLAYER_COLORS[2],
    pos: 0,
    money: 10_000_000_000,
    skipTurns: 0,
  },
  {
    id: 3,
    name: 'Player 4',
    color: PLAYER_COLORS[3],
    pos: 0,
    money: 10_000_000_000,
    skipTurns: 0,
  },
]

export function getStripColor(tile: TileData): string | null {
  if (tile.type === 'PROPERTY') return tile.color ?? null
  if (tile.type === 'EVENT') return '#EF5350'
  if (tile.type === 'CHANCE') return '#FFD15B'
  return null
}

export function getBuildCost(
  basePrice: number,
  currentLevel: BuildingLevel
): number {
  const tierRule = PROPERTY_TIER_BY_PRICE_WON[basePrice]
  if (tierRule) {
    if (currentLevel === 0) return tierRule.buildCosts[0]
    if (currentLevel === 1) return tierRule.buildCosts[1]
    if (currentLevel === 2) return tierRule.buildCosts[2]
    return 0
  }

  if (currentLevel === 0) return basePrice * 0.5
  if (currentLevel === 1) return basePrice * 1
  if (currentLevel === 2) return basePrice * 2
  return 0
}

export function getTollCost(
  basePrice: number,
  currentLevel: BuildingLevel
): number {
  const tierRule = PROPERTY_TIER_BY_PRICE_WON[basePrice]
  if (tierRule) {
    const clampedLevel = Math.max(
      0,
      Math.min(currentLevel, tierRule.tolls.length - 1)
    ) as BuildingLevel
    return tierRule.tolls[clampedLevel]
  }

  if (currentLevel === 0) return basePrice
  if (currentLevel === 1) return basePrice * 2
  if (currentLevel === 2) return basePrice * 7
  if (currentLevel === 3) return basePrice * 15
  return basePrice
}
