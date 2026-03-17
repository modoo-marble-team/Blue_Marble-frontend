import { screen, within, waitFor } from '@testing-library/react'
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
import type { WaitingRoomSnapshot } from '../waiting-room/types'

const {
  useLobbyRoomsQueryMock,
  useOnlineUsersSocketMock,
  useDirectMessageControllerMock,
  navigateMock,
  createWaitingRoomMock,
  getWaitingRoomErrorMessageMock,
  isJoinPasswordMismatchErrorMock,
  joinWaitingRoomMock,
} = vi.hoisted(() => ({
  useLobbyRoomsQueryMock: vi.fn(),
  useOnlineUsersSocketMock: vi.fn(),
  useDirectMessageControllerMock: vi.fn(),
  navigateMock: vi.fn(),
  createWaitingRoomMock: vi.fn(),
  getWaitingRoomErrorMessageMock: vi.fn(),
  isJoinPasswordMismatchErrorMock: vi.fn(),
  joinWaitingRoomMock: vi.fn(),
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
  useLobbyRoomsQuery: useLobbyRoomsQueryMock,
}))

vi.mock('../../features/presence/useOnlineUsersSocket', () => ({
  useOnlineUsersSocket: useOnlineUsersSocketMock,
}))

vi.mock('../../features/presence/useDirectMessageController', () => ({
  useDirectMessageController: useDirectMessageControllerMock,
}))

