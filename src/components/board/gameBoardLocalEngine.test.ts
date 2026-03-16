import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PlayerState, TileData, TileOwner } from './board.constants'
import type { BankruptModalState } from './gameBoard.types'
import {
  advanceMockTurn,
  applyMockMoney,
  buildPlayerResults,
  removeOwnedTilesByPlayerId,
} from './gameBoardLocalEngine'

const createPlayers = (): PlayerState[] => [
  { id: 0, name: 'p1', color: '#f00', pos: 0, money: 100, skipTurns: 0 },
  { id: 1, name: 'p2', color: '#0f0', pos: 0, money: 100, skipTurns: 0 },
  { id: 2, name: 'p3', color: '#00f', pos: 0, money: 100, skipTurns: 0 },
]

const createTiles = (): TileData[] =>
  Array.from({ length: 5 }, (_, id) => ({
    id,
    name: `tile-${id}`,
    type: 'PROPERTY',
    price: id * 10,
  }))

describe('gameBoardLocalEngine', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  it('returns early in applyMockMoney when mock mode is disabled', () => {
    const playersRef = { current: createPlayers() }
    const publishPlayers = vi.fn()
    const setBankruptModal =
      vi.fn<
        (
          value:
            | BankruptModalState
            | ((prev: BankruptModalState) => BankruptModalState)
        ) => void
      >()
    const onDone = vi.fn()

    const isBankrupt = applyMockMoney({
      useGameSocketMock: false,
      playersRef,
      playerIdx: 0,
      delta: -10,
      publishPlayers,
      setBankruptModal,
      onDoneCallback: onDone,
    })

    expect(isBankrupt).toBe(false)
    expect(onDone).toHaveBeenCalledTimes(1)
    expect(publishPlayers).not.toHaveBeenCalled()
    expect(setBankruptModal).not.toHaveBeenCalled()
  })

  it('updates player money and opens bankrupt modal when balance reaches zero', async () => {
    const players = createPlayers()
    players[0].money = 5
    const playersRef = { current: players }
    const publishPlayers = vi.fn()
    const setBankruptModal =
      vi.fn<
        (
          value:
            | BankruptModalState
            | ((prev: BankruptModalState) => BankruptModalState)
        ) => void
      >()
    const onDone = vi.fn()

    const isBankrupt = applyMockMoney({
      useGameSocketMock: true,
      playersRef,
      playerIdx: 0,
      delta: -10,
      publishPlayers,
      setBankruptModal,
      onDoneCallback: onDone,
    })

    await vi.runAllTimersAsync()

    expect(isBankrupt).toBe(true)
    expect(playersRef.current[0].money).toBe(0)
    expect(publishPlayers).toHaveBeenCalledTimes(1)
    expect(setBankruptModal).toHaveBeenCalledWith({
      open: true,
      playerIdx: 0,
      playerName: 'p1',
      onDoneCallback: onDone,
    })
  })

  it('advances turn while skipping bankrupt and locked turns', async () => {
    const players = createPlayers()
    players[1].skipTurns = 1
    const playersRef = { current: players }
    const curPlayerRef = { current: 0 }
    const bankruptSetRef = { current: new Set<number>() }
    const publishPlayers = vi.fn()
    const syncCurrentTurn = vi.fn()
    const onDone = vi.fn()

    advanceMockTurn({
      useGameSocketMock: true,
      playersRef,
      curPlayerRef,
      bankruptSetRef,
      publishPlayers,
      syncCurrentTurn,
      fallbackPlayerCount: 4,
      onDone,
    })

    expect(syncCurrentTurn).toHaveBeenNthCalledWith(1, 1)
    expect(playersRef.current[1].skipTurns).toBe(0)
    expect(onDone).not.toHaveBeenCalled()

    await vi.runAllTimersAsync()

    expect(curPlayerRef.current).toBe(2)
    expect(syncCurrentTurn).toHaveBeenNthCalledWith(2, 2)
    expect(onDone).toHaveBeenCalledTimes(1)
  })

  it('removes all ownership entries for a bankrupt player', () => {
    const owners: Record<number, TileOwner> = {
      1: { ownerId: 1, ownerColor: '#f00', level: 1 },
      2: { ownerId: 2, ownerColor: '#0f0', level: 3 },
      3: { ownerId: 1, ownerColor: '#f00', level: 2 },
    }

    const next = removeOwnedTilesByPlayerId(owners, 1)

    expect(next).toEqual({
      2: { ownerId: 2, ownerColor: '#0f0', level: 3 },
    })
  })

  it('builds sorted player results from players and tile ownership', () => {
    const players = createPlayers()
    players[0].money = 80
    players[1].money = 90
    players[2].money = 120

    const tiles = createTiles()
    const tileOwners: Record<number, TileOwner> = {
      1: { ownerId: 0, ownerColor: '#f00', level: 1 },
      3: { ownerId: 0, ownerColor: '#f00', level: 2 },
      4: { ownerId: 2, ownerColor: '#00f', level: 1 },
    }

    const results = buildPlayerResults({
      players,
      tileOwners,
      tiles,
      bankruptPlayerIndexes: new Set([2]),
    })

    expect(results[0].id).toBe('0')
    expect(results[0].totalAsset).toBe(120)
    expect(results[0].ownedCityCount).toBe(2)
    expect(results[2].id).toBe('2')
    expect(results[2].isBankrupt).toBe(true)
  })
})
