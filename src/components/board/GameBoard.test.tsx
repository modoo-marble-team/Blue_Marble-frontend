import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import GameBoard from './GameBoard'
import type { PlayerState } from './board.constants'
import type { GamePrompt, ServerEvent } from '../../types/domain'
import { emitGameAction } from '../../services/socket/game.handler'
import { useGameStore } from '../../stores/game.store'

vi.mock('./BoardTile', () => ({
  default: ({ tile }: { tile: { id: number; name?: string } }) => (
    <div>{tile.name ?? `tile-${tile.id}`}</div>
  ),
  PlayerToken: () => null,
}))

const useBoardEventQueueMock = vi.fn()

vi.mock('./useBoardEventQueue', () => ({
  useBoardEventQueue: (params: unknown) => {
    useBoardEventQueueMock(params)
    return undefined
  },
}))

vi.mock('../../lib/bgm', () => ({
  playLongSfx: vi.fn(),
  stopLongSfx: vi.fn(),
}))

vi.mock('../../services/socket/game.handler', () => ({
  emitGameAction: vi.fn(),
}))

vi.mock('../game/GlobalEffectOverlay', () => ({
  default: () => null,
}))

vi.mock('../game/modals/BuyModal', () => ({
  default: ({ open, cityName }: { open: boolean; cityName?: string }) =>
    open ? <div>{cityName || '도시'} 구매 모달</div> : null,
}))

vi.mock('../game/modals/BuildModal', () => ({
  default: () => null,
}))

vi.mock('../game/modals/CardModal', () => ({
  default: ({ open, onConfirm }: { open: boolean; onConfirm?: () => void }) =>
    open ? <button onClick={onConfirm}>카드 확인</button> : null,
}))

vi.mock('../game/modals/TravelModal', () => ({
  default: ({ open, onConfirm }: { open: boolean; onConfirm?: () => void }) =>
    open ? <button onClick={onConfirm}>여행 확인</button> : null,
}))

vi.mock('../game/modals/CityAcquisitionModals', () => ({
  default: ({
    open,
    ownerName,
    onCancel,
    onAcquire,
  }: {
    open: boolean
    ownerName?: string
    onCancel?: () => void
    onAcquire?: () => void
  }) =>
    open ? (
      <div>
        <div>{ownerName} 인수 모달</div>
        <button onClick={onCancel}>인수 취소</button>
        <button onClick={onAcquire}>인수하기</button>
      </div>
    ) : null,
}))

vi.mock('../game/modals/CitySellModal', () => ({
  default: ({
    open,
    ownerName,
    onCancel,
    onSell,
  }: {
    open: boolean
    ownerName?: string
    onCancel?: () => void
    onSell?: () => void
  }) =>
    open ? (
      <div>
        <div>{ownerName} 수동 매각 모달</div>
        <button onClick={onCancel}>매각 취소</button>
        <button onClick={onSell}>매각하기</button>
      </div>
    ) : null,
}))

vi.mock('../game/modals/InsufficientFundsModal', () => ({
  default: () => null,
}))

vi.mock('../game/modals/TollModal', () => ({
  default: () => null,
}))

vi.mock('../game/modals/BankruptModal', () => ({
  default: () => null,
}))

vi.mock('../game/modals/DoubleDicePopup', () => ({
  default: () => null,
}))

vi.mock('../game/modals/GameResultModal', () => ({
  default: () => null,
}))

vi.mock('../game/modals/GoToIslandModal', () => ({
  default: ({ open, onConfirm }: { open: boolean; onConfirm?: () => void }) =>
    open ? (
      <div>
        <div>무인도 이동 모달</div>
        <button onClick={onConfirm}>무인도 이동 확인</button>
      </div>
    ) : null,
}))

vi.mock('../game/modals/IslandModal', () => ({
  default: ({ open, onConfirm }: { open: boolean; onConfirm?: () => void }) =>
    open ? (
      <div>
        <div>무인도 결과 모달</div>
        <button onClick={onConfirm}>무인도 확인</button>
      </div>
    ) : null,
}))

const players: PlayerState[] = [
  {
    id: 1,
    name: '플레이어1',
    color: '#ff0000',
    pos: 0,
    money: 1000,
    skipTurns: 0,
  },
  {
    id: 2,
    name: '플레이어2',
    color: '#00ff00',
    pos: 3,
    money: 1000,
    skipTurns: 0,
  },
]

