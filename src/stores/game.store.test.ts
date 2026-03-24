import { afterEach, describe, expect, it, vi } from 'vitest'
import type { GamePrompt, Player, Tile } from '../types/domain'
import { useGameStore } from './game.store'

const createPlayer = (overrides: Partial<Player> = {}): Player => ({
  id: 'player-1',
  nickname: 'Player 1',
  color: '#ff0000',
  position: 0,
  balance: 1000,
  owned_tiles: [],
  is_in_jail: false,
  jail_turn_count: 0,
  is_bankrupt: false,
  ...overrides,
})

const createTile = (overrides: Partial<Tile> = {}): Tile => ({
  index: 1,
  name: 'Seoul',
  type: 'city',
  price: 100,
  owner_id: null,
  building: 0,
  ...overrides,
})

describe('game store partial updates', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    useGameStore.getState().resetGame()
  })

  it('preserves existing players and tiles when metadata only updates are applied', () => {
    const store = useGameStore.getState()

    store.setGameState({
      players: [createPlayer()],
      tiles: [createTile()],
    })

    store.setGameState({
      roomId: 'room-1',
      session: {
        roomId: 'room-1',
        gameId: null,
        transport: 'event-socket',
        syncedAt: null,
      },
    })

    const nextState = useGameStore.getState()

    expect(nextState.players).toHaveLength(1)
    expect(nextState.tiles).toHaveLength(1)
    expect(nextState.roomId).toBe('room-1')
    expect(nextState.session.transport).toBe('event-socket')
  })

  it('normalizes players, tiles, and current turn aliases', () => {
    const store = useGameStore.getState()

    store.setGameState({
      currentTurn: 'player-2',
      players: [
        createPlayer({
          id: 'player-2',
          is_in_jail: true,
        }),
      ],
      tiles: [
        createTile({
          owner_id: 'player-2',
        }),
      ],
      prompt: null,
      eventQueue: undefined,
    })

    const nextState = useGameStore.getState()

    expect(nextState.currentPlayerId).toBe('player-2')
    expect(nextState.players[0]?.state).toBe('island')
    expect(nextState.tiles[0]?.ownerId).toBe('player-2')
    expect(nextState.tiles[0]?.owner_id).toBe('player-2')
    expect(nextState.eventQueue).toEqual([])
  })

  it('updates player and tile fields while preserving normalized aliases', () => {
    const store = useGameStore.getState()

    store.setGameState({
      players: [createPlayer()],
      tiles: [createTile()],
    })

    store.updatePlayer('player-1', {
      is_bankrupt: true,
    })
    store.updateTile(1, {
      ownerId: 'player-1',
    })

    const nextState = useGameStore.getState()

    expect(nextState.players[0]?.is_bankrupt).toBe(true)
    expect(nextState.players[0]?.state).toBe('normal')
    expect(nextState.tiles[0]?.owner_id).toBe('player-1')
    expect(nextState.tiles[0]?.ownerId).toBe('player-1')
  })

  it('applies patch envelopes and ignores stale revisions', () => {
    const store = useGameStore.getState()

    store.setGameState({
      revision: 1,
      round: 1,
      players: [createPlayer()],
      messages: [],
      eventQueue: [],
    })

    store.applyPatchEnvelope({
      revision: 3,
      patch: [
        { op: 'set', path: 'players.0.balance', value: 1200 },
        { op: 'inc', path: 'round', value: 1 },
        {
          op: 'push',
          path: 'messages',
          value: {
            id: 'message-1',
            sender_id: 'player-1',
            sender_nickname: 'Player 1',
            content: 'hello',
            timestamp: '2026-03-04T00:00:00.000Z',
            type: 'talk',
          },
        },
        {
          op: 'push',
          path: 'eventQueue',
          value: {
            type: 'MOVE',
            playerId: 'player-1',
          },
        },
        {
          op: 'remove',
          path: 'messages',
          index: 0,
        },
      ],
      events: [
        {
          type: 'TURN_START',
          playerId: 'player-1',
        },
      ],
    })

    store.applyPatchEnvelope({
      revision: 2,
      patch: [{ op: 'set', path: 'round', value: 99 }],
    })

    const nextState = useGameStore.getState()

    expect(nextState.revision).toBe(3)
    expect(nextState.players[0]?.balance).toBe(1200)
    expect(nextState.round).toBe(2)
    expect(nextState.messages).toEqual([])
    expect(nextState.eventQueue).toHaveLength(2)
  })

  it('resolves id-based player and tile patch paths', () => {
    const store = useGameStore.getState()

    store.setGameState({
      revision: 1,
      players: [
        createPlayer({
          id: 105,
          balance: 500,
          position: 2,
        }),
        createPlayer({
          id: 'player-2',
          balance: 400,
          position: 1,
        }),
      ],
      tiles: [
        createTile({
          index: 12,
          ownerId: null,
          owner_id: null,
        }),
      ],
    })

    store.applyPatchEnvelope({
      revision: 2,
      patch: [
        { op: 'set', path: 'players.105.balance', value: 750 },
        { op: 'set', path: ['players', 'player-2', 'position'], value: 9 },
        { op: 'set', path: 'tiles.12.ownerId', value: 'player-2' },
        { op: 'set', path: ['tiles', 12, 'building'], value: 3 },
      ],
    })

    const nextState = useGameStore.getState()

    expect(nextState.players[0]?.balance).toBe(750)
    expect(nextState.players[1]?.position).toBe(9)
    expect(nextState.tiles[0]?.ownerId).toBe('player-2')
    expect(nextState.tiles[0]?.owner_id).toBe('player-2')
    expect(nextState.tiles[0]?.building).toBe(3)
  })

  it('synchronizes currentTurn alias when currentPlayerId is patched', () => {
    const store = useGameStore.getState()

    store.setGameState({
      revision: 1,
      currentTurn: 'player-1',
      currentPlayerId: 'player-1',
      players: [
        createPlayer({ id: 'player-1' }),
        createPlayer({ id: 'player-2' }),
      ],
    })

    store.applyPatchEnvelope({
      revision: 2,
      patch: [{ op: 'set', path: 'currentPlayerId', value: 'player-2' }],
    })

    const nextState = useGameStore.getState()

    expect(nextState.currentPlayerId).toBe('player-2')
    expect(nextState.currentTurn).toBe('player-2')
  })

  it('tracks pending actions, acknowledgements, prompts, and queue consumption', () => {
    const store = useGameStore.getState()
    const prompt: GamePrompt = {
      id: 'prompt-1',
      type: 'select',
    }

    store.setPendingAction({
      actionId: 'action-1',
      type: 'ROLL_DICE',
      requestedAt: Date.now(),
    })
    store.resolveAck({
      actionId: 'action-1',
      ok: false,
      error: { code: 'GAME_ACTION_REJECTED', message: 'rejected' },
    })
    store.setPrompt(prompt)
    store.clearPrompt('other-prompt')
    store.clearPrompt('prompt-1')
    store.enqueueEvents([
      {
        type: 'MOVE',
        playerId: 'player-1',
      },
    ])

    const consumedEvent = store.consumeNextEvent()
    const nextState = useGameStore.getState()

    expect(consumedEvent?.type).toBe('MOVE')
    expect(nextState.pendingAction).toBeNull()
    expect(nextState.lastError?.code).toBe('GAME_ACTION_REJECTED')
    expect(nextState.prompt).toBeNull()
    expect(nextState.eventQueue).toEqual([])
  })

  it('clears stale prompt and pendingAction when snapshot omits both keys', () => {
    const store = useGameStore.getState()

    store.setGameState({
      prompt: {
        id: 'prompt-stale',
        type: 'BUY_OR_SKIP',
      },
      pendingAction: {
        actionId: 'action-stale',
        type: 'ROLL_DICE',
        requestedAt: Date.now(),
      },
    })

    store.replaceFromSnapshot({
      roomId: 'room-1',
      gameId: 'game-1',
      revision: 9,
      phase: 'rolling',
      players: [createPlayer()],
      tiles: [createTile()],
      currentPlayerId: 'player-1',
      currentTurn: 'player-1',
      round: 3,
      turnTimeoutSec: 30,
      gameResult: null,
      isGameOver: false,
      winnerId: null,
    })

    const nextState = useGameStore.getState()

    expect(nextState.prompt).toBeNull()
    expect(nextState.pendingAction).toBeNull()
  })

  it('applies revision 0 patch envelopes and keeps current revision value', () => {
    const store = useGameStore.getState()

    store.setGameState({
      revision: 7,
      round: 1,
    })

    store.applyPatchEnvelope({
      revision: 0,
      patch: [{ op: 'set', path: 'round', value: 2 }],
      events: [],
    })

    const nextState = useGameStore.getState()

    expect(nextState.round).toBe(2)
    expect(nextState.revision).toBe(7)
  })

  it('applies same-revision patch envelopes to support ack-first delivery', () => {
    const store = useGameStore.getState()

    store.setGameState({
      revision: 5,
      round: 1,
    })

    store.applyPatchEnvelope({
      revision: 5,
      patch: [{ op: 'set', path: 'round', value: 6 }],
      events: [],
    })

    const nextState = useGameStore.getState()

    expect(nextState.round).toBe(6)
    expect(nextState.revision).toBe(5)
  })

  it('resets turn timer key when TURN_ENDED event arrives for same player turn', () => {
    const store = useGameStore.getState()
    const dateNowSpy = vi.spyOn(Date, 'now').mockReturnValue(17_000)

    store.setGameState({
      revision: 4,
      phase: 'rolling',
      round: 4,
      currentPlayerId: 'player-1',
      currentTurn: 'player-1',
      turnTimerKey: 10,
    })

    store.applyPatchEnvelope({
      revision: 5,
      patch: [],
      events: [
        {
          type: 'TURN_ENDED',
          playerId: 'player-1',
          payload: { nextPlayerId: 'player-1' },
        },
      ],
    })

    const nextState = useGameStore.getState()

    expect(nextState.turnTimerKey).toBe(17_000)
    expect(dateNowSpy).toHaveBeenCalled()
  })

  it('resets turn timer key and round when envelope turn increments', () => {
    const store = useGameStore.getState()
    vi.spyOn(Date, 'now').mockReturnValue(33_000)

    store.setGameState({
      revision: 8,
      phase: 'rolling',
      round: 8,
      currentPlayerId: 'player-1',
      currentTurn: 'player-1',
      turnTimerKey: 20,
    })

    store.applyPatchEnvelope({
      revision: 9,
      turn: 9,
      patch: [],
      events: [],
    })

    const nextState = useGameStore.getState()

    expect(nextState.round).toBe(9)
    expect(nextState.turnTimerKey).toBe(33_000)
  })

  it('does not reset turn timer key for non-turn patch updates', () => {
    const store = useGameStore.getState()
    vi.spyOn(Date, 'now').mockReturnValue(44_000)

    store.setGameState({
      revision: 11,
      phase: 'rolling',
      round: 11,
      currentPlayerId: 'player-1',
      currentTurn: 'player-1',
      turnTimerKey: 30,
      players: [createPlayer({ id: 'player-1', balance: 500 })],
    })

    store.applyPatchEnvelope({
      revision: 12,
      patch: [{ op: 'set', path: 'players.0.balance', value: 750 }],
      events: [],
    })

    const nextState = useGameStore.getState()

    expect(nextState.players[0]?.balance).toBe(750)
    expect(nextState.turnTimerKey).toBe(30)
  })

  it('marks game over when phase is patched to finished', () => {
    const store = useGameStore.getState()

    store.setGameState({
      revision: 10,
      phase: 'rolling',
      isGameOver: false,
    })

    store.applyPatchEnvelope({
      revision: 11,
      patch: [{ op: 'set', path: 'phase', value: 'finished' }],
      events: [],
    })

    const nextState = useGameStore.getState()

    expect(nextState.phase).toBe('finished')
    expect(nextState.isGameOver).toBe(true)
  })

  it('applies timer sync to turn timer and prompt timeout when prompt id matches', () => {
    const store = useGameStore.getState()

    store.setGameState({
      gameId: 'game-before-sync',
      turnTimeoutSec: 30,
      turnTimerKey: 1,
      prompt: {
        id: 'prompt-sync-target',
        type: 'CONFIRM_ONLY',
        timeoutSec: 20,
      },
    })

    store.applyTimerSync({
      gameId: 'game-after-sync',
      turnRemainingSec: 13,
      promptId: 'prompt-sync-target',
      promptRemainingSec: 5,
      syncedAt: '2026-03-19T12:00:00.000Z',
    })

    const nextState = useGameStore.getState()

    expect(nextState.gameId).toBe('game-after-sync')
    expect(nextState.session.gameId).toBe('game-after-sync')
    expect(nextState.turnTimeoutSec).toBe(13)
    expect(nextState.turnTimerKey).toBeGreaterThan(1)
    expect(nextState.prompt?.timeoutSec).toBe(5)
    expect(nextState.session.syncedAt).toBe('2026-03-19T12:00:00.000Z')
  })

  it('does not overwrite prompt timeout when timer sync prompt id is different', () => {
    const store = useGameStore.getState()

    store.setGameState({
      prompt: {
        id: 'prompt-current',
        type: 'BUY_OR_SKIP',
        timeoutSec: 14,
      },
    })

    store.applyTimerSync({
      turnRemainingSec: 9,
      promptId: 'prompt-other',
      promptRemainingSec: 3,
    })

    const nextState = useGameStore.getState()

    expect(nextState.turnTimeoutSec).toBe(9)
    expect(nextState.prompt?.timeoutSec).toBe(14)
  })
})
