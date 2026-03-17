import axios, { AxiosHeaders } from 'axios'
import { useAuthStore } from '../features/auth/session/store'

// 공통 API 요청에 사용할 axios 인스턴스 생성
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

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
