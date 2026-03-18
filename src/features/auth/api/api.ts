import { AxiosHeaders, isAxiosError } from 'axios'
import { IS_DEMO_MOCK_ENABLED } from '../../../config/env'
import { getParsedApiErrorMessage, parseApiError } from '../../../lib/apiError'
import {
  apiClient,
  requestAccessTokenRefresh,
  requestAuthLogout,
  type RefreshAccessTokenResponsePayload,
} from '../../../lib/axios'
import {
  mockGuestLogin,
  mockGetMyPageProfile,
  mockKakaoLogin,
  mockSetNickname,
} from './mockApi'
import type {
  AuthProvider,
  AuthSession,
  MyPageProfile,
  MyPageProfileResult,
  NicknameSetResult,
} from '../session/types'

export const KAKAO_LOGIN_CALLBACK_PATH = '/auth/kakao/callback'
export const IS_AUTH_MOCK_ENABLED = IS_DEMO_MOCK_ENABLED

interface AuthUserPayload {
  id: number | string
  nickname: string
  profile_image_url?: string | null
  profile_image?: string | null
  is_guest: boolean
}

interface AuthResponsePayload {
  access_token: string
  user: AuthUserPayload
  is_new_user: boolean
}

interface AuthSessionResponse {
  user: AuthUserPayload
  accessToken: string
}

type AuthSessionPayload = AuthUserPayload

interface UpdateNicknameResponsePayload {
  id: number | string
  nickname: string
}

interface MyPageProfilePayload {
  id: number | string
  nickname: string
  profile_image_url?: string | null
  profile_image?: string | null
  stats: {
    total: number
    wins: number
    losses: number
  }
}

interface BuildAuthSessionParams {
  accessToken: string
  user: AuthUserPayload
  provider?: AuthProvider
  needsNicknameSetup?: boolean
}

interface RestoreAuthSessionParams {
  accessToken: string
  fallbackSession?: AuthSession | null
}

interface CompleteKakaoLoginParams {
  accessToken: string
  isNewUser: boolean
}

interface ShouldUseFallbackSessionForRestoreParams {
  fallbackSession?: AuthSession | null
  isAuthMockEnabled?: boolean
}

function normalizeId(id: number | string) {
  return String(id)
}

function readProfileImageUrl(payload: {
  profile_image_url?: string | null
  profile_image?: string | null
}) {
  return payload.profile_image_url ?? payload.profile_image ?? null
}

function deriveProvider(isGuest: boolean, fallbackProvider?: AuthProvider) {
  if (isGuest) {
    return 'guest' satisfies AuthProvider
  }

  return fallbackProvider ?? ('kakao' satisfies AuthProvider)
}

export function buildAuthSession({
  accessToken,
  user,
  provider,
  needsNicknameSetup,
}: BuildAuthSessionParams): AuthSession {
  const normalizedNickname = user.nickname.trim()

  return {
    accessToken,
    userId: normalizeId(user.id),
    nickname: normalizedNickname,
    profileImage: readProfileImageUrl(user),
    isGuest: user.is_guest,
    needsNicknameSetup:
      needsNicknameSetup ?? (!user.is_guest && normalizedNickname.length === 0),
    provider: deriveProvider(user.is_guest, provider),
  }
}

export function mapMyPageProfile(payload: MyPageProfilePayload): MyPageProfile {
  return {
    id: normalizeId(payload.id),
    nickname: payload.nickname,
    profileImage: readProfileImageUrl(payload),
    stats: payload.stats,
  }
}

function buildApiPath(path: string) {
  const baseUrl = String(apiClient.defaults.baseURL ?? '/api').replace(
    /\/+$/,
    ''
  )
  return `${baseUrl}${path}`
}

