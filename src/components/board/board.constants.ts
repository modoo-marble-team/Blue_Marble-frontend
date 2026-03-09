export type TileType =
  | 'START'
  | 'PROPERTY'
  | 'CHANCE'
  | 'MOVE_TO_ISLAND'
  | 'ISLAND'
  | 'EVENT'
  | 'TRAVEL'
  | 'AI'

export type TileDir = 'top' | 'bottom' | 'left' | 'right' | 'corner'

/**
 * BuildingLevel 규격:
 * 0: '토지',
 * 1: '집 x1',
 * 2: '집 x2',
 * 3: '집 x3',
 * 4: '호텔 x1',
 * 5: '호텔 x2',
 * 6: '호텔 x3',
 * 7: '랜드마크'
 */
export type BuildingLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7

export const LEVEL_LABELS: Record<number, string> = {
  0: '토지',
  1: '주택 x1',
  2: '주택 x2',
  3: '주택 x3',
  4: '호텔 x1',
  5: '호텔 x2',
  6: '호텔 x3',
  7: '랜드마크',
}

export const LEVEL_MODAL_ICONS: Record<number, string> = {
  0: '/BuyModal-land.svg',
  1: '/BuyModal-house.svg',
  2: '/BuyModal-house.svg',
  3: '/BuyModal-house.svg',
  4: '/BuyModal-hotel.svg',
  5: '/BuyModal-hotel.svg',
  6: '/BuyModal-hotel.svg',
  7: '/BuyModal-landmark.svg',
}

export interface TileOwner {
  ownerId: number
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
  id: number
  name: string
  color: string
  pos: number
  money: number
  skipTurns?: number
  state?: 'normal' | 'island' | 'bankrupt' | 'locked' | 'disconnected'
  stateDuration?: number
}

export const TILES: TileData[] = [
  { id: 0, name: 'START', type: 'START', emoji: '🚩' },
  { id: 1, name: '수원', type: 'PROPERTY', color: '#EF5350', price: 100000000 },
  { id: 2, name: '용인', type: 'PROPERTY', color: '#FFD15B', price: 120000000 },
  { id: 3, name: '', type: 'CHANCE', svgIcon: '/event-question.svg' },
  { id: 4, name: '군산', type: 'PROPERTY', color: '#66BB6A', price: 140000000 },
  { id: 5, name: '평택', type: 'PROPERTY', color: '#42A5F5', price: 160000000 },
  { id: 6, name: '익산', type: 'PROPERTY', color: '#42A5F5', price: 180000000 },
  { id: 7, name: '이벤트', type: 'EVENT', svgIcon: '/chance-box.svg' },
  { id: 8, name: '무인도', type: 'ISLAND', emoji: '🏝️' },
  { id: 9, name: '경주', type: 'PROPERTY', color: '#FF7043', price: 200000000 },
  { id: 10, name: '', type: 'CHANCE', svgIcon: '/event-question.svg' },
  {
    id: 11,
    name: '포항',
    type: 'PROPERTY',
    color: '#26A69A',
    price: 240000000,
  },
  {
    id: 12,
    name: '대구',
    type: 'PROPERTY',
    color: '#66BB6A',
    price: 280000000,
  },
  {
    id: 13,
    name: '청원',
    type: 'PROPERTY',
    color: '#7E57C2',
    price: 320000000,
  },
  {
    id: 14,
    name: '울산',
    type: 'PROPERTY',
    color: '#EF5350',
    price: 360000000,
  },
  {
    id: 15,
    name: '부산',
    type: 'PROPERTY',
    color: '#EF5350',
    price: 400000000,
  },
  { id: 16, name: '국내여행', type: 'TRAVEL', emoji: '✈️' },
  {
    id: 17,
    name: '제주',
    type: 'PROPERTY',
    color: '#42A5F5',
    price: 500000000,
  },
  {
    id: 18,
    name: '여수',
    type: 'PROPERTY',
    color: '#26A69A',
    price: 550000000,
  },
  {
    id: 19,
    name: '광주',
    type: 'PROPERTY',
    color: '#66BB6A',
    price: 600000000,
  },
  {
    id: 20,
    name: 'AI',
    type: 'AI',
    color: '#000000',
    svgIcon: '/ai-head.png',
  },
  {
    id: 21,
    name: '춘천',
    type: 'PROPERTY',
    color: '#7E57C2',
    price: 650000000,
  },
  {
    id: 22,
    name: '강릉',
    type: 'PROPERTY',
    color: '#7E57C2',
    price: 700000000,
  },
  {
    id: 23,
    name: '원주',
    type: 'PROPERTY',
    color: '#FF7043',
    price: 750000000,
  },
  { id: 24, name: '무인도\n이동칸', type: 'MOVE_TO_ISLAND', emoji: '👮' },
  {
    id: 25,
    name: '청주',
    type: 'PROPERTY',
    color: '#42A5F5',
    price: 800000000,
  },
  {
    id: 26,
    name: '천안',
    type: 'PROPERTY',
    color: '#42A5F5',
    price: 900000000,
  },
  { id: 27, name: '', type: 'CHANCE', svgIcon: '/event-question.svg' },
  {
    id: 28,
    name: '대전',
    type: 'PROPERTY',
    color: '#66BB6A',
    price: 1000000000,
  },
  {
    id: 29,
    name: '인천',
    type: 'PROPERTY',
    color: '#7E57C2',
    price: 1100000000,
  },
  { id: 30, name: '이벤트', type: 'EVENT', svgIcon: '/chance-box.svg' },
  {
    id: 31,
    name: '서울',
    type: 'PROPERTY',
    color: '#FF7043',
    price: 1200000000,
  },
]