vi.mock('../waiting-room/api', () => ({
  createWaitingRoom: createWaitingRoomMock,
  getWaitingRoomErrorMessage: getWaitingRoomErrorMessageMock,
  isJoinPasswordMismatchError: isJoinPasswordMismatchErrorMock,
  joinWaitingRoom: joinWaitingRoomMock,
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

    createWaitingRoomMock.mockResolvedValue({
      roomId: 'room-10',
      roomTitle: '테스트 방',
    })
    getWaitingRoomErrorMessageMock.mockReturnValue('에러')
    isJoinPasswordMismatchErrorMock.mockReturnValue(false)
    joinWaitingRoomMock.mockImplementation(
      async ({
        roomId,
        fallbackTitle,
      }: {
        roomId: string
        fallbackTitle?: string
      }) =>
        ({
          roomId,
          title: fallbackTitle ?? '대기방',
          status: 'waiting',
          maxPlayers: 4,
          isPrivate: roomId === 'room-2',
          players: [
            {
              id: 'user-1',
              nickname: '테스터',
              isReady: false,
              isHost: roomId === 'room-10',
            },
          ],
          chatMessages: [],
        }) satisfies WaitingRoomSnapshot
    )
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

  it('현재 사용자가 접속자 스냅샷에 없어도 로비 접속자로 보정한다', () => {
    useOnlineUsersSocketMock.mockReturnValue({
      data: [
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

    renderLobbyPage()

    expect(screen.getAllByText('테스터').length).toBeGreaterThan(0)
    expect(screen.getByText('상대방')).toBeInTheDocument()
    expect(screen.getByText('2명')).toBeInTheDocument()
    expect(screen.getByText('로비')).toBeInTheDocument()
  })

  it('비밀방 입장하기 클릭 시 비밀번호 모달이 열리고 성공하면 대기방 이동이 호출된다', async () => {
    const user = userEvent.setup()
    renderLobbyPage()

    const privateRoomCard = screen
      .getByText('초보 비밀 방')
      .closest('article') as HTMLElement

    await user.click(
      within(privateRoomCard).getByRole('button', { name: '입장하기' })
    )

    expect(
      screen.getByRole('dialog', { name: '비밀방 입장' })
    ).toBeInTheDocument()

    await user.type(screen.getByPlaceholderText('비밀번호 입력'), '1234')
    await user.click(screen.getByRole('button', { name: '입장' }))

    await waitFor(() => {
      expect(joinWaitingRoomMock).toHaveBeenCalledWith({
        roomId: 'room-2',
        userId: 'user-1',
        nickname: '테스터',
        fallbackTitle: '초보 비밀 방',
        password: '1234',
      })
    })

    expect(navigateMock).toHaveBeenCalledWith('/rooms/room-2', {
      state: {
        roomId: 'room-2',
        roomTitle: '초보 비밀 방',
        preJoinedSnapshot: expect.any(Object),
      },
    })
  })

  it('일반방 입장하기 클릭 시 join 응답 snapshot을 확보한 뒤 대기방으로 이동한다', async () => {
    const user = userEvent.setup()
    renderLobbyPage()

    const publicRoomCard = screen
      .getByText('초보 환영 방')
      .closest('article') as HTMLElement

    await user.click(
      within(publicRoomCard).getByRole('button', { name: '입장하기' })
    )

    await waitFor(() => {
      expect(joinWaitingRoomMock).toHaveBeenCalledWith({
        roomId: 'room-1',
        userId: 'user-1',
        nickname: '테스터',
        fallbackTitle: '초보 환영 방',
        password: undefined,
      })
    })

    expect(navigateMock).toHaveBeenCalledWith('/rooms/room-1', {
      state: {
        roomId: 'room-1',
        roomTitle: '초보 환영 방',
        preJoinedSnapshot: expect.objectContaining({
          roomId: 'room-1',
        }),
      },
    })
  })

  it('방 생성 후 join snapshot을 다시 받아 waiting-room으로 이동한다', async () => {
    const user = userEvent.setup()
    renderLobbyPage()

    await user.click(screen.getByRole('button', { name: '방 만들기' }))
    await user.click(screen.getByRole('button', { name: '방 만들기 완료' }))

    await waitFor(() => {
      expect(createWaitingRoomMock).toHaveBeenCalledWith({
        title: '테스터님의 방',
        isPrivate: false,
        password: undefined,
        hostUserId: 'user-1',
        hostNickname: '테스터',
      })
    })

    await waitFor(() => {
      expect(joinWaitingRoomMock).toHaveBeenCalledWith({
        roomId: 'room-10',
        userId: 'user-1',
        nickname: '테스터',
        fallbackTitle: '테스트 방',
        password: undefined,
      })
    })

    expect(navigateMock).toHaveBeenCalledWith('/rooms/room-10', {
      state: {
        roomId: 'room-10',
        roomTitle: '테스트 방',
        preJoinedSnapshot: expect.objectContaining({
          roomId: 'room-10',
        }),
      },
    })
  })

  it('비밀번호 불일치면 모달이 유지되고 에러 표시 후 입력 변경 시 에러 상태가 초기화된다', async () => {
    const user = userEvent.setup()
    renderLobbyPage()

    const privateRoomCard = screen
      .getByText('초보 비밀 방')
      .closest('article') as HTMLElement

    isJoinPasswordMismatchErrorMock.mockReturnValue(true)
    joinWaitingRoomMock.mockRejectedValue(new Error('ROOM_PASSWORD_MISMATCH'))

    await user.click(
      within(privateRoomCard).getByRole('button', { name: '입장하기' })
    )

    await user.type(screen.getByPlaceholderText('비밀번호 입력'), '1234')
    expect(screen.getByPlaceholderText('비밀번호 입력')).toHaveAttribute(
      'autocomplete',
      'new-password'
    )
    await user.click(screen.getByRole('button', { name: '입장' }))

    expect(
      await screen.findByText('비밀번호가 올바르지 않습니다.')
    ).toBeInTheDocument()
    expect(
      screen.getByRole('dialog', { name: '비밀방 입장' })
    ).toBeInTheDocument()

    const passwordInput = screen.getByPlaceholderText(
      '비밀번호 입력'
    ) as HTMLInputElement
    await user.clear(passwordInput)
    await user.type(passwordInput, '123')

    expect(
      screen.queryByText('비밀번호가 올바르지 않습니다.')
    ).not.toBeInTheDocument()
    expect(
      screen.getByText(/비밀번호 4자리를 입력해주세요/)
    ).toBeInTheDocument()
  })

  it('비밀방 입장 모달에서 취소하면 모달이 닫히고 재오픈 시 입력값이 초기화된다', async () => {
    const user = userEvent.setup()
    renderLobbyPage()

    const privateRoomCard = screen
      .getByText('초보 비밀 방')
      .closest('article') as HTMLElement

    await user.click(
      within(privateRoomCard).getByRole('button', { name: '입장하기' })
    )
    await user.type(screen.getByPlaceholderText('비밀번호 입력'), '1234')
    await user.click(screen.getByRole('button', { name: '취소' }))

    await waitFor(() => {
      expect(
        screen.queryByRole('dialog', { name: '비밀방 입장' })
      ).not.toBeInTheDocument()
    })

    await user.click(
      within(privateRoomCard).getByRole('button', { name: '입장하기' })
    )

    const reopenedPasswordInput = screen.getByPlaceholderText(
      '비밀번호 입력'
    ) as HTMLInputElement
    expect(reopenedPasswordInput.value).toBe('')
  })
})
