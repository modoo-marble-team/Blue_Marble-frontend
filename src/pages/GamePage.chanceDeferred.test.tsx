import { forwardRef, useEffect } from 'react'
import { Route, Routes } from 'react-router-dom'
import { act, cleanup, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import GamePage from './GamePage'
import { useAuthStore } from '../features/auth/session/store'
import { useGameStore } from '../stores/game.store'
import { createAuthSessionFixture } from '../test/fixtures'
import { renderWithProviders } from '../test/renderWithProviders'
import type { Player, ServerEvent } from '../types/domain'

const { useGameStateMock } = vi.hoisted(() => ({
  useGameStateMock: vi.fn(),
}))

vi.mock('../config/env', () => ({
  IS_DEMO_MOCK_ENABLED: false,
  IS_SOCKET_MOCK_ENABLED: false,
  SHOW_GAME_DEBUG_OVERLAY: false,
  SHOULD_ENABLE_MSW: true,
}))

vi.mock('react-router-dom', async () => {
  const actual =
    await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  }
})

vi.mock('../hooks/game/useGameState', () => ({
  useGameState: useGameStateMock,
}))

vi.mock('../hooks/game/useDiceRoll', () => ({
  useDiceRoll: () => vi.fn(),
}))

vi.mock('../hooks/game/useTurn', () => ({
  useTurn: () => true,
}))

vi.mock('../lib/socket', () => ({
  socket: {
    on: vi.fn(),
    off: vi.fn(),
    connected: true,
    disconnect: vi.fn(),
  },
}))

vi.mock('../lib/bgm', () => ({
  playBgm: vi.fn(),
  stopBgm: vi.fn(),
}))

vi.mock('../services/socket/game.handler', () => ({
  emitPromptResponse: vi.fn(),
  emitGameAction: vi.fn(),
}))

vi.mock('../pages/waiting-room/socket/socket', () => ({
  sendWaitingRoomChat: vi.fn(),
}))

vi.mock('../features/presence/online-users/onlineUsersSocket', () => ({
  requestOnlineUsersSnapshotSync: vi.fn(),
}))

vi.mock('./game/api', () => ({
  leaveRoomFromGame: vi.fn(),
  getGameLeaveErrorMessage: vi.fn(() => 'leave failed'),
}))

vi.mock('../components/game/modals/promptModalMapping', () => ({
  isPromptHandledByBoardModal: () => false,
}))

vi.mock('../components/game/controls/RollButton', () => ({
  default: () => null,
}))

vi.mock('../components/game/modals/ExitGameModal', () => ({
  default: () => null,
}))

vi.mock('../components/game/GlobalEffectModal', () => ({
  default: () => null,
}))

vi.mock('../features/room-chat/RoomChat', () => ({
  default: () => null,
}))

vi.mock('../features/room-chat/DevRoomChatControlPanel', () => ({
  DevRoomChatControlPanel: () => null,
}))

vi.mock('../components/game/panels/PlayerPanel', () => ({
  default: ({
    player,
  }: {
    player: { id: string; money: number; totalAssets: number }
  }) => (
    <div data-testid={`panel-${player.id}`}>
      money:{player.money}|assets:{player.totalAssets}
    </div>
  ),
}))

vi.mock('../components/board/GameBoard', () => ({
  default: forwardRef<
    HTMLDivElement,
    {
      onBlockingModalChange?: (blocked: boolean) => void
      onChanceMoneyEffect?: (effect: {
        playerId: string
        chanceType: 'GAIN_MONEY' | 'LOSE_MONEY'
        amount: number
      }) => void
    }
  >(function MockBoard({ onBlockingModalChange, onChanceMoneyEffect }, ref) {
    useEffect(() => {
      onBlockingModalChange?.(false)
    }, [onBlockingModalChange])

    return (
      <div ref={ref}>
        <button
          data-testid="trigger-chance-gain"
          type="button"
          onClick={() =>
            onChanceMoneyEffect?.({
              playerId: 'user-1',
              chanceType: 'GAIN_MONEY',
              amount: 200,
            })
          }
        >
          chance
        </button>
        <button
          data-testid="board-block"
          type="button"
          onClick={() => onBlockingModalChange?.(true)}
        >
          block
        </button>
        <button
          data-testid="board-unblock"
          type="button"
          onClick={() => onBlockingModalChange?.(false)}
        >
          unblock
        </button>
      </div>
    )
  }),
}))

