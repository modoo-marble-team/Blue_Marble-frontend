import { useEffect, useState } from 'react'
import { connectSocketWithAuthIfNeeded, socket } from '../../lib/socket'
import { getOnlineUsersSnapshot } from './api'
import { mockOnlineUsers } from './mockData'
import type {
  OnlineUser,
  OnlineUserPayload,
  OnlineUsersEventPayload,
} from './types'

// 접속자 목록 소켓 이벤트 이름
const ONLINE_USERS_EVENT = 'online_users'
const SOCKET_MOCK_INTERVAL_MS = 5_000
const USE_SOCKET_MOCK =
  import.meta.env.DEV && import.meta.env.VITE_USE_SOCKET_MOCK !== 'false'
// userId 해시 기반 아바타 배경색 후보군
const AVATAR_BACKGROUND_COLORS = [
  '#f6c8a9',
  '#7f8ea3',
  '#dbc4f8',
  '#8f7f77',
  '#b5d9ff',
  '#ffd8a6',
]

// 테스트용 리스너 접근을 위한 socket 타입 확장
interface SocketWithListeners {
  listeners: (
    eventName: string
  ) => Array<(payload: OnlineUsersEventPayload) => void>
}

// 닉네임 첫 글자를 아바타 텍스트로 변환
function getAvatarText(nickname: string) {
  const trimmedNickname = nickname.trim()
  // 빈 문자열 닉네임은 기본 문자 반환
  if (trimmedNickname.length === 0) {
    return '?'
  }

  return trimmedNickname.slice(0, 1).toUpperCase()
}

// userId 문자열 해시로 일관된 아바타 배경색 선택
function getAvatarBackground(userId: string) {
  const colorIndex =
    userId
      .split('')
      .reduce((acc, character) => acc + character.charCodeAt(0), 0) %
    AVATAR_BACKGROUND_COLORS.length
  return AVATAR_BACKGROUND_COLORS[colorIndex]
}

// 접속자 payload를 UI 전용 접속자 모델로 매핑
function mapOnlineUsers(payloadUsers: OnlineUserPayload[]): OnlineUser[] {
  return payloadUsers.map((user) => ({
    ...user,
    avatarText: getAvatarText(user.nickname),
    avatarBackground: getAvatarBackground(user.id),
  }))
}

// 목 모드에서 online_users 이벤트를 리스너에 직접 브로드캐스트
function emitOnlineUsersMock(payloadUsers: OnlineUserPayload[]) {
  const socketWithListeners = socket as unknown as SocketWithListeners
  const listeners = socketWithListeners.listeners(ONLINE_USERS_EVENT)
  listeners.forEach((listener) => listener({ users: payloadUsers }))
}

// 접속자 목록 소켓 구독과 로딩/에러 상태를 관리
export function useOnlineUsersSocket() {
  const [users, setUsers] = useState<OnlineUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isError, setIsError] = useState(false)

  useEffect(() => {
    let isActive = true

    // 접속자 이벤트 수신 시 목록과 상태를 갱신
    const handleOnlineUsers = ({
      users: payloadUsers,
    }: OnlineUsersEventPayload) => {
      if (!isActive) {
        return
      }

      setUsers(mapOnlineUsers(payloadUsers))
      setIsLoading(false)
      setIsError(false)
    }

    // 소켓 연결 오류를 에러 상태로 반영
    const handleConnectError = () => {
      setIsLoading(false)
      setIsError(true)
    }

    // 연결 종료 상태를 에러로 표시
    const handleDisconnect = () => {
      if (!isActive) {
        return
      }

      setIsError(true)
    }

    socket.on(ONLINE_USERS_EVENT, handleOnlineUsers)

    let mockIntervalId: ReturnType<typeof setInterval> | undefined

    // 목 모드에서는 일정 주기로 동일 데이터를 재전송
    if (USE_SOCKET_MOCK) {
      emitOnlineUsersMock(mockOnlineUsers)
      mockIntervalId = setInterval(() => {
        emitOnlineUsersMock(mockOnlineUsers)
      }, SOCKET_MOCK_INTERVAL_MS)
    } else {
      // 초기 진입 시 REST 스냅샷으로 첫 목록을 확보
      void getOnlineUsersSnapshot()
        .then((payloadUsers) => {
          if (!isActive) {
            return
          }

          setUsers(mapOnlineUsers(payloadUsers))
          setIsLoading(false)
          setIsError(false)
        })
        .catch(() => {
          // REST 초기화 실패 시 소켓 실시간 수신으로 복구를 시도
          if (!isActive) {
            return
          }

          setIsLoading(false)
        })

      // 실제 소켓 모드에서는 연결 오류/끊김 이벤트를 구독
      socket.on('connect_error', handleConnectError)
      socket.on('disconnect', handleDisconnect)

      // 아직 연결되지 않았다면 명시적으로 연결 시작
      if (!socket.connected) {
        connectSocketWithAuthIfNeeded()
      }
    }

    return () => {
      isActive = false
      socket.off(ONLINE_USERS_EVENT, handleOnlineUsers)
      socket.off('connect_error', handleConnectError)
      socket.off('disconnect', handleDisconnect)

      // 목 인터벌이 존재하면 클린업에서 해제
      if (mockIntervalId) {
        clearInterval(mockIntervalId)
      }
    }
  }, [])

  return {
    data: users,
    isLoading,
    isError,
  }
}