export const TOP_ROW = [16, 17, 18, 19, 20, 21, 22, 23, 24]
export const BOTTOM_ROW = [8, 7, 6, 5, 4, 3, 2, 1, 0]
export const LEFT_COL = [15, 14, 13, 12, 11, 10, 9]
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
    money: 1000000000,
    skipTurns: 0,
  },
  {
    id: 1,
    name: 'MarbleKing',
    color: PLAYER_COLORS[1],
    pos: 0,
    money: 1000000000,
    skipTurns: 0,
  },
  {
    id: 2,
    name: 'Player 3',
    color: PLAYER_COLORS[2],
    pos: 0,
    money: 1000000000,
    skipTurns: 0,
  },
  {
    id: 3,
    name: 'Player 4',
    color: PLAYER_COLORS[3],
    pos: 0,
    money: 1000000000,
    skipTurns: 0,
  },
]

export function getStripColor(tile: TileData): string | null {
  if (tile.type === 'PROPERTY') return tile.color ?? null
  if (tile.type === 'EVENT') return '#EF5350'
  if (tile.type === 'CHANCE') return '#FFD15B'
  if (tile.type === 'AI') return '#000000'
  return null
}

export function getBuildCost(
  basePrice: number,
  currentLevel: BuildingLevel
): number {
  if (currentLevel === 0) return basePrice * 0.5 // 집 1채
  if (currentLevel === 1) return basePrice * 0.5 // 집 2채
  if (currentLevel === 2) return basePrice * 0.5 // 집 3채
  if (currentLevel === 3) return basePrice * 1.0 // 호텔 1
  if (currentLevel === 4) return basePrice * 1.0 // 호텔 2
  if (currentLevel === 5) return basePrice * 1.0 // 호텔 3
  if (currentLevel === 6) return basePrice * 2.0 // 랜드마크
  return 0
}

export function getTollCost(
  basePrice: number,
  currentLevel: BuildingLevel
): number {
  // 기본 통행료 = basePrice
  if (currentLevel === 0) return basePrice
  if (currentLevel === 1) return basePrice * 2
  if (currentLevel === 2) return basePrice * 3
  if (currentLevel === 3) return basePrice * 5
  if (currentLevel === 4) return basePrice * 7
  if (currentLevel === 5) return basePrice * 9
  if (currentLevel === 6) return basePrice * 12
  if (currentLevel === 7) return basePrice * 15
  return basePrice
}
