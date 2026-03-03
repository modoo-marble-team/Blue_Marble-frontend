import { act, screen } from '@testing-library/react'
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
  waitingRoomControllerStateRef,
  gameStartHandlerRef,
} = vi.hoisted(() => ({
  useWaitingRoomControllerMock: vi.fn(),
  useOnlineUsersSocketMock: vi.fn(),
  useDirectMessageControllerMock: vi.fn(),
  navigateMock: vi.fn(),
  waitingRoomControllerStateRef: {
    current: null as WaitingRoomControllerResult | null,
  },
  gameStartHandlerRef: {
    current: null as ((payload: GameStartEventPayload) => void) | null,
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

vi.mock('./hooks', () => ({
  useWaitingRoomController: useWaitingRoomControllerMock,
}))

vi.mock('../../features/presence/useOnlineUsersSocket', () => ({
  useOnlineUsersSocket: useOnlineUsersSocketMock,
}))

vi.mock('../../features/presence/useDirectMessageController', () => ({
  useDirectMessageController: useDirectMessageControllerMock,
}))

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
function renderWaitingRoomPage() {
  return renderWithProviders(
    <Routes>
      <Route path="/rooms/:roomId" element={<WaitingRoomPage />} />
    </Routes>,
    {
      initialEntries: ['/rooms/room-5'],
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

  it('game_start 이벤트 수신 시 /game/:roomId로 이동하며 state(gameId, roomId)를 전달한다', () => {
    renderWaitingRoomPage()

    act(() => {
      gameStartHandlerRef.current?.({
        game_id: 'game-123',
        game_state: {
          players: [],
          tiles: [],
          current_turn: null,
          round: 1,
        },
      })
    })

    expect(navigateMock).toHaveBeenCalledWith('/game/room-5', {
      state: {
        gameId: 'game-123',
        roomId: 'room-5',
      },
    })
  })
})