const tiles = [
  {
    index: 1,
    name: '테스트서울',
    type: 'PROPERTY',
    building: 1,
    level: 1,
    price: 1000,
    color: '#ff0000',
    owner_id: 1,
  },
  {
    index: 2,
    name: '테스트부산',
    type: 'PROPERTY',
    building: 1,
    level: 1,
    price: 1200,
    color: '#00ff00',
    owner_id: 2,
  },
  {
    index: 16,
    name: '여행',
    type: 'TRAVEL',
    building: 0,
  },
  {
    index: 8,
    name: '무인도',
    type: 'ISLAND',
    building: 0,
  },
  {
    index: 24,
    name: '섬으로 이동',
    type: 'MOVE_TO_ISLAND',
    building: 0,
  },
] as const

const renderGameBoard = (options?: {
  activePrompt?: GamePrompt | null
  onPromptChoice?: (choice: string, payload?: Record<string, unknown>) => void
  allowAssetActions?: boolean
  gamePhase?: 'rolling' | 'resolving' | 'waiting'
}) =>
  render(
    <GameBoard
      gameId="game-1"
      players={players}
      curPlayer={0}
      round={1}
      gamePhase={options?.gamePhase ?? 'rolling'}
      allowAssetActions={options?.allowAssetActions ?? true}
      activePrompt={options?.activePrompt ?? null}
      onPromptChoice={options?.onPromptChoice}
      tiles={[...tiles]}
      localPlayerId={1}
    />
  )

const getBoardQueueCallbacks = () => {
  const lastCall = useBoardEventQueueMock.mock.lastCall?.[0] as
    | {
        onEventConsumed?: (event: ServerEvent) => void
      }
    | undefined

  if (!lastCall?.onEventConsumed) {
    throw new Error('GameBoard queue callbacks were not captured')
  }

  return lastCall
}

const consumeQueuedBoardEvent = async () => {
  await act(async () => {
    const nextEvent = useGameStore.getState().consumeNextEvent()
    if (!nextEvent) {
      throw new Error('No queued board event to consume')
    }
    getBoardQueueCallbacks().onEventConsumed?.(nextEvent)
    await Promise.resolve()
  })
}

beforeAll(() => {
  class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
  }

  class AudioMock {
    play() {
      return Promise.resolve()
    }
  }

  vi.stubGlobal('ResizeObserver', ResizeObserverMock)
  vi.stubGlobal('Audio', AudioMock)
  vi.stubGlobal('requestAnimationFrame', ((callback: FrameRequestCallback) =>
    window.setTimeout(
      () => callback(performance.now()),
      16
    )) as typeof requestAnimationFrame)
  vi.stubGlobal('cancelAnimationFrame', ((handle: number) =>
    window.clearTimeout(handle)) as typeof cancelAnimationFrame)
})

afterAll(() => {
  vi.unstubAllGlobals()
})

describe('GameBoard manual sell selection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useGameStore.getState().resetGame()
  })

  it('opens local sell modal for owned tile and emits SELL_PROPERTY on confirm', async () => {
    const user = userEvent.setup()
    renderGameBoard()

    await user.click(screen.getByText('테스트서울'))

    expect(screen.getByText('플레이어1 수동 매각 모달')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '매각하기' }))

    expect(emitGameAction).toHaveBeenCalledWith({
      type: 'SELL_PROPERTY',
      gameId: 'game-1',
      payload: {
        tileId: 1,
        buildingLevel: 1,
      },
    })
  })

  it('does not open local sell modal for another player owned tile', async () => {
    const user = userEvent.setup()
    renderGameBoard()

    await user.click(screen.getByText('테스트부산'))

    expect(screen.queryByText(/수동 매각 모달/)).not.toBeInTheDocument()
    expect(emitGameAction).not.toHaveBeenCalled()
  })

  it('does not open local sell modal while another prompt is visible', async () => {
    const user = userEvent.setup()
    renderGameBoard({
      activePrompt: {
        id: 'build-1',
        type: 'BUILD_OR_SKIP',
      },
    })

    await user.click(screen.getByText('테스트서울'))

    expect(screen.queryByText(/수동 매각 모달/)).not.toBeInTheDocument()
  })

  it('prioritizes travel selection over local sell click', async () => {
    const user = userEvent.setup()
    const onPromptChoice = vi.fn()
    renderGameBoard({
      activePrompt: {
        id: 'travel-1',
        type: 'TRAVEL',
        choices: [
          { id: 'confirm', label: '확인', value: 'CONFIRM' },
          { id: 'cancel', label: '취소', value: 'SKIP' },
        ],
      },
      onPromptChoice,
    })

    await user.click(screen.getByRole('button', { name: '여행 확인' }))
    await user.click(screen.getByText('테스트서울'))

    expect(screen.queryByText(/수동 매각 모달/)).not.toBeInTheDocument()
    expect(onPromptChoice).toHaveBeenCalledWith('CONFIRM', {
      targetTileId: 1,
    })
  })
})

