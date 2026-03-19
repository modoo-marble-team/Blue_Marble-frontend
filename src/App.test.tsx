import type { ReactNode } from 'react'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { createAuthSessionFixture } from './test/fixtures'

const { useAuthBootstrapMock, useAuthResumeNavigationMock, useAuthStoreMock } =
  vi.hoisted(() => ({
    useAuthBootstrapMock: vi.fn(),
    useAuthResumeNavigationMock: vi.fn(),
    useAuthStoreMock: vi.fn(),
  }))

vi.mock('./components/DesktopViewportGuard', () => ({
  DesktopViewportGuard: ({ children }: { children: ReactNode }) => (
    <>{children}</>
  ),
}))

vi.mock('./features/auth/session/hooks/useAuthBootstrap', () => ({
  useAuthBootstrap: useAuthBootstrapMock,
}))

vi.mock('./features/auth/session/hooks/useAuthResumeNavigation', () => ({
  useAuthResumeNavigation: useAuthResumeNavigationMock,
}))

vi.mock('./features/auth/session/store', () => ({
  useAuthStore: useAuthStoreMock,
}))

vi.mock('./pages/HomePage', () => ({
  default: () => <div>홈 페이지</div>,
}))

vi.mock('./pages/GamePage', () => ({
  default: () => <div>게임 페이지</div>,
}))

vi.mock('./pages/lobby/LobbyPage', () => ({
  default: () => <div>로비 페이지</div>,
}))

vi.mock('./pages/KakaoLoginCallbackPage', () => ({
  default: () => <div>카카오 콜백 페이지</div>,
}))

vi.mock('./pages/NicknameSetupPage', () => ({
  default: () => <div>닉네임 설정 페이지</div>,
}))

vi.mock('./pages/MyPage', () => ({
  default: () => <div>마이페이지</div>,
}))

vi.mock('./pages/waiting-room/page/WaitingRoomPage', () => ({
  default: () => <div>대기방 페이지</div>,
}))

function renderApp(initialEntry: string) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <App />
    </MemoryRouter>
  )
}

describe('App auth bootstrap gating', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthResumeNavigationMock.mockReturnValue(false)
    useAuthStoreMock.mockImplementation((selector) =>
      selector({
        session: null,
      })
    )
  })

  it('홈 경로에서는 bootstrap 중이어도 홈 화면을 그대로 렌더링한다', async () => {
    useAuthBootstrapMock.mockReturnValue(true)

    renderApp('/')

    expect(await screen.findByText('홈 페이지')).toBeInTheDocument()
    expect(
      screen.queryByText('세션 정보를 확인하고 있습니다.')
    ).not.toBeInTheDocument()
  })

  it('보호 경로에서는 bootstrap 중일 때 세션 확인 화면을 보여준다', () => {
    useAuthBootstrapMock.mockReturnValue(true)

    renderApp('/lobby')

    expect(
      screen.getByText('세션 정보를 확인하고 있습니다.')
    ).toBeInTheDocument()
    expect(screen.queryByText('로비 페이지')).not.toBeInTheDocument()
  })

  it('persisted session이 있으면 보호 경로에서도 bootstrap을 백그라운드로 진행한다', async () => {
    useAuthBootstrapMock.mockReturnValue(true)
    useAuthStoreMock.mockImplementation((selector) =>
      selector({
        session: createAuthSessionFixture({
          accessToken: 'guest-token',
          userId: 'guest-user',
          nickname: '게스트',
          isGuest: true,
          provider: 'guest',
        }),
      })
    )

    renderApp('/lobby')

    expect(
      screen.queryByText('세션 정보를 확인하고 있습니다.')
    ).not.toBeInTheDocument()
    expect(await screen.findByText('로비 페이지')).toBeInTheDocument()
  })

  it('세션이 있는 상태에서 참가 컨텍스트를 확인 중이면 복귀 확인 화면을 보여준다', () => {
    useAuthBootstrapMock.mockReturnValue(false)
    useAuthResumeNavigationMock.mockReturnValue(true)
    useAuthStoreMock.mockImplementation((selector) =>
      selector({
        session: createAuthSessionFixture({
          accessToken: 'persisted-token',
          userId: 'user-1',
          nickname: '테스터',
        }),
      })
    )

    renderApp('/')

    expect(
      screen.getByText('참가 정보를 확인하고 있습니다.')
    ).toBeInTheDocument()
    expect(screen.queryByText('홈 페이지')).not.toBeInTheDocument()
  })
})
