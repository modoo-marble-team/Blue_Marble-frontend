import { connectSocketWithAuthIfNeeded, socket } from '../../lib/socket'
import { getMockOnlineUsersSnapshot } from './mockData'
import type { OnlineUserPayload, OnlineUsersEventPayload } from './types'

// 접속자 목록 소켓 이벤트 이름
export const ONLINE_USERS_EVENT_NAME = 'online_users'
const SOCKET_MOCK_INTERVAL_MS = 5_000
const USE_SOCKET_MOCK =
  import.meta.env.DEV && import.meta.env.VITE_USE_SOCKET_MOCK !== 'false'

// 테스트용 리스너 접근을 위한 socket 타입 확장
interface SocketWithListeners {
  listeners: (
    eventName: string
  ) => Array<(payload: OnlineUsersEventPayload) => void>
}

// 접속자 훅에서 목 소켓 모드 활성 여부 반환
export function isOnlineUsersSocketMockMode() {
  return USE_SOCKET_MOCK
}

// 목 모드에서 online_users 이벤트를 리스너에 직접 브로드캐스트
function emitOnlineUsersMock(payloadUsers: OnlineUserPayload[]) {
  const socketWithListeners = socket as unknown as SocketWithListeners
  const listeners = socketWithListeners.listeners(ONLINE_USERS_EVENT_NAME)

  listeners.forEach((listener) => {
    listener({ users: payloadUsers })
  })
}

// 목 접속자 최신 스냅샷을 즉시 브로드캐스트
export function emitMockOnlineUsersSnapshot() {
  emitOnlineUsersMock(getMockOnlineUsersSnapshot())
}

// 목 모드에서 초기/주기 접속자 이벤트를 송신하고 클린업 함수를 반환
export function startOnlineUsersMockBroadcast() {
  emitMockOnlineUsersSnapshot()

  const intervalId = setInterval(() => {
    emitMockOnlineUsersSnapshot()
  }, SOCKET_MOCK_INTERVAL_MS)

  return () => {
    clearInterval(intervalId)
  }
}

// 실제 소켓 모드에서 연결이 없으면 명시적으로 연결
export function ensureOnlineUsersSocketConnection() {
  if (!socket.connected) {
    connectSocketWithAuthIfNeeded()
  }
}
