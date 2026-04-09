import { act, fireEvent, render, screen } from '@testing-library/react'
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
  default: ({ open }: { open: boolean }) =>
    open ? <div data-testid="buy-modal">buy-modal</div> : null,
}))

vi.mock('../game/modals/BuildModal', () => ({
  default: () => null,
}))

vi.mock('../game/modals/CardModal', () => ({
  default: () => null,
}))

vi.mock('../game/modals/TravelModal', () => ({
  default: () => null,
}))

vi.mock('../game/modals/CityAcquisitionModals', () => ({
  default: () => null,
}))

vi.mock('../game/modals/CitySellModal', () => ({
  default: () => null,
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
  default: ({ open, onConfirm }: { open: boolean; onConfirm?: () => void }) =>
    open ? (
      <button type="button" onClick={onConfirm}>
        double-confirm
      </button>
    ) : null,
}))

vi.mock('../game/modals/GameResultModal', () => ({
  default: () => null,
}))

vi.mock('../game/modals/GoToIslandModal', () => ({
  default: () => null,
}))

vi.mock('../game/modals/IslandModal', () => ({
  default: () => null,
}))

const players: PlayerState[] = [
  {
    id: 1,
    name: 'player-1',
    color: '#ff0000',
    pos: 0,
    money: 1000,
    skipTurns: 0,
  },
  {
    id: 2,
    name: 'player-2',
    color: '#00ff00',
    pos: 3,
    money: 1000,
    skipTurns: 0,
  },
]

const renderGameBoard = (options?: { activePrompt?: GamePrompt | null }) =>
  render(
    <GameBoard
      gameId="game-1"
      players={players}
      curPlayer={0}
      round={1}
      gamePhase="rolling"
      allowAssetActions={true}
      activePrompt={options?.activePrompt ?? null}
      tiles={[]}
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

describe('GameBoard double ordering', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    useGameStore.getState().resetGame()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('opens double popup when dice values are equal even if double flags are false', async () => {
    useGameStore.getState().enqueueEvents([
      {
        type: 'DICE_ROLLED',
        playerId: 1,
        payload: {
          dice: [3, 3],
          isDouble: false,
          is_double: false,
          doubleCount: 0,
        },
      } as ServerEvent,
    ])

    renderGameBoard()
    await consumeQueuedBoardEvent()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500)
    })

    expect(
      screen.getByRole('button', { name: 'double-confirm' })
    ).toBeInTheDocument()
  })

  it('keeps follow-up move queued until double popup confirm', async () => {
    useGameStore.getState().enqueueEvents([
      {
        type: 'DICE_ROLLED',
        playerId: 1,
        payload: {
          dice: [5, 5],
          total: 10,
          isDouble: false,
          is_double: false,
          doubleCount: 0,
        },
      } as ServerEvent,
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
        payload: { tileId: 1 },
        choices: [
          { id: 'buy', label: 'BUY', value: 'BUY' },
          { id: 'skip', label: 'SKIP', value: 'SKIP' },
        ],
      },
    })

    await consumeQueuedBoardEvent()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500)
    })

    expect(useGameStore.getState().eventQueue).toHaveLength(1)
    expect(
      screen.getByRole('button', { name: 'double-confirm' })
    ).toBeInTheDocument()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(700)
    })
    expect(useGameStore.getState().eventQueue).toHaveLength(1)

    fireEvent.click(screen.getByRole('button', { name: 'double-confirm' }))
    await consumeQueuedBoardEvent()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1600)
      await vi.advanceTimersByTimeAsync(16)
    })

    expect(useGameStore.getState().eventQueue).toHaveLength(0)
  })
})
