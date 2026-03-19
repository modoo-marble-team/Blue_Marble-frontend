import { useEffect, useState } from 'react'
import { socket } from '../../../lib/socket'
import {
  getOnlineUsersSnapshot,
  normalizeOnlineUserStatusChangedPayload,
  normalizeOnlineUsersPayload,
} from './api'
import {
  getOnlineUserAvatarBackground,
  getOnlineUserAvatarText,
  mapOnlineUsersToViewModel,
} from './onlineUsersModel'
import {
  ensureOnlineUsersSocketConnection,
  ONLINE_USER_STATUS_CHANGED_EVENT_NAME,
  isOnlineUsersSocketMockMode,
  ONLINE_USERS_EVENT_NAME,
  ONLINE_USERS_REFRESH_REQUEST_EVENT_NAME,
  startOnlineUsersMockBroadcast,
} from './onlineUsersSocket'
import type {
  OnlineUser,
  OnlineUsersEventPayload,
  OnlineUserStatusChangedEventPayload,
} from '../types'

interface OnlineUsersSyncState {
  latestSnapshotRequestId: number
  latestUsersCount: number
}

function readOnlineUsersEventPayloadUsers(payload: unknown) {
  if (!payload || typeof payload !== 'object' || !('users' in payload)) {
    return []
  }

  return (payload as { users: unknown }).users
}

function createOnlineUsersSyncState(): OnlineUsersSyncState {
  return {
    latestSnapshotRequestId: 0,
    latestUsersCount: 0,
  }
}

function startSnapshotRequest(syncState: OnlineUsersSyncState) {
  syncState.latestSnapshotRequestId += 1
  return syncState.latestSnapshotRequestId
}

function invalidatePendingSnapshotResults(syncState: OnlineUsersSyncState) {
  syncState.latestSnapshotRequestId += 1
}

function isStaleSnapshotResult(
  syncState: OnlineUsersSyncState,
  requestId: number
) {
  return requestId !== syncState.latestSnapshotRequestId
}

function applyOnlineUsersState(
  syncState: OnlineUsersSyncState,
  nextUsers: OnlineUser[],
  setUsers: (users: OnlineUser[]) => void,
  setIsLoading: (isLoading: boolean) => void,
  setIsError: (isError: boolean) => void
) {
  syncState.latestUsersCount = nextUsers.length
  setUsers(nextUsers)
  setIsLoading(false)
  setIsError(false)
}

function mapOnlineUsersEventPayloadToViewModel(
  payload: OnlineUsersEventPayload | unknown
) {
  return mapOnlineUsersToViewModel(
    normalizeOnlineUsersPayload(readOnlineUsersEventPayloadUsers(payload))
  )
}

function applyOnlineUserStatusChangedEvent(
  previousUsers: OnlineUser[],
  payload: OnlineUserStatusChangedEventPayload | unknown
) {
  const normalizedPayload = normalizeOnlineUserStatusChangedPayload(payload)

  if (!normalizedPayload) {
    return previousUsers
  }

  if (normalizedPayload.status === 'offline') {
    return previousUsers.filter((user) => user.id !== normalizedPayload.id)
  }

  const nextUsersById = new Map<string, OnlineUser>(
    previousUsers.map((user) => [user.id, user])
  )

  nextUsersById.set(normalizedPayload.id, {
    id: normalizedPayload.id,
    nickname: normalizedPayload.nickname,
    status: normalizedPayload.status,
    avatarText: getOnlineUserAvatarText(normalizedPayload.nickname),
    avatarBackground: getOnlineUserAvatarBackground(normalizedPayload.id),
  })

  return Array.from(nextUsersById.values())
}

function applyReconnectPendingState(
  syncState: OnlineUsersSyncState,
  setIsLoading: (isLoading: boolean) => void,
  setIsError: (isError: boolean) => void
) {
  if (syncState.latestUsersCount === 0) {
    setIsLoading(true)
  }

  setIsError(false)
}

function clearTransientSocketError(
  setIsLoading: (isLoading: boolean) => void,
  setIsError: (isError: boolean) => void
) {
  setIsLoading(false)
  setIsError(false)
}

