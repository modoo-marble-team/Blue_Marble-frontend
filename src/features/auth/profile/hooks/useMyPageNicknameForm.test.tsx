import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import type { FormEvent } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createAuthSessionFixture } from '../../../../test/fixtures'
import { useAuthStore } from '../../session/store'
import type { MyPageProfile } from '../../session/types'
import { useMyPageNicknameForm } from './useMyPageNicknameForm'
import { getMyPageProfileQueryKey } from './useMyPageProfileQuery'

const { setNicknameMock } = vi.hoisted(() => ({
  setNicknameMock: vi.fn(),
}))

vi.mock('../../api/api', async () => {
  const actual =
    await vi.importActual<typeof import('../../api/api')>('../../api/api')

  return {
    ...actual,
    setNickname: setNicknameMock,
  }
})

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
  }
}

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false },
    },
  })
}

describe('useMyPageNicknameForm', () => {
  const session = createAuthSessionFixture({
    userId: 'user-42',
    nickname: '마이페이지유저',
  })
  const profile: MyPageProfile = {
    id: 'user-42',
    nickname: '마이페이지유저',
    profileImage: null,
    stats: {
      total: 12,
      wins: 7,
      losses: 5,
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()
    window.localStorage.clear()
    useAuthStore.setState({
      hasHydrated: true,
      session,
    })
  })

  it('저장 성공 시 auth store와 my-page query cache를 함께 갱신한다', async () => {
    const queryClient = createTestQueryClient()
    queryClient.setQueryData(getMyPageProfileQueryKey(session.userId), profile)
    setNicknameMock.mockResolvedValue({
      ok: true,
      nickname: '새닉네임',
    })

    const { result } = renderHook(
      () =>
        useMyPageNicknameForm({
          session,
          profile,
        }),
      {
        wrapper: createWrapper(queryClient),
      }
    )

    act(() => {
      result.current.startEditing()
      result.current.handleNicknameChange('새닉네임')
    })

    await act(async () => {
      await result.current.handleSubmit({
        preventDefault() {},
      } as FormEvent<HTMLFormElement>)
    })

    await waitFor(() => {
      expect(result.current.isEditing).toBe(false)
    })
    expect(setNicknameMock).toHaveBeenCalledWith({
      session,
      nickname: '새닉네임',
    })
    expect(useAuthStore.getState().session?.nickname).toBe('새닉네임')
    expect(
      queryClient.getQueryData<MyPageProfile>(
        getMyPageProfileQueryKey(session.userId)
      )?.nickname
    ).toBe('새닉네임')
  })

  it('현재 닉네임과 동일하면 저장을 비활성화하고 API를 호출하지 않는다', async () => {
    const queryClient = createTestQueryClient()

    const { result } = renderHook(
      () =>
        useMyPageNicknameForm({
          session,
          profile,
        }),
      {
        wrapper: createWrapper(queryClient),
      }
    )

    act(() => {
      result.current.startEditing()
    })

    expect(result.current.isSaveDisabled).toBe(true)
    expect(result.current.helperFeedback.message).toBe(
      '• 현재 사용 중인 닉네임입니다.'
    )

    await act(async () => {
      await result.current.handleSubmit({
        preventDefault() {},
      } as FormEvent<HTMLFormElement>)
    })

    expect(setNicknameMock).not.toHaveBeenCalled()
  })

  it('저장 실패 시 편집 상태를 유지하고 서버 메시지를 노출한다', async () => {
    const queryClient = createTestQueryClient()
    setNicknameMock.mockResolvedValue({
      ok: false,
      code: 'DUPLICATE',
      message: '이미 사용 중인 닉네임입니다.',
    })

    const { result } = renderHook(
      () =>
        useMyPageNicknameForm({
          session,
          profile,
        }),
      {
        wrapper: createWrapper(queryClient),
      }
    )

    act(() => {
      result.current.startEditing()
      result.current.handleNicknameChange('중복닉네임')
    })

    await act(async () => {
      await result.current.handleSubmit({
        preventDefault() {},
      } as FormEvent<HTMLFormElement>)
    })

    expect(result.current.isEditing).toBe(true)
    expect(result.current.helperFeedback.message).toBe(
      '• 이미 사용 중인 닉네임입니다.'
    )
  })
})
