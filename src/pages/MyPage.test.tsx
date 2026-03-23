import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createAuthSessionFixture } from '../test/fixtures'
import { renderWithProviders } from '../test/renderWithProviders'
import { useAuthStore } from '../features/auth/session/store'
import MyPage from './MyPage'

const { getMyPageProfileMock, setNicknameMock, navigateMock } = vi.hoisted(
  () => ({
    getMyPageProfileMock: vi.fn(),
    setNicknameMock: vi.fn(),
    navigateMock: vi.fn(),
  })
)

vi.mock('react-router-dom', async () => {
  const actual =
    await vi.importActual<typeof import('react-router-dom')>('react-router-dom')

  return {
    ...actual,
    useNavigate: () => navigateMock,
  }
})

vi.mock('../features/auth/api/api', async () => {
  const actual = await vi.importActual<
    typeof import('../features/auth/api/api')
  >('../features/auth/api/api')

  return {
    ...actual,
    getMyPageProfile: getMyPageProfileMock,
    setNickname: setNicknameMock,
  }
})

describe('MyPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.localStorage.clear()
  })

  it('게스트는 제한 안내만 보고 닉네임 변경 UI를 보지 않는다', () => {
    useAuthStore.setState({
      hasHydrated: true,
      session: createAuthSessionFixture({
        isGuest: true,
        provider: 'guest',
        nickname: '게스트1234',
      }),
    })

    renderWithProviders(<MyPage />, {
      initialEntries: ['/my-page'],
    })

    expect(
      screen.getByText('게스트는 마이페이지 및 전적 조회를 이용할 수 없습니다.')
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: '닉네임 변경' })
    ).not.toBeInTheDocument()
    expect(getMyPageProfileMock).not.toHaveBeenCalled()
  })

  it('뒤로가기는 원형 아이콘 버튼에만 연결되고 제목 텍스트는 버튼에 포함되지 않는다', async () => {
    const user = userEvent.setup()

    useAuthStore.setState({
      hasHydrated: true,
      session: createAuthSessionFixture({
        userId: 'user-1',
        nickname: '헤더유저',
        isGuest: false,
        provider: 'kakao',
      }),
    })
    getMyPageProfileMock.mockResolvedValue({
      ok: true,
      profile: {
        id: 'user-1',
        nickname: '헤더유저',
        profileImage: null,
        stats: {
          total: 3,
          wins: 2,
          losses: 1,
        },
      },
    })

    renderWithProviders(<MyPage />, {
      initialEntries: ['/my-page'],
    })

    expect(
      screen.queryByRole('button', { name: '내 정보' })
    ).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '로비로 돌아가기' }))

    expect(navigateMock).toHaveBeenCalledWith('/lobby')
  })

  it('카카오 사용자는 마이페이지에서 닉네임을 변경하고 즉시 반영한다', async () => {
    const user = userEvent.setup()
    useAuthStore.setState({
      hasHydrated: true,
      session: createAuthSessionFixture({
        userId: 'user-9',
        nickname: '마이페이지유저',
        isGuest: false,
        provider: 'kakao',
      }),
    })
    getMyPageProfileMock.mockResolvedValue({
      ok: true,
      profile: {
        id: 'user-9',
        nickname: '마이페이지유저',
        profileImage: null,
        stats: {
          total: 20,
          wins: 11,
          losses: 9,
        },
      },
    })
    setNicknameMock.mockResolvedValue({
      ok: true,
      nickname: '새닉네임',
    })

    renderWithProviders(<MyPage />, {
      initialEntries: ['/my-page'],
    })

    expect(await screen.findByText('마이페이지유저')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '닉네임 변경' }))
    const input = screen.getByLabelText('닉네임')
    await user.clear(input)
    await user.type(input, '새닉네임')
    await user.click(screen.getByRole('button', { name: '저장' }))

    await waitFor(() => {
      expect(screen.getByText('새닉네임')).toBeInTheDocument()
    })
    expect(setNicknameMock).toHaveBeenCalledWith({
      session: expect.objectContaining({
        userId: 'user-9',
        nickname: '마이페이지유저',
      }),
      nickname: '새닉네임',
    })
    expect(useAuthStore.getState().session?.nickname).toBe('새닉네임')
  })
})
