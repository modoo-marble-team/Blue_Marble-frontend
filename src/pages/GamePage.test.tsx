import { forwardRef } from 'react'
import { Route, Routes } from 'react-router-dom'
import { act, cleanup, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import GamePage from './GamePage'
import { useGameStore } from '../stores/game.store'
import { useAuthStore } from '../features/auth/session/store'
import { CHAT_MESSAGE_MAX_LENGTH } from '../constants/chat'
import { createAuthSessionFixture } from '../test/fixtures'
import { renderWithProviders } from '../test/renderWithProviders'
import type { Player } from '../types/domain'
import type { WaitingRoomSnapshot } from './waiting-room/api/types'

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
  requestOnlineUsersSnapshotSyncMock,
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
    requestOnlineUsersSnapshotSyncMock: vi.fn(),
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

vi.mock('../features/presence/online-users/onlineUsersSocket', () => ({
  requestOnlineUsersSnapshotSync: requestOnlineUsersSnapshotSyncMock,
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
    const gameResult = props.gameResult as
      | {
          rankings?: unknown[]
          winner?: unknown | null
        }
      | null
      | undefined
    const hasAuthoritativeGameResult = Boolean(
      gameResult?.winner ||
      (Array.isArray(gameResult?.rankings) && gameResult.rankings.length > 0)
    )

    return (
      <div ref={ref} data-testid="mock-board-game">
        게임 보드
        {hasAuthoritativeGameResult && (
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
  default: ({
    player,
    isActive,
    isRichest,
    isBankrupt,
  }: {
    player: {
      id: string
      nickname?: string
      money?: number
      totalAssets?: number
    }
    isActive: boolean
    isRichest?: boolean
    isBankrupt?: boolean
  }) => (
    <div
      data-testid="mock-player-panel"
      data-player-id={player.id}
      data-is-active={String(isActive)}
      data-is-richest={String(Boolean(isRichest))}
      data-is-bankrupt={String(Boolean(isBankrupt))}
    >
      <span>{player.nickname}</span>
      <span>{`money:${player.money ?? 0}`}</span>
      <span>{`assets:${player.totalAssets ?? 'none'}`}</span>
    </div>
  ),
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

const createWaitingRoomSnapshot = (
  overrides: Partial<WaitingRoomSnapshot> = {}
): WaitingRoomSnapshot => ({
  roomId: 'room-1',
  title: '테스트 방',
  status: 'waiting',
  maxPlayers: 4,
  isPrivate: false,
  players: [
    {
      id: 'user-1',
      nickname: '유저1',
      isReady: false,
      isHost: true,
    },
  ],
  chatMessages: [],
  ...overrides,
})

type GameStoreState = ReturnType<typeof useGameStore.getState>
type GameStatePatch = Parameters<GameStoreState['setGameState']>[0]
type TestAuthSession = ReturnType<typeof createAuthSessionFixture> | null

const runStoreUpdate = (callback: () => void) => {
  act(() => {
    callback()
  })
}

const setTestAuthSession = (session: TestAuthSession) => {
  runStoreUpdate(() => {
    useAuthStore.setState({ session })
  })
}

const resetTestGameStore = () => {
  runStoreUpdate(() => {
    useGameStore.getState().resetGame()
  })
}

const setTestGameState = (state: GameStatePatch) => {
  runStoreUpdate(() => {
    useGameStore.getState().setGameState(state)
  })
}

const resetAndSetTestGameState = (state: GameStatePatch) => {
  resetTestGameStore()
  setTestGameState(state)
}

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

const getRoundBadge = (): HTMLElement => {
  const badge = screen.getByText('Round').parentElement

  if (!badge) {
    throw new Error('Round badge was not rendered.')
  }

  return badge
}

const getPlayerPanels = (): HTMLElement[] =>
  screen.getAllByTestId('mock-player-panel')

const getPlayerPanelById = (playerId: string): HTMLElement => {
  const panel = getPlayerPanels().find(
    (candidate) => candidate.dataset.playerId === playerId
  )

  if (!panel) {
    throw new Error(`Player panel for ${playerId} was not rendered.`)
  }

  return panel
}

describe('GamePage chat flow', () => {
  beforeEach(() => {
    vi.clearAllMocks()

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
    cleanup()
    resetTestGameStore()
    setTestAuthSession(null)
  })

  it('라운드 배지는 현재 round 값을 그대로 표시한다', () => {
    setTestGameState({
      round: 7,
    })

    renderGamePage()

    expect(getRoundBadge()).toHaveTextContent('7')
    expect(getRoundBadge()).toHaveTextContent('/ 20')
  })

  it('라운드 배지는 20을 초과하면 20으로 clamp해서 표시한다', () => {
    setTestGameState({
      round: 21,
    })

    renderGamePage()

    expect(getRoundBadge()).toHaveTextContent('20')
    expect(getRoundBadge()).toHaveTextContent('/ 20')
    expect(getRoundBadge()).not.toHaveTextContent('21')
  })

  it('우측 패널은 totalAssets를 우선 표시하고 그 기준으로 정렬과 왕관을 표시한다', () => {
    setTestGameState({
      players: [
        createPlayer({
          id: 'user-1',
          nickname: '유저1',
          balance: 5000,
          totalAssets: 5000,
        }),
        createPlayer({
          id: 'user-2',
          nickname: '유저2',
          color: '#0000ff',
          balance: 1000,
          totalAssets: 9000,
        }),
      ],
    })

    renderGamePage()

    expect(getPlayerPanels().map((panel) => panel.dataset.playerId)).toEqual([
      'user-2',
      'user-1',
    ])
    expect(getPlayerPanelById('user-2')).toHaveTextContent('money:1000')
    expect(getPlayerPanelById('user-2')).toHaveTextContent('assets:9000')
    expect(getPlayerPanelById('user-2').dataset.isRichest).toBe('true')
    expect(getPlayerPanelById('user-1').dataset.isRichest).toBe('false')
  })

  it('게임 종료 시 rankings 기준으로 우측 패널 순서와 자산을 맞춘다', () => {
    setTestGameState({
      phase: 'finished',
      isGameOver: true,
      players: [
        createPlayer({
          id: 'user-1',
          nickname: '유저1',
          balance: 3000,
          totalAssets: 3000,
        }),
        createPlayer({
          id: 'user-2',
          nickname: '유저2',
          color: '#0000ff',
          balance: 7000,
          totalAssets: 7000,
        }),
      ],
      gameResult: {
        reason: 'max_rounds',
        rankings: [
          {
            rank: 1,
            player_id: 'user-1',
            nickname: '유저1',
            final_assets: 12000,
            is_winner: true,
          },
          {
            rank: 2,
            player_id: 'user-2',
            nickname: '유저2',
            final_assets: 11000,
            is_winner: false,
          },
        ],
      },
    })

    renderGamePage()

    expect(getPlayerPanels().map((panel) => panel.dataset.playerId)).toEqual([
      'user-1',
      'user-2',
    ])
    expect(getPlayerPanelById('user-1')).toHaveTextContent('assets:12000')
    expect(getPlayerPanelById('user-1').dataset.isRichest).toBe('true')
    expect(getPlayerPanelById('user-2')).toHaveTextContent('assets:11000')
  })

  it('게임 종료 시 winner만 있어도 우측 패널 승자 자산을 winner.assets로 보정한다', () => {
    setTestGameState({
      phase: 'finished',
      isGameOver: true,
      winnerId: 'user-2',
      players: [
        createPlayer({
          id: 'user-1',
          nickname: '유저1',
          balance: 5000,
          totalAssets: 8000,
        }),
        createPlayer({
          id: 'user-2',
          nickname: '유저2',
          color: '#0000ff',
          balance: 3000,
          totalAssets: 6000,
        }),
      ],
      gameResult: {
        reason: 'disconnect_timeout',
        winner: {
          playerId: 'user-2',
          nickname: '유저2',
          balance: 3000,
          assets: 13000,
        },
      },
    })

    renderGamePage()

    expect(getPlayerPanels().map((panel) => panel.dataset.playerId)).toEqual([
      'user-2',
      'user-1',
    ])
    expect(getPlayerPanelById('user-2')).toHaveTextContent('assets:13000')
    expect(getPlayerPanelById('user-2').dataset.isRichest).toBe('true')
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

  it('게임 채팅 입력과 낙관적 메시지는 300자로 제한된다', async () => {
    const user = userEvent.setup()
    const overlongMessage = 'z'.repeat(CHAT_MESSAGE_MAX_LENGTH + 18)
    const expectedMessage = overlongMessage.slice(0, CHAT_MESSAGE_MAX_LENGTH)

    renderGamePage()

    await act(async () => {
      await user.type(screen.getByPlaceholderText('메시지...'), overlongMessage)
      await user.keyboard('{Enter}')
    })

    expect(sendWaitingRoomChatMock).toHaveBeenCalledWith({
      roomId: 'room-1',
      senderId: 'user-1',
      senderNickname: '유저1',
      message: expectedMessage,
    })
    expect(await screen.findByText(expectedMessage)).toBeInTheDocument()
  })

  it('게임 채팅에서 현재 턴 플레이어 메시지에 TURN badge를 표시한다', () => {
    resetAndSetTestGameState({
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
      messages: [
        {
          id: 'chat-turn',
          sender_id: 'user-2',
          sender_nickname: '유저2',
          content: '내 차례입니다.',
          timestamp: '2026-03-25T10:00:00.000Z',
          type: 'talk',
        },
      ],
    })

    renderGamePage()

    const chatSection = screen.getByText('실시간 채팅').closest('section')

    expect(chatSection).not.toBeNull()
    expect(
      within(chatSection as HTMLElement).getByText('TURN')
    ).toBeInTheDocument()
    expect(
      within(chatSection as HTMLElement).getByText('내 차례입니다.')
    ).toBeInTheDocument()
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

    expect(requestOnlineUsersSnapshotSyncMock).toHaveBeenCalledWith({
      includeFollowUpRefresh: true,
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
    resetAndSetTestGameState({
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
    resetAndSetTestGameState({
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
    expect(
      screen.queryByRole('button', { name: '대기방으로 돌아가기' })
    ).not.toBeInTheDocument()
  })

  it('authoritative gameResult가 있으면 종료 결과 액션을 노출한다', () => {
    resetAndSetTestGameState({
      roomId: 'room-1',
      gameId: 'game-1',
      phase: 'finished',
      isGameOver: true,
      players: [],
      tiles: [],
      gameResult: {
        reason: 'max_rounds',
        rankings: [
          {
            rank: 1,
            player_id: 'user-1',
            nickname: '유저1',
            final_assets: 455000,
            is_winner: true,
          },
        ],
      },
    })

    renderGamePage()

    expect(
      screen.getByRole('button', { name: '대기방으로 돌아가기' })
    ).toBeInTheDocument()
  })

  it('종료 상태가 아니고 players가 비어 있으면 기존처럼 로딩 화면을 렌더한다', () => {
    resetAndSetTestGameState({
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
    resetAndSetTestGameState({
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
    resetAndSetTestGameState({
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
    const lastRoomSnapshot = createWaitingRoomSnapshot()

    setTestGameState({
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

    renderGamePage({
      initialEntries: [
        {
          pathname: '/game/game-1',
          state: {
            gameId: 'game-1',
            roomId: 'room-1',
            lastRoomSnapshot,
          },
        },
      ],
    })

    await user.click(
      screen.getByRole('button', { name: '대기방으로 돌아가기' })
    )

    expect(navigateMock).toHaveBeenCalledWith('/rooms/room-1', {
      replace: true,
      state: {
        roomId: 'room-1',
        resumeRoomMembership: true,
        lastRoomSnapshot,
      },
    })
    expect(useGameStore.getState().players).toHaveLength(0)
  })

  it('게임 종료 결과 확인 시 roomId가 없으면 로비로 이동한다', async () => {
    const user = userEvent.setup()

    resetAndSetTestGameState({
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
    const lastRoomSnapshot = createWaitingRoomSnapshot()

    resetAndSetTestGameState({
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

    renderGamePage({
      initialEntries: [
        {
          pathname: '/game/game-1',
          state: {
            gameId: 'game-1',
            roomId: 'room-1',
            lastRoomSnapshot,
          },
        },
      ],
    })

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
        resumeRoomMembership: true,
        lastRoomSnapshot,
      },
    })
  })

  it('라운드 정보가 뱃지에 올바르게 표시된다', async () => {
    setTestGameState({
      round: 3,
    })

    renderGamePage()

    // Round number
    expect(screen.getByText('3')).toBeInTheDocument()
    // Total rounds
    expect(screen.getByText('/ 20')).toBeInTheDocument()
    // Label
    expect(screen.getByText('Round')).toBeInTheDocument()
  })
})
