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

export interface Tile {
  id: number
  index: number // Added index as store uses t.index
  name: string
  type: TileType
  price?: number
  toll?: number[]
  ownerId?: string | null
  buildingLevel: BuildingLevel
}

export interface Player {
  id: string
  nickname: string
  money: number
  position: number
  isBankrupt: boolean
  isJailed: boolean
  jailTurns: number
  color: string
}

export type ActiveModal = 'buy' | 'card' | 'penalty' | 'bankrupt' | null

export type GameResult = {
  reason: 'bankrupt' | 'round_limit'
  rankings: {
    rank: number
    playerId: string
    nickname: string
    finalAssets: number
    isWinner: boolean
  }[]
}

export interface GameState {
  players: Player[]
  tiles: Tile[]
  currentTurnId: string | null
  round: number
  activeModal: ActiveModal
  gameResult: GameResult | null
  isGameOver: boolean // Added for convenience
  winnerId: string | null // Added for convenience
}