async function getAuthSessionWithToken(accessToken: string) {
  const response = await apiClient.get<AuthSessionPayload>('/auth/session', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  const resolvedAuthorization = AxiosHeaders.from(response.config?.headers).get(
    'Authorization'
  )
  const resolvedAccessToken =
    typeof resolvedAuthorization === 'string' &&
    resolvedAuthorization.startsWith('Bearer ')
      ? resolvedAuthorization.slice('Bearer '.length).trim()
      : accessToken

  return {
    user: response.data,
    accessToken: resolvedAccessToken,
  } satisfies AuthSessionResponse
}

export function shouldUseFallbackSessionForRestore({
  fallbackSession,
  isAuthMockEnabled = IS_AUTH_MOCK_ENABLED,
}: ShouldUseFallbackSessionForRestoreParams) {
  return isAuthMockEnabled && Boolean(fallbackSession)
}

export async function restoreAuthSession({
  accessToken,
  fallbackSession,
}: RestoreAuthSessionParams) {
  if (
    fallbackSession &&
    shouldUseFallbackSessionForRestore({ fallbackSession })
  ) {
    return fallbackSession
  }

  const restored = await getAuthSessionWithToken(accessToken)

  return buildAuthSession({
    accessToken: restored.accessToken,
    user: restored.user,
    provider: fallbackSession?.provider,
    needsNicknameSetup:
      fallbackSession?.needsNicknameSetup &&
      restored.user.nickname.trim().length === 0,
  })
}

export async function completeKakaoLogin({
  accessToken,
  isNewUser,
}: CompleteKakaoLoginParams) {
  const restored = await getAuthSessionWithToken(accessToken)

  return buildAuthSession({
    accessToken: restored.accessToken,
    user: restored.user,
    provider: 'kakao',
    needsNicknameSetup: isNewUser || restored.user.nickname.trim().length === 0,
  })
}

export async function refreshAccessToken() {
  if (IS_AUTH_MOCK_ENABLED) {
    return {
      access_token: '',
      token_type: 'Bearer',
      expires_in: 0,
    } satisfies RefreshAccessTokenResponsePayload
  }

  return requestAccessTokenRefresh()
}

export async function loginAsGuest() {
  if (IS_AUTH_MOCK_ENABLED) {
    return mockGuestLogin()
  }

  const { data } = await apiClient.post<AuthResponsePayload>('/auth/guest')
  return buildAuthSession({
    accessToken: data.access_token,
    user: data.user,
    provider: 'guest',
    needsNicknameSetup: false,
  })
}

export async function startKakaoLogin() {
  if (IS_AUTH_MOCK_ENABLED) {
    return mockKakaoLogin()
  }

  window.location.assign(buildApiPath('/auth/kakao/login'))
  return null
}

export async function setNickname(params: {
  session: AuthSession
  nickname: string
}): Promise<NicknameSetResult> {
  if (IS_AUTH_MOCK_ENABLED) {
    return mockSetNickname(params)
  }

  try {
    const { data } = await apiClient.patch<UpdateNicknameResponsePayload>(
      '/users/me/nickname',
      {
        nickname: params.nickname,
      }
    )

    return {
      ok: true,
      nickname: data.nickname.trim(),
    }
  } catch (error) {
    const parsedError = parseApiError(error)

    if (parsedError.status === 403) {
      return {
        ok: false,
        code: 'FORBIDDEN',
        message: getParsedApiErrorMessage(parsedError, '권한이 없습니다.'),
      }
    }

    if (
      parsedError.status === 409 ||
      parsedError.code === 'DUPLICATE_NICKNAME'
    ) {
      return {
        ok: false,
        code: 'DUPLICATE',
        message: getParsedApiErrorMessage(
          parsedError,
          '이미 사용 중인 닉네임입니다.'
        ),
      }
    }

    if (parsedError.status === 400 || parsedError.status === 422) {
      return {
        ok: false,
        code: 'INVALID_FORMAT',
        message: getParsedApiErrorMessage(
          parsedError,
          '닉네임 형식이 올바르지 않습니다.'
        ),
      }
    }

    return {
      ok: false,
      code: 'INVALID_FORMAT',
      message: getParsedApiErrorMessage(
        parsedError,
        '닉네임 설정에 실패했습니다.'
      ),
    }
  }
}

export async function getMyPageProfile(
  session: AuthSession
): Promise<MyPageProfileResult> {
  if (IS_AUTH_MOCK_ENABLED) {
    return mockGetMyPageProfile(session)
  }

  try {
    const { data } = await apiClient.get<MyPageProfilePayload>('/users/me')
    return {
      ok: true,
      profile: mapMyPageProfile(data),
    }
  } catch (error) {
    const parsedError = parseApiError(error)
    return {
      ok: false,
      code: 'FORBIDDEN',
      message: getParsedApiErrorMessage(
        parsedError,
        '프로필 정보를 불러오지 못했습니다.'
      ),
    }
  }
}

export async function logoutAuthSession() {
  if (IS_AUTH_MOCK_ENABLED) {
    return
  }

  await requestAuthLogout()
}

export function getAuthErrorMessage(error: unknown, fallbackMessage: string) {
  return getParsedApiErrorMessage(parseApiError(error), fallbackMessage)
}

export function shouldClearAuthSession(error: unknown) {
  if (!isAxiosError(error)) {
    return false
  }

  return error.response?.status === 401
}
