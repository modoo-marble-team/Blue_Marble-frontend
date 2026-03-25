import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import GameBoard from './GameBoard'
import type { PlayerState } from './board.constants'
import type { GamePrompt } from '../../types/domain'
import { emitGameAction } from '../../services/socket/game.handler'
import { useGameStore } from '../../stores/game.store'

vi.mock('./BoardTile', () => ({
  default: ({ tile }: { tile: { id: number; name?: string } }) => (
    <div>{tile.name ?? `tile-${tile.id}`}</div>
  ),
  PlayerToken: () => null,
}))

vi.mock('./useBoardEventQueue', () => ({
  useBoardEventQueue: () => undefined,
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
  default: () => null,
}))

vi.mock('../game/modals/BuildModal', () => ({
  default: () => null,
}))

vi.mock('../game/modals/CardModal', () => ({
  default: () => null,
}))

vi.mock('../game/modals/TravelModal', () => ({
  default: ({ open, onConfirm }: { open: boolean; onConfirm?: () => void }) =>
    open ? <button onClick={onConfirm}>여행 확인</button> : null,
}))

vi.mock('../game/modals/CityAcquisitionModals', () => ({
  default: () => null,
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
  default: () => null,
}))

vi.mock('../game/modals/IslandModal', () => ({
  default: () => null,
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
