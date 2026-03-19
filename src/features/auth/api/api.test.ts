import axios, { AxiosError, AxiosHeaders } from 'axios'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '../../../lib/axios'
import {
  buildAuthSession,
  completeKakaoLogin,
  getAuthErrorMessage,
  getMyContext,
  getMyPageProfile,
  loginAsGuest,
  logoutAuthSession,
  mapAuthResumeContext,
  mapMyPageProfile,
  refreshAccessToken,
  restoreAuthSession,
  setNickname,
  shouldUseFallbackSessionForRestore,
  shouldClearAuthSession,
  startKakaoLogin,
} from './api'
import type { AuthSession } from '../session/types'

function createAxiosError({
  status,
  data,
  message = status
    ? `Request failed with status code ${status}`
    : 'Network Error',
}: {
  status?: number
  data?: unknown
  message?: string
}) {
  return new AxiosError(
    message,
    undefined,
    undefined,
    undefined,
    status
      ? {
          status,
          statusText: 'error',
          headers: {},
          config: { headers: {} as never },
          data,
        }
      : undefined
  )
}

describe('buildAuthSession', () => {
  it('REST의 numeric user.id를 문자열 userId로 정규화한다', () => {
    const session = buildAuthSession({
      accessToken: 'token-123',
      user: {
        id: 7,
        nickname: '홍길동',
        profile_image_url: null,
        is_guest: false,
      },
      provider: 'kakao',
    })

    expect(session).toEqual({
      accessToken: 'token-123',
      userId: '7',
      nickname: '홍길동',
      profileImage: null,
      isGuest: false,
      needsNicknameSetup: false,
      provider: 'kakao',
    })
  })

  it('게스트 응답은 provider를 guest로 고정한다', () => {
    const session = buildAuthSession({
      accessToken: 'guest-token',
      user: {
        id: 12,
        nickname: 'Guest_1234',
        profile_image_url: null,
        is_guest: true,
      },
      provider: 'kakao',
    })

    expect(session.provider).toBe('guest')
    expect(session.isGuest).toBe(true)
  })

  it('카카오 유저의 빈 닉네임은 기본적으로 닉네임 설정 필요 상태가 된다', () => {
    const session = buildAuthSession({
      accessToken: 'token-123',
      user: {
        id: 3,
        nickname: '   ',
        profile_image_url: null,
        is_guest: false,
      },
    })

    expect(session.needsNicknameSetup).toBe(true)
    expect(session.provider).toBe('kakao')
  })
})

describe('mapMyPageProfile', () => {
  it('마이페이지 프로필 id를 문자열로 정규화하고 total_games를 내부 total로 매핑한다', () => {
    const profile = mapMyPageProfile({
      id: 3,
      nickname: '마블러',
      profile_image: 'https://example.com/avatar.png',
      stats: {
        total_games: 10,
        wins: 6,
        losses: 4,
      },
    })

    expect(profile).toEqual({
      id: '3',
      nickname: '마블러',
      profileImage: 'https://example.com/avatar.png',
      stats: {
        total: 10,
        wins: 6,
        losses: 4,
      },
    })
  })
})

describe('mapAuthResumeContext', () => {
  it('users/me/context 응답을 내부 resume context 모델로 변환한다', () => {
    const context = mapAuthResumeContext({
      room_id: 'room-7',
      room_title: '친구방',
      room_status: 'playing',
      game_id: '17',
      presence_status: 'playing',
      resume_target: 'game',
    })

    expect(context).toEqual({
      roomId: 'room-7',
      roomTitle: '친구방',
      roomStatus: 'playing',
      gameId: '17',
      presenceStatus: 'playing',
      resumeTarget: 'game',
    })
  })
})