const createPlayer = (overrides: Partial<Player> = {}): Player => ({
  id: 'user-1',
  nickname: 'player-1',
  color: '#ff0000',
  position: 0,
  balance: 1_000,
  totalAssets: 1_000,
  owned_tiles: [],
  is_in_jail: false,
  jail_turn_count: 0,
  is_bankrupt: false,
  state: 'normal',
  ...overrides,
})

const runStoreUpdate = (callback: () => void) => {
  act(() => {
    callback()
  })
}

const renderGamePage = () =>
  renderWithProviders(
    <Routes>
      <Route path="/game/:gameId" element={<GamePage />} />
    </Routes>,
    {
      initialEntries: [
        {
          pathname: '/game/game-1',
          state: {
            gameId: 'game-1',
            roomId: 'room-1',
          },
        },
      ],
    }
  )

describe('GamePage chance deferred financial display', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useGameStateMock.mockReturnValue({ isInitialSyncPending: false })
    runStoreUpdate(() => {
      useAuthStore.setState({
        session: createAuthSessionFixture({
          userId: 'user-1',
          nickname: 'player-1',
        }),
      })
      useGameStore.getState().resetGame()
      useGameStore.getState().setGameState({
        roomId: 'room-1',
        gameId: 'game-1',
        currentTurn: 'user-1',
        players: [
          createPlayer({
            id: 'user-1',
            balance: 1_200,
            totalAssets: 1_200,
          }),
          createPlayer({
            id: 'user-2',
            nickname: 'player-2',
            color: '#0000ff',
            balance: 1_000,
            totalAssets: 1_000,
          }),
        ],
        tiles: [],
        messages: [],
        phase: 'prompt',
      })
    })
  })

  afterEach(() => {
    cleanup()
    runStoreUpdate(() => {
      useAuthStore.setState({ session: null })
      useGameStore.getState().resetGame()
    })
  })

  it('keeps deferred chance amount until board blocking modal opens and closes once', async () => {
    const user = userEvent.setup()

    renderGamePage()

    expect(screen.getByTestId('panel-user-1')).toHaveTextContent(
      'money:1200|assets:1200'
    )

    await user.click(screen.getByTestId('trigger-chance-gain'))

    expect(screen.getByTestId('panel-user-1')).toHaveTextContent(
      'money:1000|assets:1000'
    )

    await user.click(screen.getByTestId('board-block'))

    await user.click(screen.getByTestId('board-unblock'))

    await waitFor(() => {
      expect(screen.getByTestId('panel-user-1')).toHaveTextContent(
        'money:1200|assets:1200'
      )
    })
  })

  it('keeps panel financials pre-effect while CHANCE_RESOLVED is queued', async () => {
    const queuedChanceEvent: ServerEvent = {
      type: 'CHANCE_RESOLVED',
      playerId: 'user-1',
      payload: {
        chance: {
          type: 'GAIN_MONEY',
          amount: 200_000_000,
        },
      },
    }

    runStoreUpdate(() => {
      useGameStore.getState().setGameState({
        players: [
          createPlayer({
            id: 'user-1',
            balance: 1_200_000_000,
            totalAssets: 1_200_000_000,
          }),
        ],
      })
      useGameStore.getState().enqueueEvents([queuedChanceEvent])
    })

    renderGamePage()

    expect(screen.getByTestId('panel-user-1')).toHaveTextContent(
      'money:1000000000|assets:1000000000'
    )

    runStoreUpdate(() => {
      useGameStore.getState().consumeNextEvent()
    })

    await waitFor(() => {
      expect(screen.getByTestId('panel-user-1')).toHaveTextContent(
        'money:1200000000|assets:1200000000'
      )
    })
  })
})
