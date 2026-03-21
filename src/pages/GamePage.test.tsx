import { forwardRef } from 'react'
import { Route, Routes } from 'react-router-dom'
import { act, screen, waitFor } from '@testing-library/react'
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
  IS_SOCKET_MOCK_ENABLED: false,
  SHOULD_ENABLE_MSW: true,
}))

const {
  sendWaitingRoomChatMock,
  emitChatEvent,
  socketOnMock,
  socketOffMock,
  navigateMock,
  toastErrorMock,
  leaveRoomFromGameMock,
  getGameLeaveErrorMessageMock,
} = vi.hoisted(() => {
  const handlers = new Map<string, Set<(payload: unknown) => void>>()

  return {
    sendWaitingRoomChatMock: vi.fn(),
    socketOnMock: vi.fn(
      (event: string, handler: (payload: unknown) => void) => {
        const nextHandlers = handlers.get(event) ?? new Set()
        nextHandlers.add(handler)
        handlers.set(event, nextHandlers)
      }
    ),
    socketOffMock: vi.fn(
      (event: string, handler: (payload: unknown) => void) => {
        handlers.get(event)?.delete(handler)
      }
    ),
    emitChatEvent: (payload: unknown) => {
      handlers.get('chat')?.forEach((handler) => handler(payload))
    },
    navigateMock: vi.fn(),
    toastErrorMock: vi.fn(),
    leaveRoomFromGameMock: vi.fn(),
    getGameLeaveErrorMessageMock: vi.fn(),
  }
})

vi.mock('react-hot-toast', () => ({
  default: {
    error: toastErrorMock,
  },
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
    on: socketOnMock,
    off: socketOffMock,
    connected: true,
    disconnect: vi.fn(),
  },
}))

vi.mock('../pages/waiting-room/socket/socket', () => ({
  sendWaitingRoomChat: sendWaitingRoomChatMock,
}))

vi.mock('../hooks/game/useGameState', () => ({
  useGameState: vi.fn(),
}))

vi.mock('../hooks/game/useDiceRoll', () => ({
  useDiceRoll: () => vi.fn(),
}))

vi.mock('../hooks/game/useTurn', () => ({
  useTurn: () => false,
}))

vi.mock('../lib/bgm', () => ({
  playBgm: vi.fn(),
  stopBgm: vi.fn(),
}))

vi.mock('../pages/game/api', () => ({
  leaveRoomFromGame: leaveRoomFromGameMock,
  getGameLeaveErrorMessage: getGameLeaveErrorMessageMock,
}))

vi.mock('../services/socket/game.handler', () => ({
  emitPromptResponse: vi.fn(),
  emitGameAction: vi.fn(),
}))

vi.mock('../components/board/GameBoard', () => ({
  default: forwardRef<
    HTMLDivElement,
    {
      gameResult?: object | null
      isGameOver?: boolean
      onGameResultConfirm?: () => void
    }
  >(function MockBoardGame(props, ref) {
    return (
      <div ref={ref} data-testid="mock-board-game">
        게임 보드
        {Boolean(props.isGameOver || props.gameResult) && (
          <button type="button" onClick={props.onGameResultConfirm}>
            대기방으로 돌아가기
          </button>
        )}
      </div>
    )
  }),
}))

vi.mock('../components/game/controls/RollButton', () => ({
  default: () => <button type="button">주사위</button>,
}))

vi.mock('../components/game/modals/ExitGameModal', () => ({
  default: ({
    open,
    isSubmitting,
    onCancel,
    onConfirm,
  }: {
    open: boolean
    isSubmitting?: boolean
    onCancel?: () => void
    onConfirm?: () => void
  }) =>
    open ? (
      <div role="dialog" aria-label="게임 종료">
        <button type="button" onClick={onCancel} disabled={isSubmitting}>
          취소
        </button>
        <button type="button" onClick={onConfirm} disabled={isSubmitting}>
          {isSubmitting ? '종료 중...' : '종료'}
        </button>
      </div>
    ) : null,
}))

vi.mock('../components/game/modals/promptModalMapping', () => ({
  isPromptHandledByBoardModal: () => false,
}))

vi.mock('../components/game/panels/PlayerPanel', () => ({
  default: () => <div>플레이어 패널</div>,
}))

