import { useEffect, useState } from 'react'
import { socket } from '../../lib/socket'
import { getOnlineUsersSnapshot } from './api'
import { mapOnlineUsersToViewModel } from './onlineUsersModel'
import {
  ensureOnlineUsersSocketConnection,
  isOnlineUsersSocketMockMode,
  ONLINE_USERS_EVENT_NAME,
  startOnlineUsersMockBroadcast,
} from './onlineUsersSocket'
import type { OnlineUser, OnlineUsersEventPayload } from './types'

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

      setUsers(mapOnlineUsersToViewModel(payloadUsers))
      setIsLoading(false)
      setIsError(false)
    }

    // 소켓 연결 오류를 에러 상태로 반영
    const handleConnectError = () => {
      if (!isActive) {
        return
      }

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

    socket.on(ONLINE_USERS_EVENT_NAME, handleOnlineUsers)

    let stopMockBroadcast = () => {
      // no-op
    }

    // 목 모드에서는 일정 주기로 동일 데이터를 재전송
    if (isOnlineUsersSocketMockMode()) {
      stopMockBroadcast = startOnlineUsersMockBroadcast()
    } else {
      // 초기 진입 시 REST 스냅샷으로 첫 목록을 확보
      void getOnlineUsersSnapshot()
        .then((payloadUsers) => {
          if (!isActive) {
            return
          }

          setUsers(mapOnlineUsersToViewModel(payloadUsers))
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
      ensureOnlineUsersSocketConnection()
    }

    return () => {
      isActive = false
      socket.off(ONLINE_USERS_EVENT_NAME, handleOnlineUsers)
      socket.off('connect_error', handleConnectError)
      socket.off('disconnect', handleDisconnect)
      stopMockBroadcast()
    }
  }, [])

  return {
    data: users,
    isLoading,
    isError,
  }
}
