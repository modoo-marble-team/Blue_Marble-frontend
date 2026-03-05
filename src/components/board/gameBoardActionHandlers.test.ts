import { describe, expect, it, vi, beforeEach } from 'vitest'
import { createGameBoardActionHandlers } from './gameBoardActionHandlers'
import { gameApi } from '../../services/game/game.api'
import type { PlayerState, TileOwner } from './board.constants'

vi.mock('../../services/socket/game.handler', () => ({
  emitGameAction: vi.fn(),
}))

describe('createGameBoardActionHandlers', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  const createBaseParams = () => {
    const playersRef = {
      current: [
        {
          id: 0,
          name: 'P1',
          color: '#EF5350',
          pos: 0,
          money: 1000000000,
        },
        {
          id: 1,
          name: 'P2',
          color: '#42A5F5',
          pos: 0,
          money: 1000000000,
        },
      ] as PlayerState[],
    }

    const curPlayerRef = { current: 0 }
    const tileOwnersRef = { current: {} as Record<number, TileOwner> }

    return {
      roomId: 'room-1',
      useGameSocketMock: true,
      roomIdRequiredMessage: 'room id required',
      setStatus: vi.fn(),
      setOptimisticTileOwners: vi.fn(),
      setBuyModal: vi.fn(),
      setBuildModal: vi.fn(),
      setTollModal: vi.fn(),
      playersRef,
      curPlayerRef,
      tileOwnersRef,
      publishPlayers: vi.fn(),
      publishCurrentTurn: vi.fn(),
      publishTileOwners: vi.fn(),
      getPlayerIdByIndex: vi.fn((idx: number) => idx),
      getPlayerColorByIndex: vi.fn(() => '#EF5350'),
      getPlayerIndexById: vi.fn((id: number) => id),
      toBoardBuildingLevel: vi.fn(() => 0),
      getPurchaseCost: vi.fn(() => 100),
      getUpgradeCost: vi.fn(() => 50),
      calcToll: vi.fn(() => 100),
      getTilePrice: vi.fn(() => 100),
      updateTileOwners: vi.fn(),
      applyMoney: vi.fn(() => false),
      advanceTurn: vi.fn(),
    }
  }

  it('advances turn after successful BUY in mock flow', async () => {
    vi.spyOn(gameApi, 'buyTile').mockResolvedValue({
      ok: true,
      data: {},
    } as const)

    const params = createBaseParams()
    const handlers = createGameBoardActionHandlers(params)
    const onDoneCallback = vi.fn()

    await handlers.handleBuy({
      open: true,
      tileId: 5,
      onDoneCallback,
    })

    expect(params.advanceTurn).toHaveBeenCalledTimes(1)
    expect(params.advanceTurn).toHaveBeenCalledWith(onDoneCallback)
  })

  it('advances turn after successful BUILD in mock flow', async () => {
    vi.spyOn(gameApi, 'buildTile').mockResolvedValue({
      ok: true,
      data: {},
    } as const)

    const params = createBaseParams()
    params.tileOwnersRef.current[5] = {
      ownerId: 0,
      ownerColor: '#EF5350',
      level: 1,
    }
    const handlers = createGameBoardActionHandlers(params)
    const onDoneCallback = vi.fn()

    await handlers.handleBuildConfirm({
      open: true,
      tileId: 5,
      onDoneCallback,
    })

    expect(params.advanceTurn).toHaveBeenCalledTimes(1)
    expect(params.advanceTurn).toHaveBeenCalledWith(onDoneCallback)
  })
})
