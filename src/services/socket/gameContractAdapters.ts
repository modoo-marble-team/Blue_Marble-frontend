import type {
  GamePatchEnvelope,
  GamePatchOperation,
  GamePrompt,
  GamePromptChoice,
  GameRanking,
  GameResult,
  GameSnapshot,
  GameTimerSync,
  Player,
  PlayerId,
  ServerEvent,
  Tile,
} from '../../types/domain'

type PromptCompatPayload = Partial<GamePrompt> & {
  promptId?: string | null
  timeoutMs?: number | null
  payload?: Record<string, unknown>
}

type SnapshotNormalizeOptions = {
  envelopeRevision: number
  envelopeGameId?: string | null
}

const DEFAULT_TURN_TIMEOUT_SEC = 30
const DEFAULT_PLAYER_COLOR = '#94A3B8'
const DEFAULT_INITIAL_BALANCE = 5_000_000_000
const MONEY_UNIT_SCALE = 1_000_000
const MONEY_ALREADY_WON_THRESHOLD = 10_000_000
const MONEY_KEYS = new Set([
  'amount',
  'balance',
  'buildCost',
  'build_cost',
  'buyoutCost',
  'buyout_cost',
  'cash',
  'cost',
  'landPrice',
  'land_price',
  'money',
  'price',
  'purchaseCost',
  'purchase_cost',
  'refund',
  'nextToll',
  'next_toll',
  'nextTollCost',
  'next_toll_cost',
  'sellPrice',
  'sell_price',
  'toll',
  'tollAmount',
  'toll_amount',
  'acquisitionCost',
  'acquisition_cost',
])

const PHASE_TO_INTERNAL_MAP: Record<string, GameSnapshot['phase']> = {
  WAIT_ROLL: 'rolling',
  MOVING: 'moving',
  RESOLVING: 'resolving',
  WAIT_PROMPT: 'prompt',
  TURN_END: 'resolving',
  GAME_OVER: 'finished',
  FINISHED: 'finished',
}

const TILE_TYPE_TO_INTERNAL_MAP: Record<string, Tile['type']> = {
  START: 'start',
  PROPERTY: 'property',
  EVENT: 'event',
  CHANCE: 'chance',
  MOVE_TO_ISLAND: 'go_to_island',
  ISLAND: 'island',
}

const PLAYER_STATE_TO_INTERNAL_MAP: Record<string, Player['state']> = {
  NORMAL: 'normal',
  LOCKED: 'locked',
  BANKRUPT: 'bankrupt',
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const toFiniteNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number.parseFloat(value)
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }

  return null
}

const toFiniteInt = (value: unknown, fallback = 0) => {
  const numericValue = toFiniteNumber(value)
  if (numericValue == null) {
    return fallback
  }

  return Math.trunc(numericValue)
}

const toStringOrNull = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value : null

const toRemainingSeconds = (
  secCandidates: unknown[],
  msCandidates: unknown[]
): number | null => {
  for (const candidate of secCandidates) {
    const secValue = toFiniteNumber(candidate)
    if (secValue != null) {
      return secValue
    }
  }

  for (const candidate of msCandidates) {
    const msValue = toFiniteNumber(candidate)
    if (msValue != null) {
      return Math.ceil(msValue / 1000)
    }
  }

  return null
}

const toPlayerIdOrNull = (value: unknown): PlayerId | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.trunc(value)
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    return value
  }

  return null
}

const toPlayerId = (value: unknown, fallback: PlayerId): PlayerId =>
  toPlayerIdOrNull(value) ?? fallback

const normalizeMoneyToWon = (value: unknown, fallback = 0) => {
  const numericValue = toFiniteNumber(value)

  if (numericValue == null) {
    const fallbackInt = Math.trunc(fallback)
    if (!Number.isFinite(fallbackInt) || fallbackInt === 0) {
      return 0
    }
    if (Math.abs(fallbackInt) >= MONEY_ALREADY_WON_THRESHOLD) {
      return fallbackInt
    }
    return fallbackInt * MONEY_UNIT_SCALE
  }

  const raw = Math.trunc(numericValue)

  if (!Number.isFinite(raw) || raw === 0) {
    return 0
  }

  if (Math.abs(raw) >= MONEY_ALREADY_WON_THRESHOLD) {
    return raw
  }

  return raw * MONEY_UNIT_SCALE
}

