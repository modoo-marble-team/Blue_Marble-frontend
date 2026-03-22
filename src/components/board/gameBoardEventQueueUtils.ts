import type { PlayerState, TileData } from './board.constants'
import type { ServerEvent } from '../../types/domain'
import { formatWon } from '../../lib/utils'

// Workflow gate verification branch marker.
export type BoardEventAnimationKind =
  | 'none'
  | 'dice'
  | 'move'
  | 'land'
  | 'toll'
  | 'turn_end'
  | 'sync'

export type BoardCardModalContent = {
  variant: 'EVENT' | 'CHANCE'
  title?: string
  descriptionLine1?: string
  descriptionLine2?: string
}

const normalizeEventType = (type: unknown) =>
  typeof type === 'string' ? type.trim().toUpperCase() : ''

const EVENT_TYPE_ALIAS_MAP: Record<string, string> = {
  DICE_ROLL: 'DICE_ROLLED',
  DICE_ROLL_RESULT: 'DICE_ROLLED',
  ROLLED_DICE: 'DICE_ROLLED',
  PLAYER_MOVE: 'PLAYER_MOVED',
  MOVED: 'PLAYER_MOVED',
  LAND: 'LANDED',
  TOLL_PAID: 'PAID_TOLL',
  TURN_END: 'TURN_ENDED',
  END_TURN: 'TURN_ENDED',
  SYNC: 'SYNCED',
}

const toCanonicalEventType = (type: unknown) => {
  const normalized = normalizeEventType(type)
  return EVENT_TYPE_ALIAS_MAP[normalized] ?? normalized
}

export const resolveBoardEventAnimationKind = (
  event: ServerEvent
): BoardEventAnimationKind => {
  const normalizedType = toCanonicalEventType(event.type)

  if (normalizedType === 'DICE_ROLLED') return 'dice'
  if (normalizedType === 'PLAYER_MOVED') return 'move'
  if (normalizedType === 'LANDED') return 'land'
  if (normalizedType === 'PAID_TOLL') return 'toll'
  if (normalizedType === 'TURN_ENDED') return 'turn_end'
  if (normalizedType === 'SYNCED') return 'sync'

  return 'none'
}

export const getPendingMovePlayerIdsFromEvents = (events: ServerEvent[]) =>
  events
    .filter(
      (event) =>
        toCanonicalEventType(event.type) === 'PLAYER_MOVED' &&
        event.playerId != null
    )
    .map((event) => String(event.playerId))

export const shouldDelayPromptModalByMovement = ({
  promptPlayerId,
  pendingMovePlayerIdSet,
  animatedPositions,
  isMoving,
}: {
  promptPlayerId: string | null
  pendingMovePlayerIdSet: ReadonlySet<string>
  animatedPositions: Record<string, number>
  isMoving: boolean
}) => {
  if (isMoving) {
    return true
  }

  if (promptPlayerId == null) {
    return pendingMovePlayerIdSet.size > 0
  }

  return (
    pendingMovePlayerIdSet.has(promptPlayerId) ||
    animatedPositions[promptPlayerId] != null
  )
}

export const getBoardEventConsumeDelayMs = (event: ServerEvent): number => {
  const kind = resolveBoardEventAnimationKind(event)
  if (kind === 'dice') return 420
  if (kind === 'move') return 520
  if (kind === 'land') return 420
  if (kind === 'toll') return 460
  if (kind === 'turn_end') return 380
  if (kind === 'sync') return 220
  return 160
}

export const getBoardEventAnimationHoldMs = (
  kind: BoardEventAnimationKind
): number => {
  if (kind === 'dice') return 300
  if (kind === 'move') return 380
  if (kind === 'land') return 300
  if (kind === 'toll') return 340
  if (kind === 'turn_end') return 280
  if (kind === 'sync') return 160
  return 0
}

const getPayloadNumber = (
  payload: Record<string, unknown> | undefined,
  keys: string[]
) => {
  if (!payload) {
    return null
  }

  for (const key of keys) {
    const raw = payload[key]
    if (typeof raw === 'number' && Number.isFinite(raw)) {
      return raw
    }
    if (typeof raw === 'string' && raw.trim() !== '') {
      const parsed = Number.parseFloat(raw)
      if (Number.isFinite(parsed)) {
        return parsed
      }
    }
  }

  return null
}

const getEventRecord = (event: ServerEvent): Record<string, unknown> =>
  event as unknown as Record<string, unknown>

