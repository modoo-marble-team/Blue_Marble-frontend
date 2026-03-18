import axios, {
  AxiosError,
  AxiosHeaders,
  type InternalAxiosRequestConfig,
} from 'axios'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useAuthStore } from '../features/auth/session/store'
import { apiClient, buildAuthTransportUrl } from './axios'

interface RequestInterceptorManagerLike {
  handlers?: Array<{
    fulfilled?: (
      config: InternalAxiosRequestConfig
    ) => InternalAxiosRequestConfig | Promise<InternalAxiosRequestConfig>
    rejected?: (error: unknown) => unknown
  }>
}

function createRequestConfig(headers = new AxiosHeaders()) {
  return {
    headers,
    method: 'get',
    url: '/health',
  } as InternalAxiosRequestConfig
}

function runRequestInterceptor(config: InternalAxiosRequestConfig) {
  const requestInterceptors = apiClient.interceptors
    .request as RequestInterceptorManagerLike
  const fulfilledHandler = requestInterceptors.handlers?.[0]?.fulfilled
  if (!fulfilledHandler) {
    throw new Error('request interceptor is not registered')
  }

  const nextConfig = fulfilledHandler(config)
  if (nextConfig instanceof Promise) {
    throw new Error('request interceptor returned a Promise unexpectedly')
  }

  return nextConfig
}

function runResponseErrorInterceptor(error: unknown) {
  const responseInterceptors = apiClient.interceptors
    .response as RequestInterceptorManagerLike
  const rejectedHandler = responseInterceptors.handlers?.[0]?.rejected
  if (!rejectedHandler) {
    throw new Error('response interceptor is not registered')
  }

  return rejectedHandler(error)
}

function createAxiosError(config: InternalAxiosRequestConfig, status: number) {
  return new AxiosError(
    `Request failed with status code ${status}`,
    undefined,
    config,
    undefined,
    {
      status,
      statusText: 'error',
      headers: {},
      config,
      data: {
        detail: status === 401 ? 'Token expired' : 'error',
      },
    }
  )
}

describe('apiClient request interceptor', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    useAuthStore.getState().clearSession()
  })

  it('명시적인 Authorization 헤더가 있으면 그대로 유지한다', () => {
    const config = runRequestInterceptor(
      createRequestConfig(
        new AxiosHeaders({
          Authorization: 'Bearer explicit-token',
        })
      )
    )

    expect(AxiosHeaders.from(config.headers).get('Authorization')).toBe(
      'Bearer explicit-token'
    )
  })

  it('세션 토큰이 있으면 Authorization 헤더를 자동으로 채운다', () => {
    useAuthStore.getState().setSession({
      accessToken: 'session-token',
      userId: '1',
      nickname: '마블러',
      profileImage: null,
      isGuest: false,
      needsNicknameSetup: false,
      provider: 'kakao',
    })

    const config = runRequestInterceptor(createRequestConfig())

    expect(AxiosHeaders.from(config.headers).get('Authorization')).toBe(
      'Bearer session-token'
    )
  })

  it('세션 토큰이 없고 명시 헤더도 없으면 Authorization을 비운다', () => {
    const config = runRequestInterceptor(createRequestConfig())

    expect(
      AxiosHeaders.from(config.headers).get('Authorization')
    ).toBeUndefined()
  })

  it('기본적으로 withCredentials를 켠다', () => {
    expect(apiClient.defaults.withCredentials).toBe(true)
  })

  it('401 응답이면 refresh 후 access token을 갱신하고 요청을 1회 재시도한다', async () => {
    useAuthStore.getState().setSession({
      accessToken: 'expired-token',
      userId: '1',
      nickname: '마블러',
      profileImage: null,
      isGuest: false,
      needsNicknameSetup: false,
      provider: 'kakao',
    })

    const refreshSpy = vi.spyOn(axios, 'post').mockResolvedValue({
      data: {
        access_token: 'refreshed-token',
        token_type: 'Bearer',
        expires_in: 3600,
      },
    } as never)
    const retrySpy = vi.spyOn(apiClient, 'request').mockResolvedValue({
      data: { ok: true },
    } as never)

    const result = await runResponseErrorInterceptor(
      createAxiosError(createRequestConfig(), 401)
    )

    expect(refreshSpy).toHaveBeenCalledWith(
      buildAuthTransportUrl('/refresh'),
      undefined,
      expect.objectContaining({
        withCredentials: true,
      })
    )
    expect(retrySpy).toHaveBeenCalledWith(
      expect.objectContaining({
        _retry: true,
        headers: expect.objectContaining({
          Authorization: 'Bearer refreshed-token',
        }),
      })
    )
    expect(useAuthStore.getState().session?.accessToken).toBe('refreshed-token')
    expect(result).toEqual({
      data: { ok: true },
    })
  })

  it('refresh가 실패하면 세션을 정리하고 원본 요청을 종료한다', async () => {
    useAuthStore.getState().setSession({
      accessToken: 'expired-token',
      userId: '1',
      nickname: '마블러',
      profileImage: null,
      isGuest: false,
      needsNicknameSetup: false,
      provider: 'kakao',
    })

    const refreshError = new Error('refresh failed')
    vi.spyOn(axios, 'post').mockRejectedValue(refreshError)

    await expect(
      runResponseErrorInterceptor(createAxiosError(createRequestConfig(), 401))
    ).rejects.toBe(refreshError)

    expect(useAuthStore.getState().session).toBeNull()
  })
})