const resolvePlayerBalance = (playerRecord: Record<string, unknown>) => {
  const rawBalance =
    playerRecord.balance ??
    playerRecord.money ??
    playerRecord.cash ??
    playerRecord.initialBalance ??
    playerRecord.initial_balance ??
    playerRecord.startBalance ??
    playerRecord.start_balance ??
    playerRecord.funds ??
    playerRecord.capital

  if (rawBalance == null) {
    return DEFAULT_INITIAL_BALANCE
  }

  return normalizeMoneyToWon(rawBalance, DEFAULT_INITIAL_BALANCE)
}

const normalizeMoneyRecord = (record: Record<string, unknown>) => {
  const normalized: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(record)) {
    if (MONEY_KEYS.has(key)) {
      normalized[key] = normalizeMoneyToWon(value, 0)
      continue
    }

    normalized[key] = value
  }

  return normalized
}

const normalizeServerEvent = (eventPayload: unknown): ServerEvent | null => {
  if (!isRecord(eventPayload)) {
    return null
  }

  const eventType =
    toStringOrNull(eventPayload.type) ??
    toStringOrNull(eventPayload.eventType) ??
    toStringOrNull(eventPayload.event_type) ??
    ''

  if (!eventType) {
    return null
  }

  const payloadRecord =
    eventPayload.payload && isRecord(eventPayload.payload)
      ? normalizeMoneyRecord(eventPayload.payload)
      : undefined

  const normalizedAmountRaw =
    eventPayload.amount ?? eventPayload.toll ?? eventPayload.tollAmount
  const normalizedAmount =
    normalizedAmountRaw !== undefined
      ? normalizeMoneyToWon(normalizedAmountRaw, 0)
      : undefined

  return {
    ...eventPayload,
    id: toStringOrNull(eventPayload.id) ?? undefined,
    type: eventType,
    playerId:
      toPlayerIdOrNull(eventPayload.playerId) ??
      toPlayerIdOrNull(eventPayload.fromPlayerId) ??
      toPlayerIdOrNull(eventPayload.from_player_id) ??
      toPlayerIdOrNull(eventPayload.player_id) ??
      null,
    tileIndex:
      toFiniteNumber(eventPayload.tileIndex ?? eventPayload.toTileId) ?? null,
    amount: normalizedAmount,
    payload: payloadRecord,
  }
}

const normalizeTileType = (value: unknown): Tile['type'] => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return 'event'
  }

  const normalized = value.trim().toUpperCase()
  if (normalized in TILE_TYPE_TO_INTERNAL_MAP) {
    return TILE_TYPE_TO_INTERNAL_MAP[normalized]
  }

  const lowered = normalized.toLowerCase()
  return lowered as Tile['type']
}

const normalizeTransportTileType = (value: unknown): Tile['transportType'] => {
  if (typeof value !== 'string') {
    return undefined
  }

  const normalized = value.trim().toUpperCase()
  if (normalized in TILE_TYPE_TO_INTERNAL_MAP) {
    return normalized as Tile['transportType']
  }

  return undefined
}

export const normalizePlayerState = (value: unknown): Player['state'] => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return undefined
  }

  const normalized = value.trim().toUpperCase()
  if (normalized in PLAYER_STATE_TO_INTERNAL_MAP) {
    return PLAYER_STATE_TO_INTERNAL_MAP[normalized]
  }

  return normalized.toLowerCase() as Player['state']
}

export const normalizePhase = (phase: unknown): GameSnapshot['phase'] => {
  if (typeof phase !== 'string') {
    return 'waiting'
  }

  const normalizedPhase = phase.trim().toUpperCase()
  return PHASE_TO_INTERNAL_MAP[normalizedPhase] ?? 'waiting'
}

export const normalizePromptChoiceValue = (choice: unknown): string =>
  typeof choice === 'string' ? choice.trim().toUpperCase() : ''

