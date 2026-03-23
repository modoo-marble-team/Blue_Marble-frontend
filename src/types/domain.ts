export type RoomId = string
export type GameId = string
export type PlayerId = number | string
export type Money = number

export type BuildingLevel = 0 | 1 | 2 | 3

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

export type TransportTileType =
  | 'START'
  | 'PROPERTY'
  | 'CHANCE'
  | 'MOVE_TO_ISLAND'
  | 'ISLAND'

export type GamePhase =
  | 'waiting'
  | 'rolling'
  | 'moving'
  | 'resolving'
  | 'prompt'
  | 'finished'

export type PlayerStateType =
  | 'normal'
  | 'island'
  | 'locked'
  | 'bankrupt'
  | 'disconnected'

export type GlobalEffectType =
  | 'PANDEMIC'
  | 'FESTIVAL'
  | 'INFLATION'
  | 'DEFLATION'

export interface GlobalEffectState {
  type: 'TOLL_MULTIPLIER' | 'PRICE_MULTIPLIER'
  effect: GlobalEffectType
  duration: number
  multiplier: number
  description: string
}

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
  ownerId?: PlayerId | null
  owner_id?: PlayerId | null
  building: BuildingLevel
  name: string
  type: TileType
  transportType?: TransportTileType
  price?: Money
  color?: string
}

export interface Player {
  id: PlayerId
  nickname: string
  position: number
  balance: Money
  owned_tiles: number[]
  is_in_jail: boolean
  jail_turn_count: number
  is_bankrupt: boolean
  state?: PlayerStateType
  stateDuration?: number
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
  player_id: PlayerId
  nickname: string
  final_assets: Money
  is_winner: boolean
}

export type GameResult = {
  reason:
    | 'bankrupt'
    | 'round_limit'
    | 'last_player_standing'
    | 'max_rounds'
    | 'disconnect_timeout'
  rankings?: GameRanking[]
  winner?: {
    playerId: PlayerId
    nickname: string
    balance: Money
    assets: Money
  } | null
}

export interface GamePromptChoice {
  id: string
  label: string
  value: string
  description?: string
}

export interface GamePrompt {
  id: string
  type: string
  playerId?: PlayerId | null
  title?: string
  message?: string
  timeoutSec?: number
  choices?: GamePromptChoice[]
  payload?: Record<string, unknown>
}

export interface GamePromptResponse {
  promptId: string
  choice: string
  payload?: Record<string, unknown>
}

export interface GameAck {
  actionId: string
  type?: string
  ok: boolean
  revision?: number
  promptId?: string | null
  error?: { code: string; message: string }
  payload?: Record<string, unknown>
}

export interface GameError {
  code: string
  message: string
  retryable?: boolean
  actionId?: string
}

export interface ServerEvent {
  id?: string
  type: string
  playerId?: PlayerId | null
  tileIndex?: number | null
  amount?: Money
  payload?: Record<string, unknown>
}

export type GamePatchPath = string | Array<string | number>

export type GamePatchOperation =
  | {
      op: 'set'
      path: GamePatchPath
      value: unknown
    }
  | {
      op: 'inc'
      path: GamePatchPath
      value: number
    }
  | {
      op: 'push'
      path: GamePatchPath
      value: unknown
    }
  | {
      op: 'remove'
      path: GamePatchPath
      index?: number
      value?: unknown
    }

export interface PendingGameAction {
  actionId: string
  type: string
  requestedAt: number
  payload?: Record<string, unknown>
}

export interface GameConnectionMeta {
  roomId: RoomId | null
  gameId: GameId | null
  transport: 'legacy-rest' | 'legacy-socket' | 'event-socket' | null
  syncedAt: string | null
}

export interface GameSnapshot {
  roomId?: RoomId | null
  gameId?: GameId | null
  revision: number
  phase: GamePhase
  players: Player[]
  tiles: Tile[]
  currentPlayerId: PlayerId | null
  currentTurn?: PlayerId | null
  round: number
  turnTimeoutSec: number
  prompt?: GamePrompt | null
  gameResult?: GameResult | null
  isGameOver?: boolean
  winnerId?: PlayerId | null
  activeGlobalEffect?: GlobalEffectState | null
}

export interface GamePatchEnvelope {
  gameId?: GameId
  revision: number
  turn?: number
  patch: GamePatchOperation[]
  events?: ServerEvent[]
}

export interface GameTimerSync {
  gameId?: GameId | null
  turnRemainingSec?: number | null
  promptId?: string | null
  promptRemainingSec?: number | null
  syncedAt?: string | null
}

export interface GameState extends GameSnapshot {
  messages: ChatMessage[]
  // 기존 화면과의 호환을 위해 currentTurn alias를 유지한다.
  currentTurn: PlayerId | null
  turnTimerKey: number
  activeModal: ActiveModal
  prompt: GamePrompt | null
  pendingAction: PendingGameAction | null
  lastAck: GameAck | null
  lastError: GameError | null
  eventQueue: ServerEvent[]
  session: GameConnectionMeta
  gameResult: GameResult | null
  isGameOver: boolean
  winnerId: PlayerId | null
  activeGlobalEffect: GlobalEffectState | null
}
