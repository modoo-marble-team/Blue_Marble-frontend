import { describe, expect, it } from 'vitest'
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
      balance: 210,
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
      balance: 300,
    })
    expect(normalized?.tiles).toHaveLength(1)
    expect(normalized?.tiles[0]).toMatchObject({
      index: 1,
      type: 'property',
      price: 50,
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
    ])
  })
})