const normalizePromptChoice = (
  choice: unknown,
  fallbackIndex: number
): GamePromptChoice | null => {
  if (typeof choice === 'string') {
    const value = normalizePromptChoiceValue(choice)
    if (!value) {
      return null
    }

    return {
      id: `${value.toLowerCase()}-${fallbackIndex}`,
      label: value,
      value,
      description: undefined,
    }
  }

  if (!isRecord(choice)) {
    return null
  }

  const value = normalizePromptChoiceValue(
    choice.value ?? choice.id ?? choice.label
  )
  if (!value) {
    return null
  }

  const explicitId = toStringOrNull(choice.id)
  const explicitLabel = toStringOrNull(choice.label)
  const explicitDescription = toStringOrNull(choice.description)

  return {
    id: explicitId ?? `${value.toLowerCase()}-${fallbackIndex}`,
    label: explicitLabel ?? value,
    value,
    description: explicitDescription ?? undefined,
  }
}

export const normalizePromptPayload = (
  promptPayload: unknown
): GamePrompt | null => {
  if (!isRecord(promptPayload)) {
    return null
  }

  const promptCompatPayload = promptPayload as PromptCompatPayload
  const promptIdCandidate =
    (typeof promptCompatPayload.promptId === 'string' &&
      promptCompatPayload.promptId) ||
    (typeof promptCompatPayload.id === 'string' && promptCompatPayload.id) ||
    null
  const promptId = promptIdCandidate?.trim()

  if (!promptId) {
    return null
  }

  const payloadRecordRaw =
    promptCompatPayload.payload && isRecord(promptCompatPayload.payload)
      ? promptCompatPayload.payload
      : undefined
  const payloadRecord = payloadRecordRaw
    ? normalizeMoneyRecord(payloadRecordRaw)
    : undefined

  const timeoutSecFromPayload = toFiniteNumber(
    payloadRecord ? payloadRecord.timeoutSec : undefined
  )
  const timeoutMsFromPayload = toFiniteNumber(
    payloadRecord ? payloadRecord.timeoutMs : undefined
  )
  const timeoutSecDirect = toFiniteNumber(promptCompatPayload.timeoutSec)
  const timeoutMsDirect = toFiniteNumber(promptCompatPayload.timeoutMs)

  const timeoutSecRaw =
    timeoutSecDirect ??
    timeoutSecFromPayload ??
    (timeoutMsDirect != null
      ? Math.ceil(timeoutMsDirect / 1000)
      : timeoutMsFromPayload != null
        ? Math.ceil(timeoutMsFromPayload / 1000)
        : null)
  const timeoutSec =
    timeoutSecRaw != null && timeoutSecRaw > 0 ? timeoutSecRaw : undefined

  const normalizedChoices = Array.isArray(promptCompatPayload.choices)
    ? promptCompatPayload.choices
        .map((choice, index) => normalizePromptChoice(choice, index))
        .filter((choice): choice is GamePromptChoice => choice !== null)
    : undefined
  const normalizedPromptPlayerId =
    toPlayerIdOrNull(promptCompatPayload.playerId) ??
    toPlayerIdOrNull(payloadRecordRaw?.playerId) ??
    toPlayerIdOrNull(payloadRecordRaw?.player_id)

  return {
    id: promptId,
    type:
      typeof promptCompatPayload.type === 'string' &&
      promptCompatPayload.type.trim().length > 0
        ? promptCompatPayload.type
        : 'UNKNOWN_PROMPT',
    playerId: normalizedPromptPlayerId,
    title:
      typeof promptCompatPayload.title === 'string' &&
      promptCompatPayload.title.trim().length > 0
        ? promptCompatPayload.title
        : undefined,
    message:
      typeof promptCompatPayload.message === 'string' &&
      promptCompatPayload.message.trim().length > 0
        ? promptCompatPayload.message
        : undefined,
    timeoutSec,
    choices: normalizedChoices,
    payload: payloadRecord,
  }
}

