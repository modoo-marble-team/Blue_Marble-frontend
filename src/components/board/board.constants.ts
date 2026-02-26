export type TileType = 'corner' | 'city' | 'chance' | 'event' | 'ai'
export type TileDir = 'top' | 'bottom' | 'left' | 'right' | 'corner'

export interface TileData {
  id: number
  name: string
  type: TileType
  color?: string
  emoji?: string
}

export interface PlayerState {
  id: number
  name: string
  color: string
  pos: number
  money: number
}

export const TILES: TileData[] = [
  { id: 0, name: 'START', type: 'corner', emoji: '🚩' },
  { id: 1, name: '수원', type: 'city', color: '#EF5350' },
  { id: 2, name: '용인', type: 'city', color: '#FFD15B' },
  { id: 3, name: '?', type: 'chance', emoji: '❓' },
  { id: 4, name: '군산', type: 'city', color: '#66BB6A' },
  { id: 5, name: '평택', type: 'city', color: '#42A5F5' },
  { id: 6, name: '익산', type: 'city', color: '#42A5F5' },
  { id: 7, name: '이벤트', type: 'event', emoji: '🎁' },
  { id: 8, name: '무인도', type: 'corner', emoji: '🏝️' },
  { id: 9, name: '앙양', type: 'city', color: '#FF7043' },
  { id: 10, name: '포포', type: 'city', color: '#7E57C2' },
  { id: 11, name: '용포', type: 'city', color: '#26A69A' },
  { id: 12, name: '나포', type: 'city', color: '#66BB6A' },
  { id: 13, name: '?', type: 'chance', emoji: '❓' },
  { id: 14, name: '목포', type: 'city', color: '#EF5350' },
  { id: 15, name: '여수', type: 'city', color: '#EF5350' },
  { id: 16, name: '국내여행', type: 'corner', emoji: '✈️' },
  { id: 17, name: '제주', type: 'city', color: '#42A5F5' },
  { id: 18, name: '여수', type: 'city', color: '#26A69A' },
  { id: 19, name: '광주', type: 'city', color: '#66BB6A' },
  { id: 20, name: 'AI', type: 'ai', color: '#111111', emoji: '🤖' },
  { id: 21, name: '춘천', type: 'city', color: '#7E57C2' },
  { id: 22, name: '강릉', type: 'city', color: '#7E57C2' },
  { id: 23, name: '원주', type: 'city', color: '#FF7043' },
  { id: 24, name: '무인도\n이동칸', type: 'corner', emoji: '👮' },
  { id: 25, name: '춘포', type: 'city', color: '#42A5F5' },
  { id: 26, name: '원포', type: 'city', color: '#42A5F5' },
  { id: 27, name: '?', type: 'chance', emoji: '❓' },
  { id: 28, name: '대전', type: 'city', color: '#66BB6A' },
  { id: 29, name: '인천', type: 'city', color: '#7E57C2' },
  { id: 30, name: '이벤트', type: 'event', emoji: '🎁' },
  { id: 31, name: '서울', type: 'city', color: '#FF7043' },
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
  { id: 0, name: 'GoormEE', color: PLAYER_COLORS[0], pos: 0, money: 2000 },
  { id: 1, name: 'MarbleKing', color: PLAYER_COLORS[1], pos: 0, money: 1800 },
  { id: 2, name: 'Player 3', color: PLAYER_COLORS[2], pos: 0, money: 1500 },
  { id: 3, name: 'Player 4', color: PLAYER_COLORS[3], pos: 0, money: 1400 },
]

export function getStripColor(tile: TileData): string | null {
  if (tile.type === 'city') return tile.color ?? null
  if (tile.type === 'event') return '#EF5350'
  if (tile.type === 'chance') return '#FFD15B'
  if (tile.type === 'ai') return tile.color ?? '#111111'
  return null
}
