import type {
  GamePatchEnvelope,
  GamePatchOperation,
  GamePrompt,
  GamePromptChoice,
  GameSnapshot,
  Player,
  PlayerId,
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

const PHASE_TO_INTERNAL_MAP: Record<string, GameSnapshot['phase']> = {
  WAIT_ROLL: 'rolling',
  MOVING: 'moving',
  RESOLVING: 'resolving',
  WAIT_PROMPT: 'prompt',
  TURN_END: 'resolving',
  GAME_OVER: 'finished',
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

  const payloadRecord =
    promptCompatPayload.payload && isRecord(promptCompatPayload.payload)
      ? promptCompatPayload.payload
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

  return {
    id: promptId,
    type:
      typeof promptCompatPayload.type === 'string' &&
      promptCompatPayload.type.trim().length > 0
        ? promptCompatPayload.type
        : 'UNKNOWN_PROMPT',
    playerId:
      promptCompatPayload.playerId === undefined &&
      payloadRecord?.playerId === undefined &&
      payloadRecord?.player_id === undefined
        ? null
        : (promptCompatPayload.playerId ??
          payloadRecord?.playerId ??
          payloadRecord?.player_id ??
          null),
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
    playerRecord.playerState ?? playerRecord.state
  )
  const stateDuration = toFiniteInt(
    playerRecord.stateDuration ?? playerRecord.jail_turn_count,
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
    balance: toFiniteInt(playerRecord.balance, 0),
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
  const clamped = Math.min(Math.max(level, 0), 7)
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
    price: toFiniteNumber(tileRecord.price) ?? undefined,
    color: toStringOrNull(tileRecord.color) ?? undefined,
  }
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
    : []
  const tilesRaw = Array.isArray(snapshotPayload.tiles)
    ? snapshotPayload.tiles
    : []
  const currentPlayerId = toPlayerIdOrNull(
    snapshotPayload.currentPlayerId ??
      snapshotPayload.current_player_id ??
      snapshotPayload.currentTurn ??
      null
  )
  const roundFromTurn = toFiniteInt(snapshotPayload.turn, 1)

  return {
    roomId: toStringOrNull(snapshotPayload.roomId),
    gameId:
      toStringOrNull(snapshotPayload.gameId) ??
      toStringOrNull(options.envelopeGameId) ??
      null,
    revision: toFiniteInt(snapshotPayload.revision, options.envelopeRevision),
    phase: normalizePhase(snapshotPayload.phase),
    players: playersRaw.map(normalizePlayerFromSnapshot),
    tiles: tilesRaw.map(normalizeTileFromSnapshot),
    currentPlayerId,
    currentTurn: currentPlayerId,
    round: toFiniteInt(snapshotPayload.round, roundFromTurn),
    turnTimeoutSec: toFiniteInt(
      snapshotPayload.turnTimeoutSec,
      DEFAULT_TURN_TIMEOUT_SEC
    ),
    prompt: normalizePromptPayload(snapshotPayload.prompt),
    gameResult:
      snapshotPayload.gameResult && isRecord(snapshotPayload.gameResult)
        ? (snapshotPayload.gameResult as GameSnapshot['gameResult'])
        : null,
    isGameOver: Boolean(snapshotPayload.isGameOver),
    winnerId: (snapshotPayload.winnerId ?? null) as GameSnapshot['winnerId'],
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
  if (segment === 'ownedTiles') return 'owned_tiles'
  if (segment === 'building_level') return 'building'
  if (segment === 'buildingLevel') return 'building'
  if (segment === 'tile_type') return 'type'
  if (segment === 'tileType') return 'type'
  return segment
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

  if (pathSegments.length === 1 && firstSegment === 'players') {
    if (!Array.isArray(value)) {
      return []
    }
    return value.map(normalizePlayerFromSnapshot)
  }

  if (pathSegments.length === 1 && firstSegment === 'tiles') {
    if (!Array.isArray(value)) {
      return []
    }
    return value.map(normalizeTileFromSnapshot)
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

  if (operation.op === 'set') {
    return {
      ...operation,
      path,
      value: normalizePatchSetValue(pathSegments, operation.value),
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
  events: Array.isArray(payload.events) ? payload.events : [],
})
