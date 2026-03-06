import { beforeEach, describe, expect, it } from 'vitest'
import { useGameStore } from '../../stores/game.store'
import {
  syncMockStoreBankrupt,
  syncMockStoreCurrentTurn,
  syncMockStorePlayers,
  syncMockStoreTileOwners,
} from './gameBoardStoreBridge'
import type { PlayerState, TileOwner } from './board.constants'

describe('gameBoardStoreBridge', () => {
  beforeEach(() => {
    useGameStore.getState().resetGame()
    useGameStore.getState().setGameState({
      players: [
        {
          id: 'p1',
          nickname: 'Alpha',
          position: 0,
          balance: 1000,
          owned_tiles: [],
          is_in_jail: false,
          jail_turn_count: 0,
          is_bankrupt: false,
          color: '#f00',
        },
        {
          id: 'p2',
          nickname: 'Beta',
          position: 0,
          balance: 1000,
          owned_tiles: [],
          is_in_jail: false,
          jail_turn_count: 0,
          is_bankrupt: false,
          color: '#00f',
        },
      ],
      tiles: [
        {
          index: 1,
          owner_id: null,
          building: 0,
          name: '수원',
          type: 'city',
        },
        {
          index: 2,
          owner_id: null,
          building: 0,
          name: '용인',
          type: 'city',
        },
      ],
    })
  })

  it('board players를 store players로 반영한다', () => {
    const nextPlayers: PlayerState[] = [
      { id: 0, name: 'Alpha', color: '#f00', pos: 3, money: 900 },
      { id: 1, name: 'Beta', color: '#00f', pos: 5, money: 1100, skipTurns: 1 },
    ]

    syncMockStorePlayers(nextPlayers)

    const { players } = useGameStore.getState()
    expect(players).toEqual([
      expect.objectContaining({
        id: 'p1',
        nickname: 'Alpha',
        position: 3,
        balance: 900,
      }),
      expect.objectContaining({
        id: 'p2',
        nickname: 'Beta',
        position: 5,
        balance: 1100,
      }),
    ])
  })

  it('현재 턴과 파산 상태를 store에 반영한다', () => {
    syncMockStoreCurrentTurn(1)
    syncMockStoreBankrupt(0)

    const { currentTurn, currentPlayerId, players } = useGameStore.getState()
    expect(currentTurn).toBe('p2')
    expect(currentPlayerId).toBe('p2')
    expect(players[0]?.is_bankrupt).toBe(true)
  })

  it('tile owner 정보를 store tiles로 반영한다', () => {
    const nextTileOwners: Record<number, TileOwner> = {
      1: { ownerId: 0, ownerColor: '#f00', level: 2 },
      2: { ownerId: 1, ownerColor: '#00f', level: 5 },
    }

    syncMockStoreTileOwners(nextTileOwners)

    const { tiles } = useGameStore.getState()
    expect(tiles).toEqual([
      expect.objectContaining({
        index: 1,
        owner_id: 'p1',
        building: 2,
      }),
      expect.objectContaining({
        index: 2,
        owner_id: 'p2',
        building: 5,
      }),
    ])
  })
})
