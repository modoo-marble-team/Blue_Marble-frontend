import { describe, expect, it } from 'vitest'
import type { ServerEvent } from '../../types/domain'
import {
  normalizePatchEnvelopePayload,
  normalizePromptPayload,
  normalizeSnapshotPayload,
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
      balance: 300000000,
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
      price: 50000000,
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
      balance: 210000000,
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
      balance: 300000000,
    })
    expect(normalized?.tiles).toHaveLength(1)
    expect(normalized?.tiles[0]).toMatchObject({
      index: 1,
      type: 'property',
      price: 50000000,
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
        value: 7,
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
        value: 450000000,
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
        value: 5000000000,
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
        amount: 3500000000,
        payload: undefined,
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
          balance: 5200000000,
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
          price: 140000000,
        }),
      },
    ])
  })
})