const normalizeOwnedTileIds = (value: unknown): number[] => {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((item) => {
      if (typeof item === 'number') {
        return Math.trunc(item)
      }

      if (typeof item === 'string') {
        const parsed = Number.parseInt(item, 10)
        return Number.isFinite(parsed) ? parsed : Number.NaN
      }

      if (isRecord(item)) {
        return toFiniteInt(item.tileId, Number.NaN)
      }

      return Number.NaN
    })
    .filter((tileId) => Number.isFinite(tileId))
}

const normalizePlayerFromSnapshot = (
  playerPayload: unknown,
  fallbackIndex: number
): Player => {
  const playerRecord = isRecord(playerPayload) ? playerPayload : {}
  const state = normalizePlayerState(
    playerRecord.playerState ?? playerRecord.player_state ?? playerRecord.state
  )
  const stateDuration = toFiniteInt(
    playerRecord.stateDuration ??
      playerRecord.state_duration ??
      playerRecord.jail_turn_count,
    0
  )

  return {
    id: toPlayerId(
      playerRecord.id ?? playerRecord.playerId ?? playerRecord.player_id,
      fallbackIndex
    ),
    nickname:
      toStringOrNull(playerRecord.nickname) ??
      toStringOrNull(playerRecord.name) ??
      `Player ${fallbackIndex + 1}`,
    position: toFiniteInt(
      playerRecord.position ??
        playerRecord.currentTileId ??
        playerRecord.current_tile_id ??
        playerRecord.tileId,
      0
    ),
    balance: toFiniteInt(resolvePlayerBalance(playerRecord), 0),
    owned_tiles: normalizeOwnedTileIds(
      playerRecord.owned_tiles ?? playerRecord.ownedTiles
    ),
    is_in_jail:
      Boolean(playerRecord.is_in_jail) ||
      state === 'locked' ||
      state === 'island',
    jail_turn_count: stateDuration,
    is_bankrupt: Boolean(playerRecord.is_bankrupt) || state === 'bankrupt',
    state,
    stateDuration,
    color: toStringOrNull(playerRecord.color) ?? DEFAULT_PLAYER_COLOR,
    avatar: toStringOrNull(playerRecord.avatar) ?? undefined,
  }
}

const clampBuildingLevel = (value: unknown): Tile['building'] => {
  const level = toFiniteInt(value, 0)
  const clamped = Math.min(Math.max(level, 0), 3)
  return clamped as Tile['building']
}

const normalizeTileFromSnapshot = (
  tilePayload: unknown,
  fallbackIndex: number
): Tile => {
  const tileRecord = isRecord(tilePayload) ? tilePayload : {}
  const index = toFiniteInt(
    tileRecord.index ??
      tileRecord.id ??
      tileRecord.tileId ??
      tileRecord.tile_id,
    fallbackIndex
  )
  const ownerId =
    tileRecord.ownerId ??
    tileRecord.owner_id ??
    tileRecord.ownerPlayerId ??
    tileRecord.owner_player_id ??
    null
  const tileTypeRaw =
    tileRecord.tileType ?? tileRecord.type ?? tileRecord.tile_type

  return {
    index,
    ownerId: ownerId as Tile['ownerId'],
    owner_id: ownerId as Tile['owner_id'],
    building: clampBuildingLevel(
      tileRecord.building ??
        tileRecord.buildingLevel ??
        tileRecord.building_level ??
        0
    ),
    name: toStringOrNull(tileRecord.name) ?? `Tile ${index}`,
    type: normalizeTileType(tileTypeRaw),
    transportType: normalizeTransportTileType(tileTypeRaw),
    price: (() => {
      const rawPrice =
        tileRecord.price ??
        tileRecord.landPrice ??
        tileRecord.purchasePrice ??
        tileRecord.purchase_price ??
        tileRecord.cost

      const normalizedPrice = toFiniteNumber(rawPrice)
      if (normalizedPrice == null) {
        return undefined
      }

      return normalizeMoneyToWon(normalizedPrice, 0)
    })(),
    color: toStringOrNull(tileRecord.color) ?? undefined,
  }
}

