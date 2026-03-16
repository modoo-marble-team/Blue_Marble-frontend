import type { PlayerState, TileData } from './board.constants'
import type { ServerEvent } from '../../types/domain'
import { formatWon } from '../../lib/utils'

const normalizeEventType = (type: unknown) =>
  typeof type === 'string' ? type.trim().toUpperCase() : ''

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

const resolveTileIndex = (event: ServerEvent) => {
  if (typeof event.tileIndex === 'number' && Number.isFinite(event.tileIndex)) {
    return event.tileIndex
  }

  const payload = event.payload
  if (!payload) {
    return null
  }

  return getPayloadNumber(payload, ['toIndex', 'tileIndex', 'toTileId'])
}

export const extractEventDice = (
  event: ServerEvent
): [number, number] | null => {
  const normalizedType = normalizeEventType(event.type)
  if (normalizedType !== 'DICE_ROLLED') {
    return null
  }

  const payload = event.payload
  if (!payload || !Array.isArray(payload.dice) || payload.dice.length < 2) {
    return null
  }

  const first = Number(payload.dice[0])
  const second = Number(payload.dice[1])

  if (!Number.isFinite(first) || !Number.isFinite(second)) {
    return null
  }

  return [first, second]
}

export const createBoardStatusFromEvent = (
  event: ServerEvent,
  players: PlayerState[],
  tiles: TileData[]
) => {
  const normalizedType = normalizeEventType(event.type)
  const playerName = resolvePlayerName(players, event.playerId)

  if (normalizedType === 'DICE_ROLLED') {
    const dice = extractEventDice(event)
    const total =
      getPayloadNumber(event.payload, ['total']) ??
      (dice ? dice[0] + dice[1] : null)

    if (total != null) {
      return `${playerName}님이 주사위를 굴렸습니다 (${total})`
    }

    return `${playerName}님이 주사위를 굴렸습니다.`
  }

  if (normalizedType === 'PLAYER_MOVED') {
    const tileName = resolveTileName(tiles, resolveTileIndex(event))
    return `${playerName}님이 ${tileName} 칸으로 이동했습니다.`
  }

  if (normalizedType === 'LANDED') {
    const tileName = resolveTileName(tiles, resolveTileIndex(event))
    return `${playerName}님이 ${tileName} 칸에 도착했습니다.`
  }

  if (normalizedType === 'PAID_TOLL') {
    const amount =
      typeof event.amount === 'number'
        ? event.amount
        : (getPayloadNumber(event.payload, ['amount', 'toll', 'tollAmount']) ??
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
