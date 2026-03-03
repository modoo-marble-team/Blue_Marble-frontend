export type TileType =
  | 'start'
  | 'island'
  | 'travel'
  | 'go_to_island'
  | 'city'
  | 'chance'
  | 'event'
  | 'ai'
export type TileDir = 'top' | 'bottom' | 'left' | 'right' | 'corner'

// 0: 미구매, 1: 집1, 2: 집2, 3: 집3, 4: 호텔, 5: 랜드마크
export type BuildingLevel = 0 | 1 | 2 | 3 | 4 | 5

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
}

export const TILES: TileData[] = [
  { id: 0, name: 'START', type: 'start', emoji: '🚩' },
  { id: 1, name: '수원', type: 'city', color: '#EF5350', price: 100000000 },
  { id: 2, name: '용인', type: 'city', color: '#FFD15B', price: 120000000 },
  { id: 3, name: '?', type: 'chance', svgIcon: '/event-question.svg' },
  { id: 4, name: '군산', type: 'city', color: '#66BB6A', price: 140000000 },
  { id: 5, name: '평택', type: 'city', color: '#42A5F5', price: 160000000 },
  { id: 6, name: '익산', type: 'city', color: '#42A5F5', price: 180000000 },
  { id: 7, name: '이벤트', type: 'event', svgIcon: '/chance-box.svg' },
  { id: 8, name: '무인도', type: 'island', emoji: '🏝️' },
  { id: 9, name: '경주', type: 'city', color: '#FF7043', price: 200000000 },
  { id: 10, name: '?', type: 'chance', svgIcon: '/event-question.svg' },
  { id: 11, name: '포항', type: 'city', color: '#26A69A', price: 240000000 },
  { id: 12, name: '대구', type: 'city', color: '#66BB6A', price: 280000000 },
  { id: 13, name: '청원', type: 'city', color: '#7E57C2', price: 320000000 },
  { id: 14, name: '울산', type: 'city', color: '#EF5350', price: 360000000 },
  { id: 15, name: '부산', type: 'city', color: '#EF5350', price: 400000000 },
  { id: 16, name: '국내여행', type: 'travel', emoji: '✈️' },
  { id: 17, name: '제주', type: 'city', color: '#42A5F5', price: 500000000 },
  { id: 18, name: '여수', type: 'city', color: '#26A69A', price: 550000000 },
  { id: 19, name: '광주', type: 'city', color: '#66BB6A', price: 600000000 },
  { id: 20, name: 'AI', type: 'ai', color: '#111111', svgIcon: '/ai-head.png' },
  { id: 21, name: '춘천', type: 'city', color: '#7E57C2', price: 650000000 },
  { id: 22, name: '강릉', type: 'city', color: '#7E57C2', price: 700000000 },
  { id: 23, name: '원주', type: 'city', color: '#FF7043', price: 750000000 },
  { id: 24, name: '무인도\n이동칸', type: 'go_to_island', emoji: '👮' },
  { id: 25, name: '청주', type: 'city', color: '#42A5F5', price: 800000000 },
  { id: 26, name: '천안', type: 'city', color: '#42A5F5', price: 900000000 },
  { id: 27, name: '?', type: 'chance', svgIcon: '/event-question.svg' },
  { id: 28, name: '대전', type: 'city', color: '#66BB6A', price: 1000000000 },
  { id: 29, name: '인천', type: 'city', color: '#7E57C2', price: 1100000000 },
  { id: 30, name: '이벤트', type: 'event', svgIcon: '/chance-box.svg' },
  { id: 31, name: '서울', type: 'city', color: '#FF7043', price: 1200000000 },
]

export const TOP_ROW = [16, 17, 18, 19, 20, 21, 22, 23, 24]
export const BOTTOM_ROW = [8, 7, 6, 5, 4, 3, 2, 1, 0]
export const LEFT_COL = [15, 14, 13, 12, 11, 10, 9]
export const RIGHT_COL = [25, 26, 27, 28, 29, 30, 31]

export const CORNER_SIZE = 90
export const STRAIGHT_SIZE = 70
export const GRID_GAP = 2

export const PLAYER_COLORS = ['#EF5350', '#42A5F5', '#66BB6A', '#FFD15B']

export const INIT_PLAYERS: PlayerState[] = [
  {
    id: 0,
    name: 'GoormEE',
    color: PLAYER_COLORS[0],
    pos: 0,
    money: 1000000000,
  },
  {
    id: 1,
    name: 'MarbleKing',
    color: PLAYER_COLORS[1],
    pos: 0,
    money: 1000000000,
  },
  {
    id: 2,
    name: 'Player 3',
    color: PLAYER_COLORS[2],
    pos: 0,
    money: 1000000000,
  },
  {
    id: 3,
    name: 'Player 4',
    color: PLAYER_COLORS[3],
    pos: 0,
    money: 1000000000,
  },
]

export function getStripColor(tile: TileData): string | null {
  if (tile.type === 'city') return tile.color ?? null
  if (tile.type === 'event') return '#EF5350'
  if (tile.type === 'chance') return '#FFD15B'
  if (tile.type === 'ai') return tile.color ?? '#111111'
  return null
}

export function getBuildCost(
  basePrice: number,
  currentLevel: BuildingLevel
): number {
  if (currentLevel === 0) return basePrice * 0.5 // 집 1채
  if (currentLevel === 1) return basePrice * 0.5 // 집 2채
  if (currentLevel === 2) return basePrice * 0.5 // 집 3채
  if (currentLevel === 3) return basePrice * 1.0 // 호텔
  if (currentLevel === 4) return basePrice * 1.5 // 랜드마크
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
  if (currentLevel === 5) return basePrice * 10
  return basePrice
}
