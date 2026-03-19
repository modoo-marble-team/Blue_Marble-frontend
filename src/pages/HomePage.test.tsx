import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../test/renderWithProviders'
import HomePage from './HomePage'

const {
  startKakaoLoginMock,
  loginAsGuestMock,
  getAuthErrorMessageMock,
  setSessionMock,
  navigateMock,
  toastErrorMock,
} = vi.hoisted(() => ({
  startKakaoLoginMock: vi.fn(),
  loginAsGuestMock: vi.fn(),
  getAuthErrorMessageMock: vi.fn(),
  setSessionMock: vi.fn(),
  navigateMock: vi.fn(),
  toastErrorMock: vi.fn(),
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
  }
})

vi.mock('../features/auth/api/api', () => ({
  getAuthErrorMessage: getAuthErrorMessageMock,
  loginAsGuest: loginAsGuestMock,
  startKakaoLogin: startKakaoLoginMock,
}))

vi.mock('../features/auth/session/store', () => ({
  useAuthStore: (
    selector: (state: { setSession: typeof setSessionMock }) => unknown
  ) =>
    selector({
      setSession: setSessionMock,
    }),
}))

describe('HomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('DEV 환경에서는 카카오 로그인 클릭 시 토스트만 띄우고 로그인을 시작하지 않는다', async () => {
    const user = userEvent.setup()

    renderWithProviders(<HomePage />)

    await user.click(
      screen.getByRole('button', { name: '카카오 로그인으로 시작' })
    )

    expect(toastErrorMock).toHaveBeenCalledWith(
      '카카오 로그인은 배포 환경에서만 테스트 가능합니다.'
    )
    expect(startKakaoLoginMock).not.toHaveBeenCalled()
    expect(setSessionMock).not.toHaveBeenCalled()
    expect(navigateMock).not.toHaveBeenCalled()
  })
})