// 접속자 목록 소켓 구독과 로딩/에러 상태를 관리
export function useOnlineUsersSocket() {
  const [users, setUsers] = useState<OnlineUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isError, setIsError] = useState(false)

  useEffect(() => {
    let isActive = true
    const syncState = createOnlineUsersSyncState()

    const applyNextUsers = (nextUsers: OnlineUser[]) => {
      applyOnlineUsersState(
        syncState,
        nextUsers,
        setUsers,
        setIsLoading,
        setIsError
      )
    }

    const updateUsers = (
      updater: (previousUsers: OnlineUser[]) => OnlineUser[]
    ) => {
      setUsers((previousUsers) => {
        const nextUsers = updater(previousUsers)
        syncState.latestUsersCount = nextUsers.length
        return nextUsers
      })
      setIsLoading(false)
      setIsError(false)
    }

    async function syncOnlineUsersSnapshot() {
      const requestId = startSnapshotRequest(syncState)

      try {
        const payloadUsers = await getOnlineUsersSnapshot()
        if (!isActive || isStaleSnapshotResult(syncState, requestId)) {
          return
        }

        applyNextUsers(mapOnlineUsersToViewModel(payloadUsers))
      } catch {
        // REST 초기화 실패 시 소켓 실시간 수신으로 복구를 시도
        if (!isActive || isStaleSnapshotResult(syncState, requestId)) {
          return
        }

        setIsLoading(false)
      }
    }

    // 접속자 이벤트 수신 시 목록과 상태를 갱신
    const handleOnlineUsers = (payload: OnlineUsersEventPayload | unknown) => {
      if (!isActive) {
        return
      }

      // 실시간 이벤트를 먼저 반영했으면, 이미 진행 중이던 이전 snapshot 응답이
      // 늦게 도착해도 최신 접속자 목록을 다시 덮어쓰지 못하게 막는다.
      invalidatePendingSnapshotResults(syncState)
      applyNextUsers(mapOnlineUsersEventPayloadToViewModel(payload))
    }

    const handleUserStatusChanged = (
      payload: OnlineUserStatusChangedEventPayload | unknown
    ) => {
      if (!isActive) {
        return
      }

      invalidatePendingSnapshotResults(syncState)
      updateUsers((previousUsers) =>
        applyOnlineUserStatusChangedEvent(previousUsers, payload)
      )
    }

    // 새로고침/재인증 경계의 connect_error는 일시 상태일 수 있어 즉시 hard error로 노출하지 않는다.
    const handleConnectError = () => {
      if (!isActive) {
        return
      }

      clearTransientSocketError(setIsLoading, setIsError)
    }

    // 실제 연결 성공 뒤 최신 snapshot을 다시 읽어 현재 사용자 포함 여부를 맞춘다
    const handleConnect = () => {
      if (!isActive) {
        return
      }

      void syncOnlineUsersSnapshot()
    }

    // room enter/refresh 같은 로컬 상태 변화 직후 snapshot 재동기화를 허용
    const handleRefreshRequest = () => {
      if (!isActive || isOnlineUsersSocketMockMode()) {
        return
      }

      void syncOnlineUsersSnapshot()
    }

    // 새로고침/재연결 중 disconnect는 hard error 대신 재동기화 대기 상태로 처리
    const handleDisconnect = () => {
      if (!isActive) {
        return
      }

      applyReconnectPendingState(syncState, setIsLoading, setIsError)
    }

    socket.on(ONLINE_USERS_EVENT_NAME, handleOnlineUsers)
    socket.on(ONLINE_USER_STATUS_CHANGED_EVENT_NAME, handleUserStatusChanged)

    let stopMockBroadcast = () => {
      // no-op
    }

    // 목 모드에서는 일정 주기로 동일 데이터를 재전송
    if (isOnlineUsersSocketMockMode()) {
      stopMockBroadcast = startOnlineUsersMockBroadcast()
    } else {
      // 실제 소켓 모드에서는 연결 오류/끊김 이벤트를 구독
      socket.on('connect', handleConnect)
      socket.on('connect_error', handleConnectError)
      socket.on('disconnect', handleDisconnect)
      ensureOnlineUsersSocketConnection()
      // 초기 진입 시 REST 스냅샷으로 첫 목록을 확보
      void syncOnlineUsersSnapshot()
    }

    if (typeof window !== 'undefined') {
      window.addEventListener(
        ONLINE_USERS_REFRESH_REQUEST_EVENT_NAME,
        handleRefreshRequest
      )
    }

    return () => {
      isActive = false
      socket.off(ONLINE_USERS_EVENT_NAME, handleOnlineUsers)
      socket.off(ONLINE_USER_STATUS_CHANGED_EVENT_NAME, handleUserStatusChanged)
      socket.off('connect', handleConnect)
      socket.off('connect_error', handleConnectError)
      socket.off('disconnect', handleDisconnect)
      if (typeof window !== 'undefined') {
        window.removeEventListener(
          ONLINE_USERS_REFRESH_REQUEST_EVENT_NAME,
          handleRefreshRequest
        )
      }
      stopMockBroadcast()
    }
  }, [])

  return {
    data: users,
    isLoading,
    isError,
  }
}