describe('GameBoard modal reveal timing', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    useGameStore.getState().resetGame()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('keeps buy prompt modal hidden until movement fully finishes', async () => {
    useGameStore.getState().enqueueEvents([
      {
        type: 'PLAYER_MOVED',
        playerId: 1,
        tileIndex: 1,
        payload: {
          fromIndex: 0,
        },
      } as ServerEvent,
    ])

    renderGameBoard({
      activePrompt: {
        id: 'buy-1',
        type: 'BUY_OR_SKIP',
        payload: {
          tileId: 1,
        },
        choices: [
          { id: 'buy', label: '구매하기', value: 'BUY' },
          { id: 'skip', label: '건너뛰기', value: 'SKIP' },
        ],
      },
    })

    expect(screen.queryByText(/구매 모달/)).not.toBeInTheDocument()

    await consumeQueuedBoardEvent()

    expect(screen.queryByText(/구매 모달/)).not.toBeInTheDocument()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1580)
    })

    expect(screen.queryByText(/구매 모달/)).not.toBeInTheDocument()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(16)
    })

    expect(screen.getByText(/구매 모달/)).toBeInTheDocument()
  })

  it('reveals go-to-island modal only after movement finishes and next frame passes', async () => {
    useGameStore.getState().enqueueEvents([
      {
        type: 'PLAYER_MOVED',
        playerId: 1,
        tileIndex: 24,
        payload: {
          fromIndex: 23,
        },
      } as ServerEvent,
    ])

    renderGameBoard()

    expect(screen.queryByText('무인도 이동 모달')).not.toBeInTheDocument()

    await consumeQueuedBoardEvent()

    expect(screen.queryByText('무인도 이동 모달')).not.toBeInTheDocument()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1580)
    })

    expect(screen.queryByText('무인도 이동 모달')).not.toBeInTheDocument()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(16)
    })

    expect(screen.getByText('무인도 이동 모달')).toBeInTheDocument()
  })

  it('reveals travel modal only after arrival move finishes and next frame passes', async () => {
    useGameStore.getState().enqueueEvents([
      {
        type: 'PLAYER_MOVED',
        playerId: 1,
        tileIndex: 16,
        payload: {
          fromIndex: 15,
        },
      } as ServerEvent,
    ])

    renderGameBoard()

    expect(
      screen.queryByRole('button', { name: '여행 확인' })
    ).not.toBeInTheDocument()

    await consumeQueuedBoardEvent()

    expect(
      screen.queryByRole('button', { name: '여행 확인' })
    ).not.toBeInTheDocument()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1580)
    })

    expect(
      screen.queryByRole('button', { name: '여행 확인' })
    ).not.toBeInTheDocument()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(16)
    })

    expect(
      screen.getByRole('button', { name: '여행 확인' })
    ).toBeInTheDocument()
  })

  it('keeps card modal visible before queued chance move consumes, then reveals post-move modal after confirm', async () => {
    useGameStore.getState().enqueueEvents([
      {
        type: 'CHANCE_RESOLVED',
        playerId: 1,
        tileId: 3,
        chance: {
          description: '앞으로 1칸 이동합니다.',
          type: 'MOVE_FORWARD',
          power: 1,
        },
      } as ServerEvent,
      {
        type: 'PLAYER_MOVED',
        playerId: 1,
        tileIndex: 1,
        payload: {
          fromIndex: 0,
          trigger: 'chance',
        },
      } as ServerEvent,
    ])

    renderGameBoard({
      activePrompt: {
        id: 'buy-1',
        type: 'BUY_OR_SKIP',
        payload: {
          tileId: 1,
        },
        choices: [
          { id: 'buy', label: '구매하기', value: 'BUY' },
          { id: 'skip', label: '건너뛰기', value: 'SKIP' },
        ],
      },
    })

    await consumeQueuedBoardEvent()

    expect(
      screen.getByRole('button', { name: '카드 확인' })
    ).toBeInTheDocument()
    expect(screen.queryByText(/구매 모달/)).not.toBeInTheDocument()
    expect(useGameStore.getState().eventQueue).toHaveLength(1)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500)
    })

    expect(
      screen.getByRole('button', { name: '카드 확인' })
    ).toBeInTheDocument()
    expect(useGameStore.getState().eventQueue).toHaveLength(1)

    fireEvent.click(screen.getByRole('button', { name: '카드 확인' }))

    expect(
      screen.queryByRole('button', { name: '카드 확인' })
    ).not.toBeInTheDocument()

    await consumeQueuedBoardEvent()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1580)
    })

    expect(screen.queryByText(/구매 모달/)).not.toBeInTheDocument()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(16)
    })

    expect(screen.getByText(/구매 모달/)).toBeInTheDocument()
  })

  it('opens island modal only after go-to-island confirm triggers the chain move', async () => {
    useGameStore.getState().enqueueEvents([
      {
        type: 'PLAYER_MOVED',
        playerId: 1,
        tileIndex: 24,
        payload: {
          fromIndex: 23,
        },
      } as ServerEvent,
    ])

    renderGameBoard()

    await consumeQueuedBoardEvent()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1580)
      await vi.advanceTimersByTimeAsync(16)
    })

    expect(screen.getByText('무인도 이동 모달')).toBeInTheDocument()
    expect(screen.queryByText('무인도 결과 모달')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '무인도 이동 확인' }))

    expect(screen.queryByText('무인도 결과 모달')).not.toBeInTheDocument()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(900)
    })

    expect(screen.queryByText('무인도 결과 모달')).not.toBeInTheDocument()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100)
    })

    expect(screen.getByText('무인도 결과 모달')).toBeInTheDocument()
  })
})

