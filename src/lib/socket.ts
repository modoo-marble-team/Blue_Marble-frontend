import { io } from 'socket.io-client'
import { useAuthStore } from '../features/auth/session/store'

// 소켓 서버 기본 URL을 환경변수 또는 로컬 값으로 결정
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? 'http://localhost:3000'

// 앱 전역에서 재사용할 socket.io 클라이언트 생성
export const socket = io(SOCKET_URL, {
  autoConnect: false,
})

// 소켓 auth 객체에서 현재 토큰 값을 안전하게 조회
function getSocketAuthToken() {
  if (typeof socket.auth !== 'object' || !socket.auth) {
    return null
  }

  const token = (socket.auth as { token?: unknown }).token
  return typeof token === 'string' ? token : null
}

// 현재 세션 토큰을 소켓 auth payload로 반영
export function syncSocketAuthToken() {
  const accessToken = useAuthStore.getState().session?.accessToken
  socket.auth = accessToken ? { token: accessToken } : {}
}

// 토큰 동기화 후 필요할 때만 소켓 연결
export function connectSocketWithAuthIfNeeded() {
  const previousToken = getSocketAuthToken()
  syncSocketAuthToken()
  const nextToken = getSocketAuthToken()

  // 연결된 상태에서 토큰이 바뀌면 재연결로 인증 컨텍스트를 갱신
  if (socket.connected) {
    if (previousToken !== nextToken) {
      socket.disconnect()
      socket.connect()
    }
    return
  }

  socket.connect()
}

// 세션 종료 시 소켓 연결과 auth 컨텍스트를 함께 초기화
export function disconnectSocketAndClearAuth() {
  socket.auth = {}

  if (socket.connected) {
    socket.disconnect()
  }
}
