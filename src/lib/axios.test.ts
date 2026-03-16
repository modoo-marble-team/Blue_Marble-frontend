import { AxiosHeaders, type InternalAxiosRequestConfig } from 'axios'
import { afterEach, describe, expect, it } from 'vitest'
import { useAuthStore } from '../features/auth/store'
import { apiClient } from './axios'

interface RequestInterceptorManagerLike {
  handlers?: Array<{
    fulfilled?: (
      config: InternalAxiosRequestConfig
    ) => InternalAxiosRequestConfig | Promise<InternalAxiosRequestConfig>
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

describe('apiClient request interceptor', () => {
  afterEach(() => {
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
})