describe('GameBoard acquisition prompt handling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useGameStore.getState().resetGame()
  })

  it('opens acquisition modal only for canonical acquisition prompt type', () => {
    renderGameBoard({
      activePrompt: {
        id: 'acquire-1',
        type: 'ACQUISITION_OR_SKIP',
        payload: {
          tileId: 2,
          ownerName: '플레이어2',
          buildingLevel: 2,
          acquisitionCost: 1800,
        },
        choices: [
          { id: 'acquire', label: '인수하기', value: 'ACQUIRE' },
          { id: 'skip', label: '넘기기', value: 'SKIP' },
        ],
      },
    })

    expect(screen.getByText('플레이어2 인수 모달')).toBeInTheDocument()
  })

  it('does not open acquisition modal for non-acquisition prompt with acquisition-like payload', () => {
    renderGameBoard({
      activePrompt: {
        id: 'build-1',
        type: 'BUILD_OR_SKIP',
        payload: {
          tileId: 2,
          ownerName: '플레이어2',
          buildingLevel: 2,
          acquisitionCost: 1800,
        },
        choices: [
          { id: 'build', label: '건설', value: 'BUILD' },
          { id: 'skip', label: '건너뛰기', value: 'SKIP' },
        ],
      },
    })

    expect(screen.queryByText(/인수 모달/)).not.toBeInTheDocument()
  })

  it('does not send a fallback acquisition choice when canonical confirm choice is missing', async () => {
    const user = userEvent.setup()
    const onPromptChoice = vi.fn()

    renderGameBoard({
      activePrompt: {
        id: 'acquire-2',
        type: 'ACQUISITION_OR_SKIP',
        payload: {
          tileId: 2,
          ownerName: '플레이어2',
          buildingLevel: 2,
          acquisitionCost: 1800,
        },
        choices: [
          { id: 'skip', label: '넘기기', value: 'SKIP' },
          { id: 'wait', label: '대기', value: 'WAIT' },
        ],
      },
      onPromptChoice,
    })

    await user.click(screen.getByRole('button', { name: '인수하기' }))

    expect(onPromptChoice).not.toHaveBeenCalled()
  })
})