const normalizeGameResultReason = (value: unknown): GameResult['reason'] => {
  if (typeof value !== 'string') {
    return 'max_rounds'
  }

  const normalizedReason = value.trim().toLowerCase()
  if (normalizedReason === 'last_player_standing') {
    return 'last_player_standing'
  }
  if (normalizedReason === 'max_rounds') {
    return 'max_rounds'
  }
  if (normalizedReason === 'disconnect_timeout') {
    return 'disconnect_timeout'
  }
  if (normalizedReason === 'round_limit') {
    return 'round_limit'
  }
  if (normalizedReason === 'bankrupt') {
    return 'bankrupt'
  }

  return 'max_rounds'
}

const normalizeGameRanking = (
  rankingPayload: unknown,
  fallbackRank: number
): GameRanking | null => {
  if (!isRecord(rankingPayload)) {
    return null
  }

  const playerId = toPlayerIdOrNull(
    rankingPayload.player_id ??
      rankingPayload.playerId ??
      rankingPayload.id ??
      rankingPayload.userId
  )
  if (playerId == null) {
    return null
  }

  const nickname =
    toStringOrNull(rankingPayload.nickname) ??
    toStringOrNull(rankingPayload.name) ??
    `Player ${String(playerId)}`

  const finalAssetsRaw =
    rankingPayload.final_assets ??
    rankingPayload.finalAssets ??
    rankingPayload.assets

  return {
    rank: Math.max(
      1,
      toFiniteInt(rankingPayload.rank ?? rankingPayload.order, fallbackRank)
    ),
    player_id: playerId,
    nickname,
    final_assets: normalizeMoneyToWon(finalAssetsRaw, 0),
    is_winner: Boolean(
      rankingPayload.is_winner ??
      rankingPayload.isWinner ??
      rankingPayload.winner
    ),
  }
}

const normalizeGameResultWinner = (
  winnerPayload: unknown
): GameResult['winner'] => {
  if (!isRecord(winnerPayload)) {
    return null
  }

  const playerId = toPlayerIdOrNull(
    winnerPayload.playerId ??
      winnerPayload.player_id ??
      winnerPayload.id ??
      winnerPayload.userId
  )
  if (playerId == null) {
    return null
  }

  const nickname =
    toStringOrNull(winnerPayload.nickname) ??
    toStringOrNull(winnerPayload.name) ??
    `Player ${String(playerId)}`

  return {
    playerId,
    nickname,
    balance: normalizeMoneyToWon(
      winnerPayload.balance ?? winnerPayload.money,
      0
    ),
    assets: normalizeMoneyToWon(
      winnerPayload.assets ??
        winnerPayload.final_assets ??
        winnerPayload.finalAssets,
      0
    ),
  }
}

const normalizeGameResultPayload = (
  gameResultPayload: unknown
): GameSnapshot['gameResult'] | null => {
  if (!isRecord(gameResultPayload)) {
    return null
  }

  const rankingsRaw = Array.isArray(gameResultPayload.rankings)
    ? gameResultPayload.rankings
    : Array.isArray(gameResultPayload.results)
      ? gameResultPayload.results
      : []

  const rankings = rankingsRaw
    .map((ranking, index) => normalizeGameRanking(ranking, index + 1))
    .filter((ranking): ranking is GameRanking => ranking !== null)

  const winnerFromPayload = normalizeGameResultWinner(gameResultPayload.winner)
  const winnerFromRankings =
    rankings.find((ranking) => ranking.is_winner) ??
    (rankings.length > 0 ? rankings[0] : null)
  const normalizedWinner =
    winnerFromPayload ??
    (winnerFromRankings
      ? {
          playerId: winnerFromRankings.player_id,
          nickname: winnerFromRankings.nickname,
          balance: 0,
          assets: winnerFromRankings.final_assets,
        }
      : null)

  return {
    reason: normalizeGameResultReason(
      gameResultPayload.reason ?? gameResultPayload.endReason
    ),
    rankings: rankings.length > 0 ? rankings : undefined,
    winner: normalizedWinner,
  }
}