describe('auth api integration helpers', () => {
  const originalBaseUrl = apiClient.defaults.baseURL
  const originalLocation = window.location
  const baseSession: AuthSession = {
    accessToken: 'persisted-token',
    userId: '11',
    nickname: '',
    profileImage: null,
    isGuest: false,
    needsNicknameSetup: true,
    provider: 'kakao',
  }

  beforeEach(() => {
    apiClient.defaults.baseURL = 'http://localhost:3000/api/'
  })

  afterEach(() => {
    vi.restoreAllMocks()
    apiClient.defaults.baseURL = originalBaseUrl
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    })
  })

  it('restoreAuthSession은 Authorization 헤더로 세션을 복구하고 fallback provider를 유지한다', async () => {
    const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValue({
      data: {
        id: 11,
        nickname: '',
        is_guest: false,
        profile_image_url: null,
      },
    })

    const restored = await restoreAuthSession({
      accessToken: 'persisted-token',
      fallbackSession: baseSession,
    })

    expect(getSpy).toHaveBeenCalledWith('/auth/session', {
      headers: {
        Authorization: 'Bearer persisted-token',
      },
    })
    expect(restored.provider).toBe('kakao')
    expect(restored.needsNicknameSetup).toBe(true)
  })

  it('restoreAuthSession은 refresh 이후 응답 config의 Authorization 헤더를 최신 access token으로 반영한다', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue({
      data: {
        id: 11,
        nickname: '',
        is_guest: false,
        profile_image_url: null,
      },
      config: {
        headers: new AxiosHeaders({
          Authorization: 'Bearer refreshed-token',
        }),
      },
    } as never)

    const restored = await restoreAuthSession({
      accessToken: 'persisted-token',
      fallbackSession: baseSession,
    })

    expect(restored.accessToken).toBe('refreshed-token')
  })

  it('mock 모드에서는 persisted fallback session을 그대로 복구에 사용한다', () => {
    expect(
      shouldUseFallbackSessionForRestore({
        fallbackSession: baseSession,
        isAuthMockEnabled: true,
      })
    ).toBe(true)

    expect(
      shouldUseFallbackSessionForRestore({
        fallbackSession: baseSession,
        isAuthMockEnabled: false,
      })
    ).toBe(false)
  })

  it('completeKakaoLogin은 신규 사용자를 닉네임 설정 필요 상태로 저장한다', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue({
      data: {
        id: 14,
        nickname: '카카오유저',
        is_guest: false,
        profile_image_url: null,
      },
    })

    const restored = await completeKakaoLogin({
      accessToken: 'kakao-token',
      isNewUser: true,
    })

    expect(restored.userId).toBe('14')
    expect(restored.needsNicknameSetup).toBe(true)
    expect(restored.provider).toBe('kakao')
  })

  it('getMyContext는 Authorization 헤더로 참가 컨텍스트를 조회한다', async () => {
    const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValue({
      data: {
        room_id: 'room-7',
        room_title: '친구방',
        room_status: 'playing',
        game_id: '17',
        presence_status: 'playing',
        resume_target: 'game',
      },
    })

    const context = await getMyContext('persisted-token')

    expect(getSpy).toHaveBeenCalledWith('/users/me/context', {
      headers: {
        Authorization: 'Bearer persisted-token',
      },
    })
    expect(context).toEqual({
      roomId: 'room-7',
      roomTitle: '친구방',
      roomStatus: 'playing',
      gameId: '17',
      presenceStatus: 'playing',
      resumeTarget: 'game',
    })
  })

  it('loginAsGuest는 실제 계약 응답을 프론트 세션으로 매핑한다', async () => {
    vi.spyOn(apiClient, 'post').mockResolvedValue({
      data: {
        access_token: 'guest-token',
        user: {
          id: 24,
          nickname: '게스트1234',
          is_guest: true,
          profile_image_url: null,
        },
        is_new_user: false,
      },
    })

    const session = await loginAsGuest()

    expect(session).toEqual({
      accessToken: 'guest-token',
      userId: '24',
      nickname: '게스트1234',
      profileImage: null,
      isGuest: true,
      needsNicknameSetup: false,
      provider: 'guest',
    })
  })

  it('startKakaoLogin은 baseURL 끝 슬래시를 제거하고 로그인 시작 endpoint로 이동한다', async () => {
    const assignSpy = vi.fn()

    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        ...window.location,
        assign: assignSpy,
      },
    })

    const result = await startKakaoLogin()

    expect(result).toBeNull()
    expect(assignSpy).toHaveBeenCalledWith(
      'http://localhost:3000/api/auth/kakao/login'
    )
  })

  it('refreshAccessToken은 auth refresh endpoint를 withCredentials로 호출한다', async () => {
    const postSpy = vi.spyOn(axios, 'post').mockResolvedValue({
      data: {
        access_token: 'refreshed-token',
        token_type: 'Bearer',
        expires_in: 3600,
      },
    } as never)

    const result = await refreshAccessToken()

    expect(result).toEqual({
      access_token: 'refreshed-token',
      token_type: 'Bearer',
      expires_in: 3600,
    })
    expect(postSpy).toHaveBeenCalledWith(
      'http://localhost:3000/api/auth/refresh',
      undefined,
      expect.objectContaining({
        withCredentials: true,
      })
    )
  })

  it('logoutAuthSession은 auth logout endpoint를 withCredentials로 호출한다', async () => {
    const postSpy = vi.spyOn(axios, 'post').mockResolvedValue({
      data: null,
    } as never)

    await logoutAuthSession()

    expect(postSpy).toHaveBeenCalledWith(
      'http://localhost:3000/api/auth/logout',
      undefined,
      expect.objectContaining({
        withCredentials: true,
      })
    )
  })

  it('setNickname은 성공 시 trim된 닉네임을 반환한다', async () => {
    vi.spyOn(apiClient, 'patch').mockResolvedValue({
      data: {
        id: 11,
        nickname: '  마블러  ',
      },
    })

    const result = await setNickname({
      session: baseSession,
      nickname: '마블러',
    })

    expect(result).toEqual({
      ok: true,
      nickname: '마블러',
    })
  })

  it('setNickname은 권한 에러를 FORBIDDEN으로 매핑한다', async () => {
    vi.spyOn(apiClient, 'patch').mockRejectedValue(
      createAxiosError({
        status: 403,
        data: {
          detail: '권한이 없습니다.',
        },
      })
    )

    const result = await setNickname({
      session: baseSession,
      nickname: '마블러',
    })

    expect(result).toEqual({
      ok: false,
      code: 'FORBIDDEN',
      message: '권한이 없습니다.',
    })
  })

  it('setNickname은 중복 에러 code를 DUPLICATE로 매핑한다', async () => {
    vi.spyOn(apiClient, 'patch').mockRejectedValue(
      createAxiosError({
        status: 409,
        data: {
          code: 'DUPLICATE_NICKNAME',
          message: '이미 사용 중입니다.',
        },
      })
    )

    const result = await setNickname({
      session: baseSession,
      nickname: '마블러',
    })

    expect(result).toEqual({
      ok: false,
      code: 'DUPLICATE',
      message: '이미 사용 중입니다.',
    })
  })

  it('setNickname은 형식 오류를 INVALID_FORMAT으로 매핑한다', async () => {
    vi.spyOn(apiClient, 'patch').mockRejectedValue(
      createAxiosError({
        status: 422,
        data: {
          detail: [
            {
              msg: '닉네임 형식이 올바르지 않습니다.',
            },
          ],
        },
      })
    )

    const result = await setNickname({
      session: baseSession,
      nickname: '마블!',
    })

    expect(result).toEqual({
      ok: false,
      code: 'INVALID_FORMAT',
      message: '닉네임 형식이 올바르지 않습니다.',
    })
  })

  it('setNickname은 알 수 없는 오류도 실패 메시지로 수렴한다', async () => {
    vi.spyOn(apiClient, 'patch').mockRejectedValue(new Error('network down'))

    const result = await setNickname({
      session: baseSession,
      nickname: '마블러',
    })

    expect(result).toEqual({
      ok: false,
      code: 'INVALID_FORMAT',
      message: 'network down',
    })
  })

  it('getMyPageProfile은 실제 응답을 프로필 모델로 변환한다', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue({
      data: {
        id: 99,
        nickname: '마이페이지유저',
        profile_image_url: 'https://example.com/me.png',
        stats: {
          total_games: 20,
          wins: 11,
          losses: 9,
        },
      },
    })

    const result = await getMyPageProfile(baseSession)

    expect(result).toEqual({
      ok: true,
      profile: {
        id: '99',
        nickname: '마이페이지유저',
        profileImage: 'https://example.com/me.png',
        stats: {
          total: 20,
          wins: 11,
          losses: 9,
        },
      },
    })
  })

  it('getMyPageProfile은 실패 시 FORBIDDEN 에러 모델을 반환한다', async () => {
    vi.spyOn(apiClient, 'get').mockRejectedValue(
      createAxiosError({
        status: 403,
        data: {
          message: '게스트는 접근할 수 없습니다.',
        },
      })
    )

    const result = await getMyPageProfile(baseSession)

    expect(result).toEqual({
      ok: false,
      code: 'FORBIDDEN',
      message: '게스트는 접근할 수 없습니다.',
    })
  })

  it('getAuthErrorMessage는 detail/message/fallback 순으로 메시지를 선택한다', () => {
    expect(
      getAuthErrorMessage(
        createAxiosError({
          status: 400,
          data: {
            detail: '상세 오류',
          },
        }),
        '기본 메시지'
      )
    ).toBe('상세 오류')

    expect(getAuthErrorMessage(new Error('일반 오류'), '기본 메시지')).toBe(
      '일반 오류'
    )
    expect(getAuthErrorMessage({}, '기본 메시지')).toBe('기본 메시지')
  })

  it('getAuthErrorMessage는 네트워크 오류를 공통 fallback 문구로 정리한다', () => {
    expect(
      getAuthErrorMessage(
        createAxiosError({
          message: 'Network Error',
        }),
        '게스트 로그인에 실패했습니다.'
      )
    ).toBe(
      '네트워크 오류가 발생했습니다. 연결 상태를 확인한 뒤 다시 시도해 주세요.'
    )
  })

  it('shouldClearAuthSession은 401 AxiosError만 true를 반환한다', () => {
    expect(
      shouldClearAuthSession(
        createAxiosError({
          status: 401,
        })
      )
    ).toBe(true)

    expect(
      shouldClearAuthSession(
        createAxiosError({
          status: 403,
        })
      )
    ).toBe(false)

    expect(shouldClearAuthSession(new Error('boom'))).toBe(false)
  })
})
