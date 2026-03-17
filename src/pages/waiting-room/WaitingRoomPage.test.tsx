import { act, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { MemoryRouterProps } from 'react-router-dom'
import { Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuthStore } from '../../features/auth/store'
import { createAuthSessionFixture } from '../../test/fixtures'
import { renderWithProviders } from '../../test/renderWithProviders'
import WaitingRoomPage from './WaitingRoomPage'
import type {
  GameStartEventPayload,
  WaitingRoomChatMessage,
  WaitingRoomSeat,
  WaitingRoomSnapshot,
} from './types'

type WaitingRoomControllerResult = {
  room: WaitingRoomSnapshot | null
  seats: Array<WaitingRoomSeat | null>
  chatMessages: WaitingRoomChatMessage[]
  isRoomLoading: boolean
  roomErrorMessage: string | null
  isReadyPending: boolean
  isStartPending: boolean
  isLeavePending: boolean
  isHost: boolean
  isReady: boolean
  canToggleReady: boolean
  canStartGame: boolean
  sendChatMessage: (content: string) => void
  handleToggleReady: () => Promise<{ ok: boolean; message?: string }>
  handleStartGame: () => Promise<{ ok: boolean; message?: string }>
  leaveRoom: () => Promise<{ ok: boolean; message?: string }>
  applyRoomSnapshot: (snapshot: WaitingRoomSnapshot) => void
}

const {
  useWaitingRoomControllerMock,
  useOnlineUsersSocketMock,
  useDirectMessageControllerMock,
  navigateMock,
  navigationTypeMock,
  toastErrorMock,
  waitingRoomControllerStateRef,
  gameStartHandlerRef,
} = vi.hoisted(() => ({
  useWaitingRoomControllerMock: vi.fn(),
  useOnlineUsersSocketMock: vi.fn(),
  useDirectMessageControllerMock: vi.fn(),
  navigateMock: vi.fn(),
  navigationTypeMock: vi.fn(),
  toastErrorMock: vi.fn(),
  waitingRoomControllerStateRef: {
    current: null as WaitingRoomControllerResult | null,
  },
  gameStartHandlerRef: {
    current: null as ((payload: GameStartEventPayload) => void) | null,
  },
}))

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
    useNavigationType: () => navigationTypeMock(),
  }
})

vi.mock('./hooks', () => ({
  useWaitingRoomController: useWaitingRoomControllerMock,
}))

vi.mock('../../features/presence/online-users/useOnlineUsersSocket', () => ({
  useOnlineUsersSocket: useOnlineUsersSocketMock,
}))

vi.mock(
  '../../features/presence/direct-message/useDirectMessageController',
  () => ({
    useDirectMessageController: useDirectMessageControllerMock,
  })
)

// 테스트용 대기방 상태 생성
function createWaitingRoomControllerState(
  overrides: Partial<WaitingRoomControllerResult> = {}
): WaitingRoomControllerResult {
  const baseRoom: WaitingRoomSnapshot = {
    roomId: 'room-5',
    title: '즐거운 게임 한판!',
    status: 'waiting',
    maxPlayers: 4,
    isPrivate: false,
    players: [
      { id: 'user-1', nickname: '테스터', isReady: false, isHost: true },
      { id: 'user-2', nickname: '상대방', isReady: true, isHost: false },
    ],
    chatMessages: [],
  }

  return {
    room: baseRoom,
    seats: [
      {
        id: 'user-1',
        nickname: '테스터',
        isReady: false,
        isHost: true,
        isMe: true,
        avatarColor: '#ef4444',
      },
      {
        id: 'user-2',
        nickname: '상대방',
        isReady: true,
        isHost: false,
        isMe: false,
        avatarColor: '#3b82f6',
      },
      null,
      null,
    ],
    chatMessages: [],
    isRoomLoading: false,
    roomErrorMessage: null,
    isReadyPending: false,
    isStartPending: false,
    isLeavePending: false,
    isHost: true,
    isReady: false,
    canToggleReady: false,
    canStartGame: false,
    sendChatMessage: vi.fn(),
    handleToggleReady: vi.fn(async () => ({ ok: true })),
    handleStartGame: vi.fn(async () => ({ ok: true })),
    leaveRoom: vi.fn(async () => ({ ok: true })),
    applyRoomSnapshot: vi.fn(),
    ...overrides,
  }
}