const resolveWinnerIdFromGameResult = (
  gameResult: GameSnapshot['gameResult'] | null
): PlayerId | null => {
  if (!gameResult) {
    return null
  }

  if (gameResult.winner?.playerId != null) {
    return toPlayerIdOrNull(gameResult.winner.playerId)
  }

  const winnerRanking = gameResult.rankings?.find(
    (ranking) => ranking.is_winner
  )
  if (winnerRanking?.player_id != null) {
    return toPlayerIdOrNull(winnerRanking.player_id)
  }

  const firstRanking = gameResult.rankings?.[0]
  if (firstRanking?.player_id != null) {
    return toPlayerIdOrNull(firstRanking.player_id)
  }

  return null
}

export const normalizeSnapshotPayload = (
  snapshotPayload: unknown,
  options: SnapshotNormalizeOptions
): GameSnapshot | null => {
  if (!isRecord(snapshotPayload)) {
    return null
  }

  const playersRaw = Array.isArray(snapshotPayload.players)
    ? snapshotPayload.players
    : isRecord(snapshotPayload.players)
      ? Object.values(snapshotPayload.players)
      : []
  const tilesRaw = Array.isArray(snapshotPayload.tiles)
    ? snapshotPayload.tiles
    : isRecord(snapshotPayload.tiles)
      ? Object.values(snapshotPayload.tiles)
      : []
  const currentPlayerId = toPlayerIdOrNull(
    snapshotPayload.currentPlayerId ??
      snapshotPayload.current_player_id ??
      snapshotPayload.currentTurn ??
      null
  )
  const normalizedPhase = normalizePhase(snapshotPayload.phase)
  const roundFromTurn = toFiniteInt(snapshotPayload.turn, 1)
  const normalizedGameResult = normalizeGameResultPayload(
    snapshotPayload.gameResult ?? snapshotPayload.game_result
  )
  const normalizedWinnerId =
    toPlayerIdOrNull(snapshotPayload.winnerId ?? snapshotPayload.winner_id) ??
    resolveWinnerIdFromGameResult(normalizedGameResult) ??
    null
  const normalizedIsGameOver =
    Boolean(snapshotPayload.isGameOver ?? snapshotPayload.is_game_over) ||
    normalizedPhase === 'finished'

  return {
    roomId: toStringOrNull(snapshotPayload.roomId),
    gameId:
      toStringOrNull(snapshotPayload.gameId) ??
      toStringOrNull(options.envelopeGameId) ??
      null,
    revision: toFiniteInt(snapshotPayload.revision, options.envelopeRevision),
    phase: normalizedPhase,
    players: playersRaw.map(normalizePlayerFromSnapshot),
    tiles: tilesRaw.map(normalizeTileFromSnapshot),
    currentPlayerId,
    currentTurn: currentPlayerId,
    round: toFiniteInt(snapshotPayload.round, roundFromTurn),
    turnTimeoutSec: toFiniteInt(
      snapshotPayload.turnTimeoutSec,
      DEFAULT_TURN_TIMEOUT_SEC
    ),
    prompt: normalizePromptPayload(
      snapshotPayload.prompt ??
        snapshotPayload.pending_prompt ??
        snapshotPayload.pendingPrompt
    ),
    gameResult: normalizedGameResult,
    isGameOver: normalizedIsGameOver,
    winnerId: normalizedWinnerId,
  }
}

const toPathSegments = (
  path: GamePatchOperation['path']
): Array<string | number> => {
  if (Array.isArray(path)) {
    return path
  }

  return path
    .split('.')
    .map((segment) =>
      /^\d+$/.test(segment) ? Number.parseInt(segment, 10) : segment
    )
}

const toPathLike = (
  originalPath: GamePatchOperation['path'],
  segments: Array<string | number>
): GamePatchOperation['path'] => {
  if (Array.isArray(originalPath)) {
    return segments
  }

  return segments.map((segment) => String(segment)).join('.')
}