const getRecordString = (
  record: Record<string, unknown> | null | undefined,
  keys: string[]
) => {
  if (!record) {
    return null
  }

  for (const key of keys) {
    const raw = record[key]
    if (typeof raw === 'string' && raw.trim().length > 0) {
      return raw
    }
  }

  return null
}

const getEventTileRecord = (
  event: ServerEvent
): Record<string, unknown> | null => {
  const eventRecord = getEventRecord(event)
  if (typeof eventRecord.tile === 'object' && eventRecord.tile !== null) {
    return eventRecord.tile as Record<string, unknown>
  }

  const payload = event.payload
  if (payload && typeof payload.tile === 'object' && payload.tile !== null) {
    return payload.tile as Record<string, unknown>
  }

  return null
}

const getEventNumber = (event: ServerEvent, keys: string[]) => {
  const eventRecord = getEventRecord(event)

  for (const key of keys) {
    const raw = eventRecord[key]
    if (typeof raw === 'number' && Number.isFinite(raw)) {
      return raw
    }
    if (typeof raw === 'string' && raw.trim() !== '') {
      const parsed = Number.parseFloat(raw)
      if (Number.isFinite(parsed)) {
        return parsed
      }
    }
  }

  return null
}

const resolvePlayerName = (
  players: PlayerState[],
  playerId: ServerEvent['playerId']
) => {
  if (playerId == null) {
    return '플레이어'
  }

  return (
    players.find((player) => String(player.id) === String(playerId))?.name ??
    `플레이어 ${String(playerId)}`
  )
}

const resolveTileName = (tiles: TileData[], tileIndex: number | null) => {
  if (tileIndex == null) {
    return '알 수 없는 칸'
  }

  return tiles[tileIndex]?.name?.replace('\n', ' ') ?? `칸 ${tileIndex}`
}

export const resolveBoardEventTileIndex = (event: ServerEvent) => {
  if (typeof event.tileIndex === 'number' && Number.isFinite(event.tileIndex)) {
    return event.tileIndex
  }

  const eventLevelIndex = getEventNumber(event, ['toTileId', 'tileId'])
  if (eventLevelIndex != null) {
    return eventLevelIndex
  }

  const eventTile = getEventTileRecord(event)
  if (eventTile) {
    const nestedTileIndex = getPayloadNumber(eventTile, [
      'tileId',
      'tile_id',
      'index',
      'tileIndex',
    ])

    if (nestedTileIndex != null) {
      return nestedTileIndex
    }
  }

  const payload = event.payload
  if (!payload) {
    return null
  }

  return getPayloadNumber(payload, ['toIndex', 'tileIndex', 'toTileId'])
}

const resolveEventTileName = (event: ServerEvent, tiles: TileData[]) => {
  const eventRecord = getEventRecord(event)
  const eventTile = getEventTileRecord(event)
  const explicitTileName =
    getRecordString(eventRecord, ['tileName', 'tile_name']) ??
    getRecordString(eventTile, ['name', 'tileName', 'tile_name'])

  if (explicitTileName) {
    return explicitTileName.replace('\n', ' ')
  }

  return resolveTileName(tiles, resolveBoardEventTileIndex(event))
}

const resolveChanceDescription = (event: ServerEvent) => {
  const eventRecord = getEventRecord(event)
  const chanceRecord =
    (typeof eventRecord.chance === 'object' && eventRecord.chance !== null
      ? (eventRecord.chance as Record<string, unknown>)
      : null) ??
    (event.payload?.chance &&
    typeof event.payload.chance === 'object' &&
    event.payload.chance !== null
      ? (event.payload.chance as Record<string, unknown>)
      : null)

  return (
    getRecordString(chanceRecord, ['description']) ??
    getRecordString(event.payload ?? null, ['description'])
  )
}

const resolveCardModalVariant = (
  event: ServerEvent,
  tiles: TileData[]
): 'EVENT' | 'CHANCE' => {
  const eventRecord = getEventRecord(event)
  const eventTile = getEventTileRecord(event)
  const explicitTileType =
    getRecordString(eventRecord, ['tileType', 'tile_type']) ??
    getRecordString(eventTile, ['type', 'tileType', 'tile_type']) ??
    getRecordString(event.payload ?? null, ['tileType', 'tile_type'])

  const normalizedTileType = explicitTileType?.trim().toUpperCase()
  if (normalizedTileType === 'CHANCE') {
    return 'CHANCE'
  }
  if (normalizedTileType === 'EVENT') {
    return 'EVENT'
  }

  const tileIndex = resolveBoardEventTileIndex(event)
  if (tileIndex != null && tiles[tileIndex]?.type === 'CHANCE') {
    return 'CHANCE'
  }

  return 'EVENT'
}

