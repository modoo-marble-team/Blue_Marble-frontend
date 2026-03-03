import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuthStore } from '../../features/auth/store'
import {
  createAuthSessionFixture,
  createLobbyRoomFixture,
  createOnlineUserFixture,
} from '../../test/fixtures'
import { renderWithProviders } from '../../test/renderWithProviders'
import LobbyPage from './LobbyPage'
import type { GetLobbyRoomsParams } from './api'
import type { LobbyRoom } from './types'

const {
  useLobbyRoomsQueryMock,
  useOnlineUsersSocketMock,
  useDirectMessageControllerMock,
} = vi.hoisted(() => ({
  useLobbyRoomsQueryMock: vi.fn(),
  useOnlineUsersSocketMock: vi.fn(),
  useDirectMessageControllerMock: vi.fn(),
}))

vi.mock('./hooks', () => ({
  useLobbyRoomsQuery: useLobbyRoomsQueryMock,
}))

vi.mock('../../features/presence/useOnlineUsersSocket', () => ({
  useOnlineUsersSocket: useOnlineUsersSocketMock,
}))

vi.mock('../../features/presence/useDirectMessageController', () => ({
  useDirectMessageController: useDirectMessageControllerMock,
}))

const MOCK_ROOMS: LobbyRoom[] = [
  createLobbyRoomFixture({
    id: 'room-1',
    title: '초보 환영 방',
    status: 'waiting',
    currentPlayers: 2,
  }),
  createLobbyRoomFixture({
    id: 'room-2',
    title: '초보 비밀 방',
    status: 'waiting',
    currentPlayers: 3,
    isPrivate: true,
  }),
  createLobbyRoomFixture({
    id: 'room-3',
    title: '친구 게임 중',
    status: 'playing',
    currentPlayers: 4,
  }),
  createLobbyRoomFixture({
    id: 'room-4',
    title: '고수 대기방',
    status: 'waiting',
    currentPlayers: 1,
  }),
]

// 테스트에서 로비 필터 조합 결과를 계산
function filterMockRooms(params: GetLobbyRoomsParams) {
  const keyword = params.searchRoom.trim().toLowerCase()

  return MOCK_ROOMS.filter((room) => {
    if (params.roomFilter !== 'ALL' && room.status !== params.roomFilter) {
      return false
    }

    if (params.excludePrivateRoom && room.isPrivate) {
      return false
    }

    if (keyword.length > 0 && !room.title.toLowerCase().includes(keyword)) {
      return false
    }

    return true
  })
}

// 공통 렌더링 헬퍼
function renderLobbyPage() {
  return renderWithProviders(<LobbyPage />, {
    initialEntries: ['/lobby'],
  })
}

describe('LobbyPage filter and toggle regression', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // 각 테스트 시작 시 로그인 세션을 고정
    useAuthStore.setState({
      session: createAuthSessionFixture({
        accessToken: 'test-token',
        userId: 'user-1',
        nickname: '테스터',
      }),
    })

    useLobbyRoomsQueryMock.mockImplementation((params: GetLobbyRoomsParams) => {
      return {
        data: filterMockRooms(params),
        isLoading: false,
        isError: false,
      }
    })

    useOnlineUsersSocketMock.mockReturnValue({
      data: [
        createOnlineUserFixture({
          id: 'user-1',
          nickname: '테스터',
          status: 'lobby',
          avatarText: '테',
          avatarBackground: '#dbeafe',
        }),
        createOnlineUserFixture({
          id: 'user-2',
          nickname: '상대방',
          status: 'in_room',
          avatarText: '상',
          avatarBackground: '#fde68a',
        }),
      ],
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

  it('검색/탭/비밀방 토글 조합에 따라 조회 파라미터와 카드 목록이 함께 바뀐다', async () => {
    const user = userEvent.setup()
    renderLobbyPage()

    expect(screen.getByText('초보 환영 방')).toBeInTheDocument()
    expect(screen.getByText('초보 비밀 방')).toBeInTheDocument()
    expect(screen.getByText('친구 게임 중')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '대기중' }))
    await user.click(screen.getByRole('switch'))
    await user.type(
      screen.getByPlaceholderText('방 제목을 검색하세요...'),
      '초보'
    )

    expect(useLobbyRoomsQueryMock).toHaveBeenLastCalledWith({
      searchRoom: '초보',
      roomFilter: 'waiting',
      excludePrivateRoom: true,
    })

    expect(screen.getByText('초보 환영 방')).toBeInTheDocument()
    expect(screen.queryByText('초보 비밀 방')).not.toBeInTheDocument()
    expect(screen.queryByText('친구 게임 중')).not.toBeInTheDocument()
  })

  it('비밀방 제외 토글을 다시 끄면 비밀방 카드가 복구된다', async () => {
    const user = userEvent.setup()
    renderLobbyPage()

    await user.click(screen.getByRole('switch'))
    expect(screen.queryByText('초보 비밀 방')).not.toBeInTheDocument()

    await user.click(screen.getByRole('switch'))

    expect(useLobbyRoomsQueryMock).toHaveBeenLastCalledWith({
      searchRoom: '',
      roomFilter: 'ALL',
      excludePrivateRoom: false,
    })
    expect(screen.getByText('초보 비밀 방')).toBeInTheDocument()
  })

  it('접속자 목록 패널은 열기/닫기 토글이 동작한다', async () => {
    const user = userEvent.setup()
    renderLobbyPage()

    const closeButton = screen.getByRole('button', { name: '접속자 목록 닫기' })
    expect(closeButton).toBeInTheDocument()

    await user.click(closeButton)
    expect(
      screen.getByRole('button', { name: '접속자 목록 열기' })
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '접속자 목록 열기' }))
    expect(
      screen.getByRole('button', { name: '접속자 목록 닫기' })
    ).toBeInTheDocument()
  })
})
