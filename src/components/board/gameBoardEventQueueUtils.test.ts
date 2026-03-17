import { describe, expect, it } from 'vitest'
import type { ServerEvent } from '../../types/domain'
import type { PlayerState, TileData } from './board.constants'
import {
  createBoardStatusFromEvent,
  extractEventDice,
  getBoardEventAnimationHoldMs,
  getBoardEventConsumeDelayMs,
  resolveBoardEventAnimationKind,
} from './gameBoardEventQueueUtils'

const players: PlayerState[] = [
  {
    id: 1,
    name: '플레이어1',
    color: '#f00',
    pos: 0,
    money: 1000,
    skipTurns: 0,
  },
  {
    id: 2,
    name: '플레이어2',
    color: '#0f0',
    pos: 0,
    money: 1000,
    skipTurns: 0,
  },
]

const tiles: TileData[] = [
  { id: 0, name: 'START', type: 'START' },
  { id: 1, name: '서울', type: 'PROPERTY', price: 1000, color: '#f00' },
  { id: 2, name: '부산', type: 'PROPERTY', price: 1000, color: '#0f0' },
]

describe('gameBoardEventQueueUtils', () => {
  it('extracts dice values from DICE_ROLLED payload', () => {
    const event: ServerEvent = {
      type: 'DICE_ROLLED',
      playerId: 1,
      payload: {
        dice: [3, 4],
        total: 7,
      },
    }

    expect(extractEventDice(event)).toEqual([3, 4])
  })

  it('extracts dice values from alias payload keys', () => {
    const event: ServerEvent = {
      type: 'DICE_ROLL_RESULT',
      playerId: 1,
      payload: {
        dice1: 2,
        dice2: 6,
      },
    }

    expect(extractEventDice(event)).toEqual([2, 6])
  })

  it('extracts dice values from top-level event dice fields', () => {
    const event = {
      type: 'DICE_ROLLED',
      playerId: 1,
      dice: [4, 1],
    }
    expect(extractEventDice(event as unknown as ServerEvent)).toEqual([4, 1])
  })

  it('returns move status message with player and tile name', () => {
    const event: ServerEvent = {
      type: 'PLAYER_MOVED',
      playerId: 1,
      tileIndex: 2,
    }

    expect(createBoardStatusFromEvent(event, players, tiles)).toBe(
      '플레이어1님이 부산 칸으로 이동했습니다.'
    )
  })

  it('resolves move destination from top-level toTileId', () => {
    const event = {
      type: 'PLAYER_MOVED',
      playerId: 1,
      toTileId: 1,
    } as ServerEvent & { toTileId: number }

    expect(createBoardStatusFromEvent(event, players, tiles)).toBe(
      '플레이어1님이 서울 칸으로 이동했습니다.'
    )
  })

  it('returns toll status with formatted amount', () => {
    const event: ServerEvent = {
      type: 'PAID_TOLL',
      playerId: 2,
      amount: 250000000,
    }

    expect(createBoardStatusFromEvent(event, players, tiles)).toBe(
      '플레이어2님이 통행료 2.5억을 지불했습니다.'
    )
  })

  it('returns synced status for sync event', () => {
    const event: ServerEvent = {
      type: 'SYNCED',
      payload: {
        serverRevision: 10,
      },
    }

    expect(createBoardStatusFromEvent(event, players, tiles)).toBe(
      '게임 상태를 동기화했습니다.'
    )
  })

  it('returns null for unsupported event types', () => {
    const event: ServerEvent = {
      type: 'UNKNOWN_EVENT',
      playerId: 1,
    }

    expect(createBoardStatusFromEvent(event, players, tiles)).toBeNull()
  })

  it('maps server events to animation kinds', () => {
    expect(
      resolveBoardEventAnimationKind({ type: 'DICE_ROLLED' } as ServerEvent)
    ).toBe('dice')
    expect(
      resolveBoardEventAnimationKind({ type: 'PLAYER_MOVED' } as ServerEvent)
    ).toBe('move')
    expect(
      resolveBoardEventAnimationKind({ type: 'LANDED' } as ServerEvent)
    ).toBe('land')
    expect(
      resolveBoardEventAnimationKind({ type: 'PAID_TOLL' } as ServerEvent)
    ).toBe('toll')
    expect(
      resolveBoardEventAnimationKind({ type: 'TURN_ENDED' } as ServerEvent)
    ).toBe('turn_end')
    expect(
      resolveBoardEventAnimationKind({ type: 'SYNCED' } as ServerEvent)
    ).toBe('sync')
    expect(
      resolveBoardEventAnimationKind({ type: 'SOMETHING_ELSE' } as ServerEvent)
    ).toBe('none')
    expect(
      resolveBoardEventAnimationKind({
        type: 'DICE_ROLL_RESULT',
      } as ServerEvent)
    ).toBe('dice')
    expect(
      resolveBoardEventAnimationKind({ type: 'TURN_END' } as ServerEvent)
    ).toBe('turn_end')
  })

  it('returns event-specific consume delays', () => {
    expect(
      getBoardEventConsumeDelayMs({ type: 'PLAYER_MOVED' } as ServerEvent)
    ).toBe(520)
    expect(
      getBoardEventConsumeDelayMs({ type: 'UNKNOWN_EVENT' } as ServerEvent)
    ).toBe(160)
  })

  it('keeps animation hold shorter than consume delay', () => {
    const event = { type: 'PAID_TOLL' } as ServerEvent
    const kind = resolveBoardEventAnimationKind(event)

    expect(getBoardEventAnimationHoldMs(kind)).toBeLessThan(
      getBoardEventConsumeDelayMs(event)
    )
  })
})
