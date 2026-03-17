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
    ])
  })
})