// 라우트 파라미터가 포함된 대기방 페이지 렌더링 헬퍼
function renderWaitingRoomPage({
  routePath = '/rooms/:roomId',
  initialEntries = ['/rooms/room-5'],
}: {
  routePath?: string
  initialEntries?: MemoryRouterProps['initialEntries']
} = {}) {
  return renderWithProviders(
    <Routes>
      <Route path={routePath} element={<WaitingRoomPage />} />
    </Routes>,
    {
      initialEntries,
    }
  )
}

describe('WaitingRoomPage interaction', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    useAuthStore.setState({
      session: createAuthSessionFixture({
        userId: 'user-1',
        nickname: '테스터',
      }),
    })

    waitingRoomControllerStateRef.current = createWaitingRoomControllerState()
    gameStartHandlerRef.current = null
    navigationTypeMock.mockReturnValue('POP')

    useWaitingRoomControllerMock.mockImplementation((params) => {
      gameStartHandlerRef.current = params.onGameStart
      return waitingRoomControllerStateRef.current
    })

    useOnlineUsersSocketMock.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    })

    useDirectMessageControllerMock.mockReturnValue({
      dmTargetUser: null,
      directMessagesByUserId: {},
      unreadDirectMessageCountByUserId: {},
      openDirectMessage: vi.fn(),
      closeDirectMessage: vi.fn(),
      sendDirectMessage: vi.fn(),
    })
  })

  it('host이지만 시작 조건 미충족이면 시작 버튼이 비활성화된다', () => {
    waitingRoomControllerStateRef.current = createWaitingRoomControllerState({
      isHost: true,
      canStartGame: false,
    })

    renderWaitingRoomPage()

    expect(screen.getByRole('button', { name: '시작' })).toBeDisabled()
  })

  it('2명 이상 + non-host 전원 준비 완료 상태면 host 시작 버튼이 활성화된다', () => {
    waitingRoomControllerStateRef.current = createWaitingRoomControllerState({
      isHost: true,
      canStartGame: true,
    })

    renderWaitingRoomPage()

    expect(screen.getByRole('button', { name: '시작' })).toBeEnabled()
  })

  it('non-host 사용자는 시작 버튼 대신 준비 버튼만 노출된다', () => {
    waitingRoomControllerStateRef.current = createWaitingRoomControllerState({
      isHost: false,
      canToggleReady: true,
      isReady: false,
    })

    renderWaitingRoomPage()

    expect(
      screen.queryByRole('button', { name: '시작' })
    ).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '준비하기' })).toBeEnabled()
  })

  it('game_start 이벤트 수신 시 /game/:gameId로 이동하며 state(gameId, roomId)를 전달한다', () => {
    renderWaitingRoomPage()

    act(() => {
      gameStartHandlerRef.current?.({
        game_id: 'game-123',
        room_id: 'room-5',
      })
    })

    expect(navigateMock).toHaveBeenCalledWith('/game/game-123', {
      state: {
        gameId: 'game-123',
        roomId: 'room-5',
      },
    })
  })

  it('roomId가 없으면 로비로 리다이렉트한다', async () => {
    renderWaitingRoomPage({
      routePath: '/rooms',
      initialEntries: ['/rooms'],
    })

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/lobby', { replace: true })
    })
  })

  it('세션이 없으면 홈으로 리다이렉트한다', async () => {
    useAuthStore.setState({ session: null })

    renderWaitingRoomPage()

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/', { replace: true })
    })
  })

  it('닉네임 미설정 세션이면 닉네임 설정 페이지로 리다이렉트한다', async () => {
    useAuthStore.setState({
      session: createAuthSessionFixture({
        userId: 'user-1',
        nickname: '테스터',
        needsNicknameSetup: true,
      }),
    })

    renderWaitingRoomPage()

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/nickname-setup', {
        replace: true,
      })
    })
  })

  it('대기방 오류 메시지가 있으면 토스트를 표시한다', async () => {
    waitingRoomControllerStateRef.current = createWaitingRoomControllerState({
      roomErrorMessage: '대기방 정보를 불러오지 못했습니다.',
    })

    renderWaitingRoomPage()

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith(
        '대기방 정보를 불러오지 못했습니다.'
      )
    })
  })

  it('헤더 뒤로가기 클릭 시 퇴장 성공이면 로비로 이동한다', async () => {
    const user = userEvent.setup()
    const leaveRoomMock = vi.fn(async () => ({ ok: true }))
    waitingRoomControllerStateRef.current = createWaitingRoomControllerState({
      leaveRoom: leaveRoomMock,
    })

    renderWaitingRoomPage()
    await user.click(screen.getByRole('button', { name: '로비로 이동' }))

    await waitFor(() => {
      expect(leaveRoomMock).toHaveBeenCalledTimes(1)
      expect(navigateMock).toHaveBeenCalledWith('/lobby', { replace: true })
    })
  })

  it('헤더 뒤로가기 클릭 시 퇴장 실패면 토스트를 표시한다', async () => {
    const user = userEvent.setup()
    const leaveRoomMock = vi.fn(async () => ({
      ok: false,
      message: '퇴장 실패',
    }))
    waitingRoomControllerStateRef.current = createWaitingRoomControllerState({
      leaveRoom: leaveRoomMock,
    })

    renderWaitingRoomPage()
    await user.click(screen.getByRole('button', { name: '로비로 이동' }))

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith('퇴장 실패')
    })
  })

  it('non-host 준비 토글 실패 시 토스트를 표시한다', async () => {
    const user = userEvent.setup()
    const handleToggleReadyMock = vi.fn(async () => ({
      ok: false,
      message: '준비 실패',
    }))
    waitingRoomControllerStateRef.current = createWaitingRoomControllerState({
      isHost: false,
      canToggleReady: true,
      isReady: false,
      handleToggleReady: handleToggleReadyMock,
    })

    renderWaitingRoomPage()
    await user.click(screen.getByRole('button', { name: '준비하기' }))

    await waitFor(() => {
      expect(handleToggleReadyMock).toHaveBeenCalledTimes(1)
      expect(toastErrorMock).toHaveBeenCalledWith('준비 실패')
    })
  })

  it('host 시작 실패 시 토스트를 표시한다', async () => {
    const user = userEvent.setup()
    const handleStartGameMock = vi.fn(async () => ({
      ok: false,
      message: '시작 실패',
    }))
    waitingRoomControllerStateRef.current = createWaitingRoomControllerState({
      isHost: true,
      canStartGame: true,
      handleStartGame: handleStartGameMock,
    })

    renderWaitingRoomPage()
    await user.click(screen.getByRole('button', { name: '시작' }))

    await waitFor(() => {
      expect(handleStartGameMock).toHaveBeenCalledTimes(1)
      expect(toastErrorMock).toHaveBeenCalledWith('시작 실패')
    })
  })

  it('대기방 접속자 목록은 room.players 기준으로 현재 방 참가자를 in_room 상태로 보정한다', async () => {
    useOnlineUsersSocketMock.mockReturnValue({
      data: [
        {
          id: 'user-1',
          nickname: '테스터',
          status: 'lobby',
          avatarText: '테',
          avatarBackground: '#ef4444',
        },
        {
          id: 'user-2',
          nickname: '상대방',
          status: 'lobby',
          avatarText: '상',
          avatarBackground: '#3b82f6',
        },
      ],
      isLoading: false,
      isError: false,
    })

    renderWaitingRoomPage()

    await waitFor(() => {
      expect(screen.getAllByText('대기방')).toHaveLength(2)
    })
  })

  it('초기 진입(POP)에서는 location.state의 preJoinedSnapshot을 재사용하지 않는다', () => {
    renderWaitingRoomPage({
      initialEntries: [
        {
          pathname: '/rooms/room-5',
          state: {
            roomId: 'room-5',
            roomTitle: '테스트 방',
            preJoinedSnapshot: {
              roomId: 'room-5',
              title: '테스트 방',
              status: 'waiting',
              maxPlayers: 4,
              isPrivate: false,
              players: [
                {
                  id: 'user-1',
                  nickname: '테스터',
                  isReady: false,
                  isHost: true,
                },
              ],
              chatMessages: [],
            },
          },
        },
      ],
    })

    expect(useWaitingRoomControllerMock).toHaveBeenCalledWith(
      expect.objectContaining({
        preJoinedSnapshot: null,
      })
    )
  })

  it('로비에서 PUSH로 진입하면 location.state의 preJoinedSnapshot을 사용한다', () => {
    navigationTypeMock.mockReturnValue('PUSH')

    const preJoinedSnapshot: WaitingRoomSnapshot = {
      roomId: 'room-5',
      title: '테스트 방',
      status: 'waiting',
      maxPlayers: 4,
      isPrivate: false,
      players: [
        {
          id: 'user-1',
          nickname: '테스터',
          isReady: false,
          isHost: true,
        },
      ],
      chatMessages: [],
    }

    renderWaitingRoomPage({
      initialEntries: [
        {
          pathname: '/rooms/room-5',
          state: {
            roomId: 'room-5',
            roomTitle: '테스트 방',
            preJoinedSnapshot,
          },
        },
      ],
    })

    expect(useWaitingRoomControllerMock).toHaveBeenCalledWith(
      expect.objectContaining({
        preJoinedSnapshot,
      })
    )
  })
})