const splitCardDescriptionLines = (description: string) => {
  const lines = description
    .split(/\r?\n/g)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  if (lines.length === 0) {
    return { descriptionLine1: undefined, descriptionLine2: '' }
  }

  if (lines.length === 1) {
    return { descriptionLine1: lines[0], descriptionLine2: '' }
  }

  return {
    descriptionLine1: lines[0],
    descriptionLine2: lines.slice(1).join(' '),
  }
}

export const resolveBoardCardModalContentFromEvent = (
  event: ServerEvent,
  tiles: TileData[]
): BoardCardModalContent | null => {
  const normalizedType = toCanonicalEventType(event.type)
  if (normalizedType !== 'CHANCE_RESOLVED') {
    return null
  }

  const variant = resolveCardModalVariant(event, tiles)
  const chanceDescription = resolveChanceDescription(event)

  if (!chanceDescription) {
    return { variant }
  }

  const { descriptionLine1, descriptionLine2 } =
    splitCardDescriptionLines(chanceDescription)

  return {
    variant,
    descriptionLine1,
    descriptionLine2,
  }
}

export const extractEventDice = (
  event: ServerEvent
): [number, number] | null => {
  const normalizedType = toCanonicalEventType(event.type)
  if (normalizedType !== 'DICE_ROLLED') {
    return null
  }

  const payload = event.payload

  let first: number | null = null
  let second: number | null = null

  const eventRecord = getEventRecord(event)
  const payloadDice = Array.isArray(payload?.dice) ? payload.dice : null

  if (Array.isArray(eventRecord.dice) && eventRecord.dice.length >= 2) {
    first = Number(eventRecord.dice[0])
    second = Number(eventRecord.dice[1])
  } else if (payloadDice && payloadDice.length >= 2) {
    first = Number(payloadDice[0])
    second = Number(payloadDice[1])
  } else {
    first =
      getEventNumber(event, ['dice1', 'dice_1', 'firstDice', 'd1']) ??
      getPayloadNumber(payload, ['dice1', 'dice_1', 'firstDice', 'd1'])
    second =
      getEventNumber(event, ['dice2', 'dice_2', 'secondDice', 'd2']) ??
      getPayloadNumber(payload, ['dice2', 'dice_2', 'secondDice', 'd2'])
  }

  if (first == null || second == null) {
    return null
  }

  return [first, second]
}

export const createBoardStatusFromEvent = (
  event: ServerEvent,
  players: PlayerState[],
  tiles: TileData[]
) => {
  const normalizedType = toCanonicalEventType(event.type)
  const playerName = resolvePlayerName(players, event.playerId)

  if (normalizedType === 'DICE_ROLLED') {
    const dice = extractEventDice(event)
    const total =
      getEventNumber(event, ['total']) ??
      getPayloadNumber(event.payload, ['total']) ??
      (dice ? dice[0] + dice[1] : null)

    if (total != null) {
      return `${playerName}님이 주사위를 굴렸습니다 (${total})`
    }

    return `${playerName}님이 주사위를 굴렸습니다.`
  }

  if (normalizedType === 'PLAYER_MOVED') {
    const tileName = resolveEventTileName(event, tiles)
    return `${playerName}님이 ${tileName} 칸으로 이동했습니다.`
  }

  if (normalizedType === 'LANDED') {
    const tileName = resolveEventTileName(event, tiles)
    return `${playerName}님이 ${tileName} 칸에 도착했습니다.`
  }

  if (normalizedType === 'CHANCE_RESOLVED') {
    const chanceDescription = resolveChanceDescription(event)
    if (chanceDescription) {
      return chanceDescription
    }

    return `${playerName}님이 찬스 효과를 적용했습니다.`
  }

  if (normalizedType === 'PAID_TOLL') {
    const amount =
      typeof event.amount === 'number'
        ? event.amount
        : (getEventNumber(event, ['amount', 'toll', 'tollAmount']) ??
          getPayloadNumber(event.payload, ['amount', 'toll', 'tollAmount']) ??
          0)
    return `${playerName}님이 통행료 ${formatWon(amount)}을 지불했습니다.`
  }

  if (normalizedType === 'TURN_ENDED') {
    return `${playerName}님 턴이 종료되었습니다.`
  }

  if (normalizedType === 'SYNCED') {
    return '게임 상태를 동기화했습니다.'
  }

  return null
}