vi.mock('../features/room-chat/DevRoomChatControlPanel', () => ({
  DevRoomChatControlPanel: () => null,
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

function renderGamePage(options?: {
  initialEntries?: Array<{
    pathname: string
    state?: Record<string, unknown>
  }>
}) {
  return renderWithProviders(
    <Routes>
      <Route path="/game/:gameId" element={<GamePage />} />
    </Routes>,
    {
      initialEntries: options?.initialEntries ?? [
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

describe('GamePage chat flow', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    useAuthStore.setState({
      session: createAuthSessionFixture({
        userId: 'user-1',
        nickname: '유저1',
      }),
    })

    useGameStore.getState().resetGame()
    useGameStore.getState().setGameState({
      roomId: 'room-1',
      gameId: 'game-1',
      currentTurn: 'user-2',
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
    })
  })

  afterEach(() => {
    useGameStore.getState().resetGame()
    useAuthStore.setState({ session: null })
  })

  it('renders a local chat message immediately and avoids duplicates when the server echo arrives', async () => {
    const user = userEvent.setup()

    renderGamePage()

    await act(async () => {
      await user.type(
        screen.getByPlaceholderText('메시지...'),
        'ㅎㅇㅎㅇ{enter}'
      )
    })

    expect(sendWaitingRoomChatMock).toHaveBeenCalledWith({
      roomId: 'room-1',
      senderId: 'user-1',
      senderNickname: '유저1',
      message: 'ㅎㅇㅎㅇ',
    })

    expect(await screen.findByText('ㅎㅇㅎㅇ')).toBeInTheDocument()

    act(() => {
      emitChatEvent({
        room_id: 'room-1',
        sender_id: 'user-1',
        sender_nickname: '유저1',
        message: 'ㅎㅇㅎㅇ',
        sent_at: '2026-03-19T01:45:00.314Z',
      })
    })

    expect(screen.getAllByText('ㅎㅇㅎㅇ')).toHaveLength(1)
  })

  it('게임 나가기 성공 시 leave API 호출 후 로비로 이동하고 game store를 초기화한다', async () => {
    const user = userEvent.setup()

    leaveRoomFromGameMock.mockResolvedValue({
      success: true,
      newHostId: null,
    })

    renderGamePage()

    await user.click(screen.getByRole('button', { name: '나가기' }))
    await user.click(screen.getByRole('button', { name: '종료' }))

    await waitFor(() => {
      expect(leaveRoomFromGameMock).toHaveBeenCalledWith({
        roomId: 'room-1',
        userId: 'user-1',
      })
    })

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/lobby', { replace: true })
    })

    expect(useGameStore.getState().players).toHaveLength(0)
    expect(
      screen.queryByRole('dialog', { name: '게임 종료' })
    ).not.toBeInTheDocument()
  })

  it('게임 나가기 실패 시 토스트를 띄우고 현재 화면을 유지한다', async () => {
    const user = userEvent.setup()

    leaveRoomFromGameMock.mockRejectedValue(new Error('leave failed'))
    getGameLeaveErrorMessageMock.mockReturnValue('게임 나가기에 실패했습니다.')

    renderGamePage()

    await user.click(screen.getByRole('button', { name: '나가기' }))
    await user.click(screen.getByRole('button', { name: '종료' }))

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith('게임 나가기에 실패했습니다.')
    })

    expect(navigateMock).not.toHaveBeenCalled()
    expect(useGameStore.getState().players).toHaveLength(2)
    expect(
      screen.getByRole('dialog', { name: '게임 종료' })
    ).toBeInTheDocument()
  })

  it('players가 비어 있어도 finished gameResult가 있으면 로딩 화면 대신 게임 화면을 렌더한다', () => {
    useGameStore.getState().resetGame()
    useGameStore.getState().setGameState({
      roomId: 'room-1',
      gameId: 'game-1',
      phase: 'finished',
      isGameOver: true,
      players: [],
      tiles: [],
      gameResult: {
        reason: 'max_rounds',
        winner: {
          playerId: 'user-1',
          nickname: '유저1',
          balance: 300000,
          assets: 455000,
        },
      },
    })

    renderGamePage()

    expect(screen.queryByText('게임 로딩 중...')).not.toBeInTheDocument()
    expect(screen.getByTestId('mock-board-game')).toBeInTheDocument()
  })

  it('players가 비어 있어도 isGameOver면 로딩 화면 대신 게임 화면을 렌더한다', () => {
    useGameStore.getState().resetGame()
    useGameStore.getState().setGameState({
      roomId: 'room-1',
      gameId: 'game-1',
      phase: 'rolling',
      isGameOver: true,
      players: [],
      tiles: [],
      gameResult: null,
    })

    renderGamePage()

    expect(screen.queryByText('게임 로딩 중...')).not.toBeInTheDocument()
    expect(screen.getByTestId('mock-board-game')).toBeInTheDocument()
  })

  it('종료 상태가 아니고 players가 비어 있으면 기존처럼 로딩 화면을 렌더한다', () => {
    useGameStore.getState().resetGame()
    useGameStore.getState().setGameState({
      roomId: 'room-1',
      gameId: 'game-1',
      phase: 'rolling',
      isGameOver: false,
      players: [],
      tiles: [],
      gameResult: null,
    })

    renderGamePage()

    expect(screen.getByText('게임 로딩 중...')).toBeInTheDocument()
    expect(screen.queryByTestId('mock-board-game')).not.toBeInTheDocument()
  })

  it('fatal game error와 roomId가 있으면 해당 대기방으로 fallback 이동한다', async () => {
    useGameStore.getState().resetGame()
    useGameStore.getState().setGameState({
      roomId: 'room-1',
      gameId: 'game-1',
      phase: 'rolling',
      isGameOver: false,
      players: [],
      tiles: [],
      gameResult: null,
      lastError: {
        code: 'GAME_NOT_FOUND',
        message: '게임을 찾을 수 없습니다.',
      },
    })

    renderGamePage()

    expect(screen.queryByText('게임 로딩 중...')).not.toBeInTheDocument()
    expect(
      screen.getByText('참가 정보를 다시 확인하고 있습니다...')
    ).toBeInTheDocument()

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/rooms/room-1', {
        replace: true,
        state: {
          roomId: 'room-1',
        },
      })
    })

    expect(useGameStore.getState().players).toHaveLength(0)
  })

  it('fatal game error와 roomId가 없으면 로비로 fallback 이동한다', async () => {
    useGameStore.getState().resetGame()
    useGameStore.getState().setGameState({
      roomId: null,
      gameId: 'game-1',
      phase: 'rolling',
      isGameOver: false,
      players: [],
      tiles: [],
      gameResult: null,
      lastError: {
        code: 'INVALID_GAME_ID',
        message: 'gameId가 필요합니다.',
      },
    })

    renderGamePage({
      initialEntries: [
        {
          pathname: '/game/game-1',
          state: {
            gameId: 'game-1',
          },
        },
      ],
    })

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/lobby', { replace: true })
    })

    expect(useGameStore.getState().players).toHaveLength(0)
  })

  it('게임 종료 결과 확인 시 같은 대기방으로 이동하고 game store를 초기화한다', async () => {
    const user = userEvent.setup()

    useGameStore.getState().setGameState({
      roomId: 'room-1',
      gameId: 'game-1',
      phase: 'finished',
      isGameOver: true,
      gameResult: {
        reason: 'max_rounds',
        winner: {
          playerId: 'user-1',
          nickname: '유저1',
          balance: 300000,
          assets: 455000,
        },
      },
    })

    renderGamePage()

    await user.click(
      screen.getByRole('button', { name: '대기방으로 돌아가기' })
    )

    expect(navigateMock).toHaveBeenCalledWith('/rooms/room-1', {
      replace: true,
      state: {
        roomId: 'room-1',
      },
    })
    expect(useGameStore.getState().players).toHaveLength(0)
  })

  it('게임 종료 결과 확인 시 roomId가 없으면 로비로 이동한다', async () => {
    const user = userEvent.setup()

    useGameStore.getState().resetGame()
    useGameStore.getState().setGameState({
      roomId: null,
      gameId: 'game-1',
      phase: 'finished',
      isGameOver: true,
      players: [],
      tiles: [],
      gameResult: {
        reason: 'disconnect_timeout',
        winner: {
          playerId: 'user-2',
          nickname: '유저2',
          balance: 530000,
          assets: 530000,
        },
      },
    })

    renderGamePage({
      initialEntries: [
        {
          pathname: '/game/game-1',
          state: {
            gameId: 'game-1',
          },
        },
      ],
    })

    await user.click(
      screen.getByRole('button', { name: '대기방으로 돌아가기' })
    )

    expect(navigateMock).toHaveBeenCalledWith('/lobby', { replace: true })
    expect(useGameStore.getState().players).toHaveLength(0)
  })

  it('종료 상태에서는 fatal game error가 있어도 버튼 클릭 전 자동 fallback 이동하지 않는다', async () => {
    const user = userEvent.setup()

    useGameStore.getState().resetGame()
    useGameStore.getState().setGameState({
      roomId: 'room-1',
      gameId: 'game-1',
      phase: 'finished',
      isGameOver: true,
      players: [],
      tiles: [],
      gameResult: {
        reason: 'max_rounds',
        winner: {
          playerId: 'user-1',
          nickname: '유저1',
          balance: 300000,
          assets: 455000,
        },
      },
      lastError: {
        code: 'GAME_NOT_FOUND',
        message: '게임을 찾을 수 없습니다.',
      },
    })

    renderGamePage()

    expect(
      screen.queryByText('참가 정보를 다시 확인하고 있습니다...')
    ).not.toBeInTheDocument()
    expect(navigateMock).not.toHaveBeenCalled()

    await user.click(
      screen.getByRole('button', { name: '대기방으로 돌아가기' })
    )

    expect(navigateMock).toHaveBeenCalledWith('/rooms/room-1', {
      replace: true,
      state: {
        roomId: 'room-1',
      },
    })
  })
})
