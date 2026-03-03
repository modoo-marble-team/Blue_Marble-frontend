export type BuildingLevel = 0 | 1 | 2 | 3 | 4 | 5

export type TileType =
  | 'start'
  | 'island'
  | 'travel'
  | 'go_to_island'
  | 'property'
  | 'chance'
  | 'jail'
  | 'tax'
  | 'park'
  | 'penalty'
  | 'airport'
  | 'card'
  | 'city'
  | 'event'
  | 'ai'

export interface Card {
  title: string
  description: string
  effect_type: string
  effect_value: number
}

export interface ChatMessage {
  id: string
  sender_id: string
  sender_nickname: string
  content: string
  timestamp: string
  type: 'talk'
}

export interface Tile {
  index: number
  owner_id?: string | null
  building: BuildingLevel
  name: string
  type: TileType
  price?: number
  color?: string
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
  avatar?: string
}

export type ActiveModal =
  | 'buy'
  | 'build'
  | 'card'
  | 'toll'
  | 'penalty'
  | 'bankrupt'
  | 'result'
  | null

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
  messages: ChatMessage[]
  // 프런트 내부 상태는 camelCase 기준으로 관리한다.
  currentTurn: string | null
  round: number
  turnTimeoutSec: number
  turnTimerKey: number
  activeModal: ActiveModal
  gameResult: GameResult | null
  isGameOver: boolean
  winnerId: string | null
}