const normalizePathSegment = (segment: string | number): string | number => {
  if (typeof segment !== 'string') {
    return segment
  }

  if (segment === 'current_player_id') return 'currentPlayerId'
  if (segment === 'currentTileId') return 'position'
  if (segment === 'current_tile_id') return 'position'
  if (segment === 'playerState') return 'state'
  if (segment === 'player_state') return 'state'
  if (segment === 'money') return 'balance'
  if (segment === 'cash') return 'balance'
  if (segment === 'ownedTiles') return 'owned_tiles'
  if (segment === 'pending_prompt') return 'prompt'
  if (segment === 'pendingPrompt') return 'prompt'
  if (segment === 'winner_id') return 'winnerId'
  if (segment === 'is_game_over') return 'isGameOver'
  if (segment === 'game_result') return 'gameResult'
  if (segment === 'building_level') return 'building'
  if (segment === 'buildingLevel') return 'building'
  if (segment === 'tile_type') return 'type'
  if (segment === 'tileType') return 'type'
  return segment
}

const resolvePatchEntityFallbackIndex = (segment: string | number) => {
  if (typeof segment === 'number' && Number.isFinite(segment)) {
    return Math.max(0, Math.trunc(segment))
  }

  if (typeof segment === 'string' && /^\d+$/.test(segment)) {
    return Number.parseInt(segment, 10)
  }

  return 0
}

const normalizePatchSetValue = (
  pathSegments: Array<string | number>,
  value: unknown
) => {
  const lastSegment = pathSegments[pathSegments.length - 1]
  const firstSegment = pathSegments[0]

  if (pathSegments.length === 1 && firstSegment === 'phase') {
    return normalizePhase(value)
  }

  if (pathSegments.length === 1 && firstSegment === 'isGameOver') {
    return Boolean(value)
  }

  if (pathSegments.length === 1 && firstSegment === 'winnerId') {
    return toPlayerIdOrNull(value)
  }

  if (pathSegments.length === 1 && firstSegment === 'gameResult') {
    return normalizeGameResultPayload(value)
  }

  if (pathSegments.length === 1 && firstSegment === 'players') {
    if (Array.isArray(value)) {
      return value.map(normalizePlayerFromSnapshot)
    }
    if (isRecord(value)) {
      return Object.values(value).map(normalizePlayerFromSnapshot)
    }
    return []
  }

  if (pathSegments.length === 1 && firstSegment === 'tiles') {
    if (Array.isArray(value)) {
      return value.map(normalizeTileFromSnapshot)
    }
    if (isRecord(value)) {
      return Object.values(value).map(normalizeTileFromSnapshot)
    }
    return []
  }

  if (pathSegments.length === 1 && firstSegment === 'prompt') {
    return normalizePromptPayload(value)
  }

  if (
    pathSegments.length === 2 &&
    firstSegment === 'players' &&
    isRecord(value)
  ) {
    return normalizePlayerFromSnapshot(
      value,
      resolvePatchEntityFallbackIndex(pathSegments[1])
    )
  }

  if (
    pathSegments.length === 2 &&
    firstSegment === 'tiles' &&
    isRecord(value)
  ) {
    return normalizeTileFromSnapshot(
      value,
      resolvePatchEntityFallbackIndex(pathSegments[1])
    )
  }

  if (lastSegment === 'state') {
    return normalizePlayerState(value)
  }

  if (lastSegment === 'owned_tiles') {
    return normalizeOwnedTileIds(value)
  }

  if (lastSegment === 'position') {
    return toFiniteInt(value, 0)
  }

  if (lastSegment === 'balance') {
    return normalizeMoneyToWon(value, 0)
  }

  if (lastSegment === 'price') {
    return normalizeMoneyToWon(value, 0)
  }

  if (lastSegment === 'building') {
    return clampBuildingLevel(value)
  }

  if (lastSegment === 'type') {
    return normalizeTileType(value)
  }

  return value
}

