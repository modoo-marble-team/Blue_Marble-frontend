import { describe, expect, it } from 'vitest'
import type { ServerEvent } from '../../types/domain'
import {
  normalizePatchEnvelopePayload,
  normalizePromptPayload,
  normalizeSnapshotPayload,
  normalizeTimerSyncPayload,
} from './gameContractAdapters'

describe('gameContractAdapters', () => {
  it('normalizes prompt payload with canonical and legacy fields', () => {
    const normalized = normalizePromptPayload({
      id: 'legacy-prompt-id',
      type: 'BUY_OR_SKIP',
      timeoutMs: 4500,
      choices: [
        { value: 'buy' },
        { id: 'skip-option', label: 'Skip', value: 'skip' },
      ],
      payload: { reason: 'test' },
    })

    expect(normalized).toMatchObject({
      id: 'legacy-prompt-id',
      type: 'BUY_OR_SKIP',
      timeoutSec: 5,
      payload: { reason: 'test' },
    })
    expect(normalized?.choices).toEqual([
      {
        id: 'buy-0',
        label: 'BUY',
        value: 'BUY',
        description: undefined,
      },
      {
        id: 'skip-option',
        label: 'Skip',
        value: 'SKIP',
        description: undefined,
      },
    ])
  })

  it('normalizes prompt choices when server sends string arrays', () => {
    const normalized = normalizePromptPayload({
      promptId: 'prompt-string-choices',
      type: 'BUY_OR_SKIP',
      choices: ['buy', 'skip'],
    })

    expect(normalized?.choices).toEqual([
      {
        id: 'buy-0',
        label: 'BUY',
        value: 'BUY',
        description: undefined,
      },
      {
        id: 'skip-1',
        label: 'SKIP',
        value: 'SKIP',
        description: undefined,
      },
    ])
  })

  it('normalizes build prompt money fields with consistent unit policy', () => {
    const normalized = normalizePromptPayload({
      promptId: 'prompt-build-money',
      type: 'BUILD_OR_SKIP',
      payload: {
        buildCost: 260,
        nextToll: '520',
        build_cost: '130',
        next_toll: 390,
      },
      choices: [{ value: 'build' }, { value: 'skip' }],
    })

    expect(normalized?.payload).toMatchObject({
      buildCost: 2600000,
      nextToll: 5200000,
      build_cost: 1300000,
      next_toll: 3900000,
    })
  })

  it('normalizes canonical snapshot payload to internal snapshot shape', () => {
    const normalized = normalizeSnapshotPayload(
      {
        gameId: 'game-1',
        revision: 12,
        phase: 'WAIT_PROMPT',
        turn: 4,
        currentPlayerId: 'player-2',
        turnTimeoutSec: 20,
        players: [
          {
            id: 'player-1',
            nickname: 'alpha',
            currentTileId: 7,
            balance: 300,
            ownedTiles: [2, 4],
            playerState: 'LOCKED',
            stateDuration: 2,
            color: '#000000',
          },
        ],
        tiles: [
          {
            index: 2,
            name: 'Seoul',
            ownerId: 'player-1',
            buildingLevel: 3,
            tileType: 'PROPERTY',
            price: 50,
          },
        ],
        prompt: {
          promptId: 'prompt-1',
          type: 'CONFIRM_ONLY',
          timeoutSec: 10,
          choices: [{ value: 'confirm' }],
        },
      },
      {
        envelopeRevision: 99,
      }
    )

    expect(normalized).not.toBeNull()
    expect(normalized).toMatchObject({
      gameId: 'game-1',
      revision: 12,
      phase: 'prompt',
      currentPlayerId: 'player-2',
      currentTurn: 'player-2',
      round: 4,
      turnTimeoutSec: 20,
    })
    expect(normalized?.players[0]).toMatchObject({
      id: 'player-1',
      position: 7,
      balance: 3000000,
      owned_tiles: [2, 4],
      state: 'locked',
      is_in_jail: true,
      jail_turn_count: 2,
    })
    expect(normalized?.tiles[0]).toMatchObject({
      index: 2,
      ownerId: 'player-1',
      owner_id: 'player-1',
      building: 3,
      type: 'property',
      transportType: 'PROPERTY',
      price: 500000,
    })
    expect(normalized?.prompt).toMatchObject({
      id: 'prompt-1',
      timeoutSec: 10,
      choices: [{ value: 'CONFIRM' }],
    })
  })

  it('normalizes snapshot aliases from real payload fields', () => {
    const normalized = normalizeSnapshotPayload(
      {
        gameId: 'game-2',
        revision: 7,
        phase: 'WAIT_ROLL',
        turn: 2,
        current_player_id: 105,
        players: [
          {
            playerId: 105,
            nickname: 'beta',
            current_tile_id: '8',
            money: '210',
            ownedTiles: ['3', '5'],
          },
        ],
        tiles: [
          {
            tileId: '3',
            owner_player_id: 105,
            building_level: 2,
            tile_type: 'PROPERTY',
          },
        ],
        pending_prompt: {
          promptId: 'prompt-2',
          type: 'BUY_OR_SKIP',
          payload: {
            player_id: 105,
          },
          choices: [{ value: 'buy' }, { value: 'skip' }],
        },
      },
      {
        envelopeRevision: 7,
      }
    )

    expect(normalized).not.toBeNull()
    expect(normalized).toMatchObject({
      currentPlayerId: 105,
      currentTurn: 105,
      phase: 'rolling',
    })
    expect(normalized?.players[0]).toMatchObject({
      id: 105,
      position: 8,
      balance: 2100000,
      owned_tiles: [3, 5],
    })
    expect(normalized?.tiles[0]).toMatchObject({
      index: 3,
      ownerId: 105,
      building: 2,
      type: 'property',
    })
    expect(normalized?.prompt).toMatchObject({
      id: 'prompt-2',
      playerId: 105,
      choices: [{ value: 'BUY' }, { value: 'SKIP' }],
    })
  })

  it('normalizes game over snapshot aliases and infers isGameOver from finished phase', () => {
    const normalized = normalizeSnapshotPayload(
      {
        gameId: 'game-finished',
        revision: 15,
        phase: 'FINISHED',
        players: [],
        tiles: [],
        winner_id: 'player-winner',
        is_game_over: true,
        game_result: {
          reason: 'bankrupt',
          rankings: [
            {
              rank: 1,
              player_id: 'player-winner',
              nickname: 'winner',
              final_assets: 8200000000,
              is_winner: true,
            },
          ],
        },
      },
      {
        envelopeRevision: 15,
      }
    )

    expect(normalized).not.toBeNull()
    expect(normalized).toMatchObject({
      phase: 'finished',
      isGameOver: true,
      winnerId: 'player-winner',
      gameResult: {
        reason: 'bankrupt',
        winner: {
          playerId: 'player-winner',
          nickname: 'winner',
          assets: 8200000000,
        },
      },
    })
  })

  it('normalizes GAME_OVER winner payload with balance/assets fields', () => {
    const normalized = normalizeSnapshotPayload(
      {
        gameId: 'game-over-new-contract',
        revision: 22,
        phase: 'GAME_OVER',
        players: [],
        tiles: [],
        game_result: {
          reason: 'max_rounds',
          winner: {
            playerId: 2,
            nickname: 'guest',
            balance: 530000,
            assets: 610000,
          },
        },
      },
      { envelopeRevision: 22 }
    )

    expect(normalized).not.toBeNull()
    expect(normalized).toMatchObject({
      phase: 'finished',
      isGameOver: true,
      winnerId: 2,
      gameResult: {
        reason: 'max_rounds',
        winner: {
          playerId: 2,
          nickname: 'guest',
          balance: 5300000000,
          assets: 6100000000,
        },
      },
    })
  })

  it('normalizes object-shaped snapshot collections', () => {
    const normalized = normalizeSnapshotPayload(
      {
        gameId: 'game-3',
        revision: 4,
        phase: 'MOVING',
        players: {
          a: {
            id: 'user-a',
            nickname: 'A',
            balance: 300,
          },
        },
        tiles: {
          c1: {
            index: 1,
            tileType: 'PROPERTY',
            purchase_price: 50,
          },
        },
      },
      { envelopeRevision: 4 }
    )

    expect(normalized?.players).toHaveLength(1)
    expect(normalized?.players[0]).toMatchObject({
      id: 'user-a',
      balance: 3000000,
    })
    expect(normalized?.tiles).toHaveLength(1)
    expect(normalized?.tiles[0]).toMatchObject({
      index: 1,
      type: 'property',
      price: 500000,
    })
  })

  it('falls back to default initial balance when snapshot player has no money field', () => {
    const normalized = normalizeSnapshotPayload(
      {
        gameId: 'game-5',
        revision: 1,
        phase: 'WAIT_ROLL',
        players: [
          {
            id: 1,
            nickname: 'no-balance-player',
            currentTileId: 0,
          },
        ],
        tiles: [],
      },
      { envelopeRevision: 1 }
    )

    expect(normalized?.players[0]).toMatchObject({
      id: 1,
      balance: 5000000000,
    })
  })

  it('preserves explicit zero balance from server (bankrupt player)', () => {
    const normalized = normalizeSnapshotPayload(
      {
        gameId: 'game-zero-balance',
        revision: 5,
        phase: 'WAIT_ROLL',
        players: [
          {
            id: 'player-bankrupt',
            nickname: 'bankrupt',
            balance: 0,
          },
        ],
        tiles: [],
      },
      { envelopeRevision: 5 }
    )

    expect(normalized?.players[0]).toMatchObject({
      id: 'player-bankrupt',
      balance: 0,
    })
  })

  it('falls back to default balance when balance is non-numeric string', () => {
    const normalized = normalizeSnapshotPayload(
      {
        gameId: 'game-bad-balance',
        revision: 3,
        phase: 'WAIT_ROLL',
        players: [
          {
            id: 'player-bad',
            nickname: 'bad-balance',
            balance: 'not-a-number',
          },
        ],
        tiles: [],
      },
      { envelopeRevision: 3 }
    )

    expect(normalized?.players[0]).toMatchObject({
      id: 'player-bad',
      balance: 5000000000,
    })
  })

  it('normalizes string "0" balance to zero', () => {
    const normalized = normalizeSnapshotPayload(
      {
        gameId: 'game-string-zero',
        revision: 2,
        phase: 'WAIT_ROLL',
        players: [
          {
            id: 'player-str-zero',
            nickname: 'str-zero',
            balance: '0',
          },
        ],
        tiles: [],
      },
      { envelopeRevision: 2 }
    )

    expect(normalized?.players[0]).toMatchObject({
      id: 'player-str-zero',
      balance: 0,
    })
  })

  it('normalizes patch envelope paths and canonical values', () => {
    const normalized = normalizePatchEnvelopePayload({
      gameId: 'game-1',
      revision: 33,
      patch: [
        {
          op: 'set',
          path: 'phase',
          value: 'WAIT_ROLL',
        },
        {
          op: 'set',
          path: ['players', 0, 'playerState'],
          value: 'BANKRUPT',
        },
        {
          op: 'set',
          path: 'players.0.ownedTiles',
          value: [1, { tileId: 2 }],
        },
        {
          op: 'set',
          path: 'players.0.currentTileId',
          value: 9,
        },
        {
          op: 'set',
          path: 'tiles.1.buildingLevel',
          value: 99,
        },
        {
          op: 'set',
          path: 'tiles.1.tileType',
          value: 'MOVE_TO_ISLAND',
        },
        {
          op: 'set',
          path: 'players.0.current_tile_id',
          value: 11,
        },
        {
          op: 'set',
          path: 'players.0.player_state',
          value: 'LOCKED',
        },
        {
          op: 'set',
          path: 'players.0.money',
          value: '450',
        },
        {
          op: 'set',
          path: 'pending_prompt',
          value: {
            promptId: 'p-10',
            type: 'CONFIRM_ONLY',
            choices: [{ value: 'confirm' }],
          },
        },
      ],
      events: [],
    })

    expect(normalized.patch).toEqual([
      {
        op: 'set',
        path: 'phase',
        value: 'rolling',
      },
      {
        op: 'set',
        path: ['players', 0, 'state'],
        value: 'bankrupt',
      },
      {
        op: 'set',
        path: 'players.0.owned_tiles',
        value: [1, 2],
      },
      {
        op: 'set',
        path: 'players.0.position',
        value: 9,
      },
      {
        op: 'set',
        path: 'tiles.1.building',
        value: 3,
      },
      {
        op: 'set',
        path: 'tiles.1.type',
        value: 'go_to_island',
      },
      {
        op: 'set',
        path: 'players.0.position',
        value: 11,
      },
      {
        op: 'set',
        path: 'players.0.state',
        value: 'locked',
      },
      {
        op: 'set',
        path: 'players.0.balance',
        value: 4500000,
      },
      {
        op: 'set',
        path: 'prompt',
        value: {
          id: 'p-10',
          type: 'CONFIRM_ONLY',
          playerId: null,
          title: undefined,
          message: undefined,
          timeoutSec: undefined,
          choices: [
            {
              id: 'confirm-0',
              label: 'CONFIRM',
              value: 'CONFIRM',
              description: undefined,
            },
          ],
          payload: undefined,
        },
      },
    ])
  })

  it('normalizes patch inc money values and event aliases from real payload', () => {
    const normalized = normalizePatchEnvelopePayload({
      gameId: 'game-4',
      revision: 90,
      patch: [
        {
          op: 'inc',
          path: 'players.1.money',
          value: 5000,
        },
      ],
      events: [
        {
          eventType: 'DICE_ROLLED',
          playerId: '1',
          dice: [3, 2],
        } as unknown as ServerEvent,
        {
          type: 'PAID_TOLL',
          fromPlayerId: '2',
          amount: 3500,
        } as unknown as ServerEvent,
      ],
    })

    expect(normalized.patch).toEqual([
      {
        op: 'inc',
        path: 'players.1.balance',
        value: 50000000,
      },
    ])
    expect(normalized.events).toEqual([
      {
        eventType: 'DICE_ROLLED',
        playerId: '1',
        dice: [3, 2],
        id: undefined,
        type: 'DICE_ROLLED',
        tileIndex: null,
        amount: undefined,
        payload: undefined,
      },
      {
        type: 'PAID_TOLL',
        fromPlayerId: '2',
        id: undefined,
        playerId: '2',
        tileIndex: null,
        amount: 35000000,
        payload: undefined,
      },
    ])
  })

  it('normalizes patch aliases for winner/isGameOver/gameResult fields', () => {
    const normalized = normalizePatchEnvelopePayload({
      gameId: 'game-over-patch',
      revision: 91,
      patch: [
        { op: 'set', path: 'winner_id', value: 'player-1' },
        { op: 'set', path: 'is_game_over', value: 1 },
        {
          op: 'set',
          path: 'game_result',
          value: { reason: 'round_limit', rankings: [] },
        },
      ],
      events: [],
    })

    expect(normalized.patch).toEqual([
      { op: 'set', path: 'winnerId', value: 'player-1' },
      { op: 'set', path: 'isGameOver', value: true },
      {
        op: 'set',
        path: 'gameResult',
        value: { reason: 'round_limit', rankings: undefined, winner: null },
      },
    ])
  })

  it('normalizes set patches that replace a single player or tile object', () => {
    const normalized = normalizePatchEnvelopePayload({
      gameId: 'game-entity-set',
      revision: 11,
      patch: [
        {
          op: 'set',
          path: 'players.player-a',
          value: {
            playerId: 'player-a',
            nickname: 'Player A',
            current_tile_id: 4,
            money: 5200,
            ownedTiles: [2],
            player_state: 'NORMAL',
          },
        },
        {
          op: 'set',
          path: ['tiles', 2],
          value: {
            tileId: 2,
            owner_player_id: 'player-a',
            tile_type: 'PROPERTY',
            building_level: 3,
            purchase_price: 140,
          },
        },
      ],
      events: [],
    })

    expect(normalized.patch).toEqual([
      {
        op: 'set',
        path: 'players.player-a',
        value: expect.objectContaining({
          id: 'player-a',
          nickname: 'Player A',
          position: 4,
          balance: 52000000,
          owned_tiles: [2],
          state: 'normal',
        }),
      },
      {
        op: 'set',
        path: ['tiles', 2],
        value: expect.objectContaining({
          index: 2,
          ownerId: 'player-a',
          owner_id: 'player-a',
          type: 'property',
          building: 3,
          price: 1400000,
        }),
      },
    ])
  })

  it('normalizes game:timer_sync payload with canonical fields', () => {
    const normalized = normalizeTimerSyncPayload({
      gameId: 'game-10',
      turnRemainingSec: 18,
      promptId: 'prompt-1',
      promptRemainingSec: 7,
      syncedAt: '2026-03-19T10:00:00.000Z',
    })

    expect(normalized).toEqual({
      gameId: 'game-10',
      turnRemainingSec: 18,
      promptId: 'prompt-1',
      promptRemainingSec: 7,
      syncedAt: '2026-03-19T10:00:00.000Z',
    })
  })

  it('normalizes game:timer_sync payload with legacy aliases', () => {
    const normalized = normalizeTimerSyncPayload({
      game_id: 'game-11',
      turn_remaining_sec: '9',
      prompt_id: 'prompt-legacy',
      prompt_left_sec: '4',
      server_time: '2026-03-19T10:01:00.000Z',
    })

    expect(normalized).toEqual({
      gameId: 'game-11',
      turnRemainingSec: 9,
      promptId: 'prompt-legacy',
      promptRemainingSec: 4,
      syncedAt: '2026-03-19T10:01:00.000Z',
    })
  })

  it('normalizes game:timer_sync payload from ms fields and nested prompt payload', () => {
    const normalized = normalizeTimerSyncPayload({
      gameId: 'game-12',
      turnRemainingMs: 12_600,
      serverTimeMs: 1742373000000,
      prompt: {
        promptId: 'prompt-ms',
        remainingMs: 4_500,
      },
    })

    expect(normalized).toEqual({
      gameId: 'game-12',
      turnRemainingSec: 13,
      promptId: 'prompt-ms',
      promptRemainingSec: 5,
      syncedAt: '2025-03-19T08:30:00.000Z',
    })
  })

  it('normalizes game:timer_sync payload from deadline timestamps when remaining seconds are missing', () => {
    const normalized = normalizeTimerSyncPayload({
      gameId: 'game-13',
      serverTimeMs: 100_000,
      turnDeadlineAtMs: 130_500,
      prompt: {
        id: 'prompt-deadline',
        prompt_remaining_ms: 1_200,
      },
    })

    expect(normalized).toEqual({
      gameId: 'game-13',
      turnRemainingSec: 31,
      promptId: 'prompt-deadline',
      promptRemainingSec: 2,
      syncedAt: '1970-01-01T00:01:40.000Z',
    })
  })
})
