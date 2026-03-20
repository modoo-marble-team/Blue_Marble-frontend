import { describe, expect, it } from 'vitest'
import type { ServerEvent } from '../../types/domain'
import type { PlayerState, TileData } from './board.constants'
import {
  createBoardStatusFromEvent,
  extractEventDice,
  getBoardEventAnimationHoldMs,
  getBoardEventConsumeDelayMs,
  getPendingMovePlayerIdsFromEvents,
  resolveBoardCardModalContentFromEvent,
  resolveBoardEventAnimationKind,
} from './gameBoardEventQueueUtils'

const players: PlayerState[] = [
  {
    id: 1,
    name: 'Player 1',
    color: '#f00',
    pos: 0,
    money: 1000,
    skipTurns: 0,
  },
  {
    id: 2,
    name: 'Player 2',
    color: '#0f0',
    pos: 0,
    money: 1000,
    skipTurns: 0,
  },
]

const tiles: TileData[] = [
  { id: 0, name: 'START', type: 'START' },
  { id: 1, name: 'Seoul', type: 'PROPERTY', price: 1000, color: '#f00' },
  { id: 2, name: 'Busan', type: 'PROPERTY', price: 1000, color: '#0f0' },
  { id: 3, name: 'Chance', type: 'CHANCE' },
  { id: 4, name: 'Event', type: 'EVENT' },
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

  it('collects only pending move player ids from move event aliases', () => {
    const events: ServerEvent[] = [
      {
        type: 'PLAYER_MOVED',
        playerId: 1,
      },
      {
        type: 'PLAYER_MOVE',
        playerId: 'guest-2',
      },
      {
        type: 'MOVED',
        playerId: 3,
      },
      {
        type: 'TURN_ENDED',
        playerId: 4,
      },
      {
        type: 'PLAYER_MOVED',
        playerId: null,
      },
    ]

    expect(getPendingMovePlayerIdsFromEvents(events)).toEqual([
      '1',
      'guest-2',
      '3',
    ])
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
      'Player 1님이 Busan 칸으로 이동했습니다.'
    )
  })

  it('resolves move destination from top-level toTileId', () => {
    const event = {
      type: 'PLAYER_MOVED',
      playerId: 1,
      toTileId: 1,
    } as ServerEvent & { toTileId: number }

    expect(createBoardStatusFromEvent(event, players, tiles)).toBe(
      'Player 1님이 Seoul 칸으로 이동했습니다.'
    )
  })

  it('resolves landed tile from nested event.tile payload', () => {
    const event = {
      type: 'LANDED',
      playerId: 2,
      tile: {
        tileId: 1,
        name: 'Seoul',
      },
    } as ServerEvent & {
      tile: { tileId: number; name: string }
    }

    expect(createBoardStatusFromEvent(event, players, tiles)).toBe(
      'Player 2님이 Seoul 칸에 도착했습니다.'
    )
  })

  it('uses chance.description for CHANCE_RESOLVED status message', () => {
    const event = {
      type: 'CHANCE_RESOLVED',
      playerId: 1,
      chance: {
        type: 'GAIN_MONEY',
        power: 300,
        description: 'Gain 300',
      },
    } as ServerEvent & {
      chance: {
        type: string
        power: number
        description: string
      }
    }

    expect(createBoardStatusFromEvent(event, players, tiles)).toBe('Gain 300')
  })

  it('resolves card modal content from CHANCE_RESOLVED with chance tile', () => {
    const event = {
      type: 'CHANCE_RESOLVED',
      playerId: 1,
      tileId: 3,
      chance: {
        description: 'Chance card line',
      },
    } as ServerEvent & {
      tileId: number
      chance: { description: string }
    }

    expect(resolveBoardCardModalContentFromEvent(event, tiles)).toEqual({
      variant: 'CHANCE',
      descriptionLine1: 'Chance card line',
      descriptionLine2: '',
    })
  })

  it('resolves card modal content from nested tile with event variant', () => {
    const event = {
      type: 'CHANCE_RESOLVED',
      playerId: 1,
      tile: {
        tileId: 4,
        type: 'EVENT',
      },
      chance: {
        description: 'Event card line1\nline2',
      },
    } as ServerEvent & {
      tile: { tileId: number; type: string }
      chance: { description: string }
    }

    expect(resolveBoardCardModalContentFromEvent(event, tiles)).toEqual({
      variant: 'EVENT',
      descriptionLine1: 'Event card line1',
      descriptionLine2: 'line2',
    })
  })

  it('returns null card modal content for unsupported event types', () => {
    const event: ServerEvent = {
      type: 'PLAYER_MOVED',
      playerId: 1,
    }

    expect(resolveBoardCardModalContentFromEvent(event, tiles)).toBeNull()
  })

  it('returns toll status with formatted amount', () => {
    const event: ServerEvent = {
      type: 'PAID_TOLL',
      playerId: 2,
      amount: 250000000,
    }

    expect(createBoardStatusFromEvent(event, players, tiles)).toBe(
      'Player 2님이 통행료 2.5억을 지불했습니다.'
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
