import axios, {
  AxiosError,
  AxiosHeaders,
  isAxiosError,
  type InternalAxiosRequestConfig,
} from 'axios'
import { IS_DEMO_MOCK_ENABLED } from '../config/env'
import { useAuthStore } from '../features/auth/session/store'
import {
  disconnectSocketAndClearAuth,
  reconnectSocketWithUpdatedAuthIfConnected,
} from './socket'

export interface RefreshAccessTokenResponsePayload {
  access_token: string
  token_type: string
  expires_in: number
}

interface RetryableAuthRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean
}

let activeRefreshPromise: Promise<string> | null = null

// 공통 API 요청에 사용할 axios 인스턴스 생성
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  timeout: 10000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

function getApiOrigin(baseURL = apiClient.defaults.baseURL) {
  const fallbackOrigin =
    typeof window !== 'undefined' ? window.location.origin : 'http://localhost'

  if (!baseURL) {
    return fallbackOrigin
  }

  return new URL(String(baseURL), fallbackOrigin).origin
}

export function buildAuthTransportUrl(path: '/refresh' | '/logout') {
  return new URL(`/api/auth${path}`, getApiOrigin()).toString()
}

export async function requestAccessTokenRefresh() {
  const { data } = await axios.post<RefreshAccessTokenResponsePayload>(
    buildAuthTransportUrl('/refresh'),
    undefined,
    {
      timeout: apiClient.defaults.timeout,
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  )

  return data
}

export async function requestAuthLogout() {
  await axios.post(buildAuthTransportUrl('/logout'), undefined, {
    timeout: apiClient.defaults.timeout,
    withCredentials: true,
    headers: {
      'Content-Type': 'application/json',
    },
  })
}

function shouldSkipRefreshRetry(url?: string) {
  if (!url) {
    return false
  }

  return url.includes('/auth/refresh') || url.includes('/auth/logout')
}

async function refreshAccessTokenAndSyncSession() {
  const sessionSnapshot = useAuthStore.getState().session
  if (!sessionSnapshot?.accessToken) {
    throw new AxiosError('No active session for refresh')
  }

  const refreshResult = await requestAccessTokenRefresh()
  const activeSession = useAuthStore.getState().session

  if (
    !activeSession ||
    activeSession.userId !== sessionSnapshot.userId ||
    activeSession.accessToken !== sessionSnapshot.accessToken
  ) {
    throw new AxiosError('Auth session changed before refresh completed')
  }

  if (activeSession.accessToken !== refreshResult.access_token) {
    useAuthStore.getState().setSession({
      ...activeSession,
      accessToken: refreshResult.access_token,
    })
    reconnectSocketWithUpdatedAuthIfConnected()
  }

  return refreshResult.access_token
}

// 요청 직전에 최신 세션 토큰을 Authorization 헤더로 동기화
apiClient.interceptors.request.use((config) => {
  const nextHeaders = AxiosHeaders.from(config.headers)
  const explicitAuthorization = nextHeaders.get('Authorization')

  if (explicitAuthorization) {
    config.headers = nextHeaders
    return config
  }

  const accessToken = useAuthStore.getState().session?.accessToken
  if (accessToken) {
    nextHeaders.set('Authorization', `Bearer ${accessToken}`)
  } else {
    nextHeaders.delete('Authorization')
  }

  config.headers = nextHeaders
  return config
})

apiClient.interceptors.response.use(undefined, async (error) => {
  if (IS_DEMO_MOCK_ENABLED || !isAxiosError(error)) {
    return Promise.reject(error)
  }

  const originalRequest = error.config as RetryableAuthRequestConfig | undefined
  if (
    error.response?.status !== 401 ||
    !originalRequest ||
    originalRequest._retry ||
    shouldSkipRefreshRetry(originalRequest.url)
  ) {
    return Promise.reject(error)
  }

  originalRequest._retry = true

  try {
    activeRefreshPromise ??= refreshAccessTokenAndSyncSession().finally(() => {
      activeRefreshPromise = null
    })

    const nextAccessToken = await activeRefreshPromise
    const nextHeaders = AxiosHeaders.from(originalRequest.headers)
    nextHeaders.set('Authorization', `Bearer ${nextAccessToken}`)
    originalRequest.headers = nextHeaders

    return apiClient.request(originalRequest)
  } catch (refreshError) {
    useAuthStore.getState().clearSession()
    disconnectSocketAndClearAuth()
    return Promise.reject(refreshError)
  }
})
