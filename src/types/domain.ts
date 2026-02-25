export type BuildingLevel = 0 | 1 | 2 | 3 | 4 | 5

export type TileType =
  | 'start'
  | 'property'
  | 'chance'
  | 'jail'
  | 'tax'
  | 'park'
  | 'penalty'
  | 'airport'
  | 'card'

export interface Card {
  title: string
  description: string
  effect_type: string
  effect_value: number
}

export interface Tile {
  index: number
  owner_id?: string | null
  building: BuildingLevel
  name?: string
  type?: TileType
}

export interface Player {
  id: string
  nickname: string
  position: number
  balance: number
  owned_tiles: number[]
  is_in_jail: boolean
  jail_turn_count: number
  is_bankrupt: boolean
  color: string
}

export type ActiveModal = 'buy' | 'card' | 'penalty' | 'bankrupt' | null

export type GameRanking = {
  rank: number
  player_id: string
  nickname: string
  final_assets: number
  is_winner: boolean
}

export type GameResult = {
  reason: 'bankrupt' | 'round_limit'
  rankings: GameRanking[]
}

export interface GameState {
  players: Player[]
  tiles: Tile[]
  currentTurn: string | null // 프론트 내부 상태 — camelCase 통일
  round: number
  activeModal: ActiveModal
  gameResult: GameResult | null
  isGameOver: boolean
  winnerId: string | null
}