const normalizePatchOperation = (operation: GamePatchOperation) => {
  const pathSegments = toPathSegments(operation.path).map(normalizePathSegment)
  const path = toPathLike(operation.path, pathSegments)
  const lastSegment = pathSegments[pathSegments.length - 1]

  if (operation.op === 'set') {
    return {
      ...operation,
      path,
      value: normalizePatchSetValue(pathSegments, operation.value),
    } as GamePatchOperation
  }

  if (operation.op === 'inc') {
    const normalizedValue =
      lastSegment === 'balance' || lastSegment === 'price'
        ? normalizeMoneyToWon(operation.value, 0)
        : toFiniteInt(operation.value, 0)
    return {
      ...operation,
      path,
      value: normalizedValue,
    } as GamePatchOperation
  }

  return {
    ...operation,
    path,
  } as GamePatchOperation
}

export const normalizePatchEnvelopePayload = (
  payload: GamePatchEnvelope
): GamePatchEnvelope => ({
  ...payload,
  revision: toFiniteInt(payload.revision, 0),
  patch: Array.isArray(payload.patch)
    ? payload.patch.map(normalizePatchOperation)
    : [],
  events: Array.isArray(payload.events)
    ? payload.events
        .map(normalizeServerEvent)
        .filter((event): event is ServerEvent => event !== null)
    : [],
})

export const normalizeTimerSyncPayload = (
  payload: unknown
): GameTimerSync | null => {
  if (!isRecord(payload)) {
    return null
  }

  const promptRecord =
    payload.prompt && isRecord(payload.prompt)
      ? (payload.prompt as Record<string, unknown>)
      : null
  const serverTimeMs = toFiniteNumber(
    payload.serverTimeMs ?? payload.server_time_ms
  )
  const turnDeadlineAtMs = toFiniteNumber(
    payload.turnDeadlineAtMs ?? payload.turn_deadline_at_ms
  )

  const turnRemainingSecFromDeadline =
    serverTimeMs != null && turnDeadlineAtMs != null
      ? Math.max(0, Math.ceil((turnDeadlineAtMs - serverTimeMs) / 1000))
      : null

  const gameId =
    toStringOrNull(payload.gameId) ?? toStringOrNull(payload.game_id)
  const turnRemainingSec =
    toRemainingSeconds(
      [
        payload.turnRemainingSec,
        payload.turn_remaining_sec,
        payload.turnLeftSec,
        payload.turn_left_sec,
        payload.remainingTurnSec,
        payload.remaining_turn_sec,
      ],
      [
        payload.turnRemainingMs,
        payload.turn_remaining_ms,
        payload.turnLeftMs,
        payload.turn_left_ms,
        payload.remainingTurnMs,
        payload.remaining_turn_ms,
      ]
    ) ?? turnRemainingSecFromDeadline
  const promptId =
    toStringOrNull(payload.promptId) ??
    toStringOrNull(payload.prompt_id) ??
    toStringOrNull(promptRecord?.promptId) ??
    toStringOrNull(promptRecord?.prompt_id) ??
    toStringOrNull(promptRecord?.id)
  const promptRemainingSec = toRemainingSeconds(
    [
      payload.promptRemainingSec,
      payload.prompt_remaining_sec,
      payload.promptLeftSec,
      payload.prompt_left_sec,
      payload.remainingPromptSec,
      payload.remaining_prompt_sec,
      promptRecord?.remainingSec,
      promptRecord?.remaining_sec,
      promptRecord?.promptRemainingSec,
      promptRecord?.prompt_remaining_sec,
    ],
    [
      payload.promptRemainingMs,
      payload.prompt_remaining_ms,
      payload.promptLeftMs,
      payload.prompt_left_ms,
      payload.remainingPromptMs,
      payload.remaining_prompt_ms,
      promptRecord?.remainingMs,
      promptRecord?.remaining_ms,
      promptRecord?.promptRemainingMs,
      promptRecord?.prompt_remaining_ms,
    ]
  )
  const syncedAtFromMs =
    serverTimeMs != null ? new Date(serverTimeMs).toISOString() : null
  const syncedAt =
    toStringOrNull(payload.syncedAt) ??
    toStringOrNull(payload.synced_at) ??
    toStringOrNull(payload.serverTime) ??
    toStringOrNull(payload.server_time) ??
    syncedAtFromMs

  return {
    gameId,
    turnRemainingSec,
    promptId,
    promptRemainingSec,
    syncedAt,
  }
}
