import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes, useParams } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuthStore } from '../../../features/auth/session/store'
import { createAuthSessionFixture } from '../../../test/fixtures'
import { renderWithProviders } from '../../../test/renderWithProviders'
import LobbyPage from '../../lobby/LobbyPage'
import WaitingRoomPage from './WaitingRoomPage'

// Workflow gate verification branch marker.
vi.mock('../../../config/env', () => ({
  IS_DEMO_MOCK_ENABLED: false,
  IS_SOCKET_MOCK_ENABLED: true,
  SHOULD_ENABLE_MSW: true,
}))

const {
  useLobbyRoomsQueryMock,
  useOnlineUsersSocketMock,
  useDirectMessageControllerMock,
} = vi.hoisted(() => ({
  useLobbyRoomsQueryMock: vi.fn(),
  useOnlineUsersSocketMock: vi.fn(),
  useDirectMessageControllerMock: vi.fn(),
}))

vi.mock('../../lobby/hooks', () => ({
  useLobbyRoomsQuery: useLobbyRoomsQueryMock,
}))

vi.mock('../../../features/presence/online-users/useOnlineUsersSocket', () => ({
  useOnlineUsersSocket: useOnlineUsersSocketMock,
}))

vi.mock(
  '../../../features/presence/direct-message/useDirectMessageController',
  () => ({
    useDirectMessageController: useDirectMessageControllerMock,
  })
)

// game route 도착 여부 확인용 스텁 페이지
function GamePageStub() {
  const { gameId } = useParams<{ gameId: string }>()

  return <div>게임 화면: {gameId}</div>
}

// 로비→대기방→게임 라우트 흐름 테스트용 렌더 헬퍼
function renderWaitingRoomFlow() {
  return renderWithProviders(
    <Routes>
      <Route path="/lobby" element={<LobbyPage />} />
      <Route path="/rooms/:roomId" element={<WaitingRoomPage />} />
      <Route path="/game/:gameId" element={<GamePageStub />} />
    </Routes>,
    {
      initialEntries: ['/lobby'],
    }
  )
}

describe('Waiting room start flow E2E', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.localStorage.clear()

    useAuthStore.setState({
      session: createAuthSessionFixture({
        userId: 'e2e-host',
        nickname: 'E2E호스트',
      }),
    })

    useLobbyRoomsQueryMock.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
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

  it('방 생성 후 시작조건을 맞추고 시작 버튼으로 게임 화면으로 이동한다', async () => {
    const user = userEvent.setup()
    renderWaitingRoomFlow()

    await user.click(screen.getByRole('button', { name: '방 만들기' }))
    await user.click(screen.getByRole('button', { name: '방 만들기 완료' }))

    await screen.findByText('E2E호스트님의 방')

    const startButton = await screen.findByRole('button', { name: '시작' })
    expect(startButton).toBeDisabled()

    // 채팅 전송이 실제 화면에 반영되는지 확인
    await user.type(
      screen.getByPlaceholderText('메시지 입력...'),
      '테스트 대화{enter}'
    )
    expect(await screen.findByText('테스트 대화')).toBeInTheDocument()

    // DEV 패널을 열고 시작조건(2명+non-host ready) 구성
    await user.click(screen.getByRole('button', { name: 'DEV CONTROL 열기' }))
    await user.click(screen.getByRole('button', { name: '시작조건' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '시작' })).toBeEnabled()
    })

    await user.click(screen.getByRole('button', { name: '시작' }))

    await waitFor(() => {
      expect(screen.getByText(/게임 화면:/)).toBeInTheDocument()
    })
  }, 15000)
})
