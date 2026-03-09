import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createGameBoardActionHandlers } from './gameBoardActionHandlers'
import { emitGameAction } from '../../services/socket/game.handler'
import type { BuildModalState } from './gameBoard.types'

vi.mock('../../services/socket/game.handler', () => ({
  emitGameAction: vi.fn(),
}))

vi.mock('../../services/game/game.api', () => ({
  gameApi: {
    sellTile: vi.fn(),
  },
}))

type SetState<T> = (value: T | ((prev: T) => T)) => void

const createDefaultHandlers = (overrides?: {
  roomId?: string | null
  setStatus?: SetState<string>
  setBuildModal?: SetState<BuildModalState>
}) => {
  const setStatus = overrides?.setStatus ?? vi.fn()
  const setBuildModal = overrides?.setBuildModal ?? vi.fn()
  const roomId =
    overrides && 'roomId' in overrides ? overrides.roomId : 'room-1'

  return createGameBoardActionHandlers({
    roomId,
    useGameSocketMock: false,
    roomIdRequiredMessage: 'room id is required',
    setStatus: setStatus as never,
    setBuyModal: vi.fn() as never,
    setBuildModal: setBuildModal as never,
    setTollModal: vi.fn() as never,
    curPlayerRef: { current: 0 },
    tileOwnersRef: { current: {} },
    getPlayerIdByIndex: () => 0,
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

  it('BUILD_PROPERTY 액션을 전송하고 모달을 닫는다', async () => {
    const setBuildModal = vi.fn<SetState<BuildModalState>>()
    const onDoneCallback = vi.fn()
    const handlers = createDefaultHandlers({ setBuildModal })

    await handlers.handleBuildConfirm({
      open: true,
      tileId: 7,
      onDoneCallback,
    })

    expect(emitGameAction).toHaveBeenCalledWith({
      type: 'BUILD_PROPERTY',
      roomId: 'room-1',
      payload: { tileId: 7 },
    })
    expect(setBuildModal).toHaveBeenCalledWith({ open: false, tileId: null })
    expect(onDoneCallback).toHaveBeenCalledTimes(1)
  })

  it('roomId가 없으면 상태만 갱신하고 종료한다', async () => {
    const setStatus = vi.fn<SetState<string>>()
    const setBuildModal = vi.fn<SetState<BuildModalState>>()
    const onDoneCallback = vi.fn()
    const handlers = createDefaultHandlers({
      roomId: null,
      setStatus,
      setBuildModal,
    })

    await handlers.handleBuildConfirm({
      open: true,
      tileId: 2,
      onDoneCallback,
    })

    expect(emitGameAction).not.toHaveBeenCalled()
    expect(setStatus).toHaveBeenCalledWith('room id is required')
    expect(setBuildModal).not.toHaveBeenCalled()
    expect(onDoneCallback).not.toHaveBeenCalled()
  })

  it('tileId가 없으면 아무 동작도 하지 않는다', async () => {
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
})
