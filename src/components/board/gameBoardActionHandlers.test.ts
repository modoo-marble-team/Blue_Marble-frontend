import { beforeEach, describe, expect, it, vi } from 'vitest'
import { emitGameAction } from '../../services/socket/game.handler'
import { createGameBoardActionHandlers } from './gameBoardActionHandlers'
import type { BuildModalState } from './gameBoard.types'
import type { TileOwner } from './board.constants'

vi.mock('../../services/socket/game.handler', () => ({
  emitGameAction: vi.fn(),
}))

type SetState<T> = (value: T | ((prev: T) => T)) => void

const createDefaultHandlers = (overrides?: {
  gameId?: string | null
  setStatus?: SetState<string>
  setBuildModal?: SetState<BuildModalState>
  tileOwners?: Record<number, TileOwner>
  getPlayerIdByIndex?: (playerIdx: number) => number
}) => {
  const setStatus = overrides?.setStatus ?? vi.fn()
  const setBuildModal = overrides?.setBuildModal ?? vi.fn()
  const gameId: string | null =
    overrides?.gameId === undefined ? 'game-1' : overrides.gameId
  const tileOwners = overrides?.tileOwners ?? {}
  const getPlayerIdByIndex = overrides?.getPlayerIdByIndex ?? (() => 0)

  return createGameBoardActionHandlers({
    gameId,
    useGameSocketMock: false,
    gameIdRequiredMessage: 'game id is required',
    setStatus: setStatus as never,
    setBuyModal: vi.fn() as never,
    setBuildModal: setBuildModal as never,
    setTollModal: vi.fn() as never,
    curPlayerRef: { current: 0 },
    tileOwnersRef: { current: tileOwners },
    getPlayerIdByIndex,
    getPlayerColorByIndex: () => '#000',
    getPlayerIndexById: () => 0,
    getPurchaseCost: () => 0,
    getUpgradeCost: () => 0,
    calcToll: () => 0,
    getTilePrice: () => 0,
    updateTileOwners: () => undefined,
    applyMoney: () => false,
    advanceTurn: () => undefined,
  })
}

describe('createGameBoardActionHandlers - non mock build action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('sends BUY_PROPERTY action and closes modal', async () => {
    const setBuildModal = vi.fn<SetState<BuildModalState>>()
    const onDoneCallback = vi.fn()
    const handlers = createDefaultHandlers({ setBuildModal })

    await handlers.handleBuildConfirm({
      open: true,
      tileId: 7,
      onDoneCallback,
    })

    expect(emitGameAction).toHaveBeenCalledWith({
      type: 'BUY_PROPERTY',
      gameId: 'game-1',
      payload: { tileId: 7 },
    })
    expect(setBuildModal).toHaveBeenCalledWith({ open: false, tileId: null })
    expect(onDoneCallback).toHaveBeenCalledTimes(1)
  })

  it('does not emit when gameId is missing', async () => {
    const setStatus = vi.fn<SetState<string>>()
    const setBuildModal = vi.fn<SetState<BuildModalState>>()
    const onDoneCallback = vi.fn()
    const handlers = createDefaultHandlers({
      gameId: null,
      setStatus,
      setBuildModal,
    })

    await handlers.handleBuildConfirm({
      open: true,
      tileId: 2,
      onDoneCallback,
    })

    expect(emitGameAction).not.toHaveBeenCalled()
    expect(setStatus).toHaveBeenCalledWith('game id is required')
    expect(setBuildModal).not.toHaveBeenCalled()
    expect(onDoneCallback).not.toHaveBeenCalled()
  })

  it('does nothing when tileId is missing', async () => {
    const setStatus = vi.fn<SetState<string>>()
    const setBuildModal = vi.fn<SetState<BuildModalState>>()
    const handlers = createDefaultHandlers({ setStatus, setBuildModal })

    await handlers.handleBuildConfirm({
      open: true,
      tileId: null,
    })

    expect(emitGameAction).not.toHaveBeenCalled()
    expect(setStatus).not.toHaveBeenCalled()
    expect(setBuildModal).not.toHaveBeenCalled()
  })

  it('sends SELL_PROPERTY action with current owner level', async () => {
    const handlers = createDefaultHandlers({
      tileOwners: {
        7: {
          ownerId: 11,
          ownerColor: '#f00',
          level: 2,
        },
      },
      getPlayerIdByIndex: () => 11,
    })

    const result = await handlers.sellOwnedTileForPlayer(0, {
      tileId: 7,
    })

    expect(result).toBe(true)
    expect(emitGameAction).toHaveBeenCalledWith({
      type: 'SELL_PROPERTY',
      gameId: 'game-1',
      payload: { tileId: 7, buildingLevel: 2 },
    })
  })
})
