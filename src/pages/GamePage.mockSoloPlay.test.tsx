import { forwardRef, useEffect, useImperativeHandle } from 'react'
import { Route, Routes } from 'react-router-dom'
import { act, cleanup, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import GamePage from './GamePage'
import { useGameStore } from '../stores/game.store'
import { useAuthStore } from '../features/auth/session/store'
import { createAuthSessionFixture } from '../test/fixtures'
import { renderWithProviders } from '../test/renderWithProviders'
import type { Player } from '../types/domain'

vi.mock('../config/env', () => ({
  IS_DEMO_MOCK_ENABLED: false,
  IS_SOCKET_MOCK_ENABLED: true,
  SHOW_GAME_DEBUG_OVERLAY: false,
  SHOULD_ENABLE_MSW: true,
}))

const {
  diceRollMock,
  emitPromptResponseMock,
  emitGameActionMock,
  useGameStateMock,
  navigateMock,
  boardRollDiceMock,
} = vi.hoisted(() => ({
  diceRollMock: vi.fn(),
  emitPromptResponseMock: vi.fn(),
  emitGameActionMock: vi.fn(),
  useGameStateMock: vi.fn(),
  navigateMock: vi.fn(),
  boardRollDiceMock: vi.fn(),
}))

vi.mock('react-router-dom', async () => {
  const actual =
    await vi.importActual<typeof import('react-router-dom')>('react-router-dom')

  return {
    ...actual,
    useNavigate: () => navigateMock,
  }
})

vi.mock('../lib/socket', () => ({
  socket: {
    on: vi.fn(),
    off: vi.fn(),
    connected: true,
  },
}))

vi.mock('../pages/waiting-room/socket/socket', () => ({
  sendWaitingRoomChat: vi.fn(),
}))

vi.mock('../features/presence/online-users/onlineUsersSocket', () => ({
  requestOnlineUsersSnapshotSync: vi.fn(),
}))

vi.mock('../hooks/game/useGameState', () => ({
  useGameState: useGameStateMock,
}))

vi.mock('../hooks/game/useDiceRoll', () => ({
  useDiceRoll: () => diceRollMock,
}))

vi.mock('../hooks/game/useTurn', () => ({
  useTurn: () => false,
}))

vi.mock('../lib/bgm', () => ({
  playBgm: vi.fn(),
  stopBgm: vi.fn(),
}))

vi.mock('../pages/game/api', () => ({
  leaveRoomFromGame: vi.fn(),
  getGameLeaveErrorMessage: vi.fn(),
}))

vi.mock('../services/socket/game.handler', () => ({
  emitPromptResponse: emitPromptResponseMock,
  emitGameAction: emitGameActionMock,
}))

vi.mock('../components/board/GameBoard', () => ({
  default: forwardRef<
    { rollDice: () => void },
    {
      localPlayerId?: string | number | null
      allowAssetActions?: boolean
      onBlockingModalChange?: (blocked: boolean) => void
    }
  >(function MockBoardGame(props, ref) {
    useImperativeHandle(ref, () => ({
      rollDice: boardRollDiceMock,
    }))

    useEffect(() => {
      props.onBlockingModalChange?.(false)
    }, [props])

    return (
      <div data-testid="mock-board-game">
        <span>{`local-player:${String(props.localPlayerId ?? '')}`}</span>
        <span>{`asset-actions:${String(Boolean(props.allowAssetActions))}`}</span>
      </div>
    )
  }),
}))

vi.mock('../components/game/controls/RollButton', () => ({
  default: ({
    isMyTurn,
    mode = 'roll',
    onRoll,
    onEndTurn,
  }: {
    isMyTurn: boolean
    mode?: 'roll' | 'end_turn'
    onRoll?: () => void
    onEndTurn?: () => void
  }) => {
    const isEndTurnMode = mode === 'end_turn'

    return (
      <button
        type="button"
        disabled={!isMyTurn}
        onClick={isEndTurnMode ? onEndTurn : onRoll}
      >
        {isEndTurnMode ? '턴 종료' : '주사위'}
      </button>
    )
  },
}))

vi.mock('../components/game/modals/ExitGameModal', () => ({
  default: () => null,
}))

vi.mock('../components/game/modals/promptModalMapping', () => ({
  isPromptHandledByBoardModal: () => false,
}))

vi.mock('../components/game/panels/PlayerPanel', () => ({
  default: () => null,
}))

vi.mock('../components/game/GlobalEffectModal', () => ({
  default: () => null,
}))

vi.mock('../features/room-chat/RoomChat', () => ({
  default: () => null,
}))

vi.mock('../features/room-chat/DevRoomChatControlPanel', () => ({
  DevRoomChatControlPanel: () => (
    <div>
      <span>게임방 채팅 테스트 패널</span>
    </div>
  ),
}))

const createPlayer = (overrides: Partial<Player> = {}): Player => ({
  id: 'user-1',
  nickname: '유저1',
  color: '#ff0000',
  position: 0,
  balance: 1000,
  owned_tiles: [],
  is_in_jail: false,
  jail_turn_count: 0,
  is_bankrupt: false,
  ...overrides,
})

type GameStoreState = ReturnType<typeof useGameStore.getState>
type GameStatePatch = Parameters<GameStoreState['setGameState']>[0]

const runStoreUpdate = (callback: () => void) => {
  act(() => {
    callback()
  })
}

const setTestAuthSession = (
  session: ReturnType<typeof createAuthSessionFixture> | null
) => {
  runStoreUpdate(() => {
    useAuthStore.setState({ session })
  })
}

const resetTestGameStore = () => {
  runStoreUpdate(() => {
    useGameStore.getState().resetGame()
  })
}

const resetAndSetTestGameState = (state: GameStatePatch) => {
  resetTestGameStore()
  runStoreUpdate(() => {
    useGameStore.getState().setGameState(state)
  })
}

function renderGamePage() {
  return renderWithProviders(
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
}

describe('GamePage mock solo play', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useGameStateMock.mockReturnValue({ isInitialSyncPending: false })
    class MockAudio {
      play() {
        return Promise.resolve()
      }
    }

    vi.stubGlobal('Audio', MockAudio)

    setTestAuthSession(
      createAuthSessionFixture({
        userId: 'user-1',
        nickname: '유저1',
      })
    )

    resetAndSetTestGameState({
      roomId: 'room-1',
      gameId: 'game-1',
      currentTurn: 'user-2',
      phase: 'rolling',
      players: [
        createPlayer(),
        createPlayer({
          id: 'user-2',
          nickname: '유저2',
          color: '#0000ff',
        }),
      ],
      tiles: [],
      messages: [],
      prompt: null,
      pendingAction: null,
    })
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    resetTestGameStore()
    setTestAuthSession(null)
  })

  it('상대 턴에서는 혼자 플레이를 켜기 전까지 주사위 버튼이 비활성이고 보드는 현재 사용자 기준을 유지한다', () => {
    renderGamePage()

    expect(screen.getByRole('button', { name: '주사위' })).toBeDisabled()
    expect(screen.getByTestId('mock-board-game')).toHaveTextContent(
      'local-player:user-1'
    )
    expect(screen.getByText('게임방 채팅 테스트 패널')).toBeInTheDocument()
    expect(screen.getByRole('switch', { name: '혼자 플레이' })).toHaveAttribute(
      'aria-checked',
      'false'
    )
  })

  it('혼자 플레이를 켜면 상대 턴에서도 주사위를 굴릴 수 있고 보드 제어 기준이 활성 플레이어로 바뀐다', async () => {
    const user = userEvent.setup()

    renderGamePage()

    await user.click(screen.getByRole('switch', { name: '혼자 플레이' }))

    const rollButton = screen.getByRole('button', { name: '주사위' })

    expect(rollButton).toBeEnabled()
    expect(screen.getByTestId('mock-board-game')).toHaveTextContent(
      'local-player:user-2'
    )
    expect(screen.getByTestId('mock-board-game')).toHaveTextContent(
      'asset-actions:true'
    )

    await user.click(rollButton)

    expect(boardRollDiceMock).toHaveBeenCalled()
    expect(diceRollMock).toHaveBeenCalledWith('game-1')
  })

  it('상대 턴 prompt는 혼자 플레이 OFF에서는 숨기고 ON에서는 보여 응답할 수 있다', async () => {
    const user = userEvent.setup()

    resetAndSetTestGameState({
      roomId: 'room-1',
      gameId: 'game-1',
      currentTurn: 'user-2',
      phase: 'prompt',
      players: [
        createPlayer(),
        createPlayer({
          id: 'user-2',
          nickname: '유저2',
          color: '#0000ff',
        }),
      ],
      tiles: [],
      messages: [],
      prompt: {
        id: 'prompt-1',
        type: 'CONFIRM_ONLY',
        playerId: 'user-2',
        title: '상대 턴 확인',
        message: '상대 턴 prompt',
        timeoutSec: 30,
        choices: [{ id: 'confirm', label: '확인', value: 'CONFIRM' }],
      },
    })

    renderGamePage()

    expect(
      screen.queryByRole('button', { name: '확인' })
    ).not.toBeInTheDocument()

    await user.click(screen.getByRole('switch', { name: '혼자 플레이' }))
    await user.click(screen.getByRole('button', { name: '확인' }))

    expect(emitPromptResponseMock).toHaveBeenCalledWith({
      gameId: 'game-1',
      promptId: 'prompt-1',
      choice: 'CONFIRM',
      payload: undefined,
    })
  })

  it('holds game board render while mock initial sync is pending', () => {
    useGameStateMock.mockReturnValue({ isInitialSyncPending: true })
    resetAndSetTestGameState({
      roomId: 'room-1',
      gameId: 'game-1',
      currentTurn: 'user-1',
      phase: 'rolling',
      players: [],
      tiles: [],
      messages: [],
      prompt: null,
      pendingAction: null,
    })

    renderGamePage()

    expect(screen.queryByTestId('mock-board-game')).not.toBeInTheDocument()
  })
})
