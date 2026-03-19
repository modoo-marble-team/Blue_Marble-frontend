import { apiClient } from '../../../lib/axios'
import type {
  OnlineUserPayload,
  OnlineUserRealtimeStatus,
  OnlineUserStatus,
  OnlineUserStatusChangedEventPayload,
} from '../types'

// 접속자 목록 초기 스냅샷 응답 타입
interface OnlineUsersResponsePayload {
  users: unknown
}

type UnknownRecord = Record<string, unknown>
const ONLINE_USER_STATUS_VALUES: OnlineUserStatus[] = [
  'lobby',
  'in_room',
  'playing',
]
const ONLINE_USER_REALTIME_STATUS_VALUES: OnlineUserRealtimeStatus[] = [
  ...ONLINE_USER_STATUS_VALUES,
  'offline',
]

function toRecord(value: unknown): UnknownRecord | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null
  }

  return value as UnknownRecord
}

function normalizeOnlineUserStatus(value: unknown): OnlineUserStatus | null {
  if (
    typeof value !== 'string' ||
    !ONLINE_USER_STATUS_VALUES.includes(value as OnlineUserStatus)
  ) {
    return null
  }

  return value as OnlineUserStatus
}

function normalizeOnlineUserRealtimeStatus(
  value: unknown
): OnlineUserRealtimeStatus | null {
  if (
    typeof value !== 'string' ||
    !ONLINE_USER_REALTIME_STATUS_VALUES.includes(
      value as OnlineUserRealtimeStatus
    )
  ) {
    return null
  }

  return value as OnlineUserRealtimeStatus
}

function normalizeOnlineUserPayload(value: unknown): OnlineUserPayload | null {
  const record = toRecord(value)
  if (!record) {
    return null
  }

  const id = record.id
  const nickname = record.nickname
  const status = normalizeOnlineUserStatus(record.status)

  if (
    (typeof id !== 'string' && typeof id !== 'number') ||
    typeof nickname !== 'string' ||
    nickname.trim().length === 0 ||
    !status
  ) {
    return null
  }

  return {
    id: String(id),
    nickname: nickname.trim(),
    status,
  }
}

export function normalizeOnlineUsersPayload(payloadUsers: unknown) {
  if (!Array.isArray(payloadUsers)) {
    return []
  }

  return payloadUsers.flatMap((user) => {
    const normalizedUser = normalizeOnlineUserPayload(user)
    return normalizedUser ? [normalizedUser] : []
  })
}

export function normalizeOnlineUserStatusChangedPayload(
  payload: unknown
): OnlineUserStatusChangedEventPayload | null {
  const record = toRecord(payload)
  if (!record) {
    return null
  }

  const id = record.id
  const nickname = record.nickname
  const status = normalizeOnlineUserRealtimeStatus(record.status)

  if (
    (typeof id !== 'string' && typeof id !== 'number') ||
    typeof nickname !== 'string' ||
    nickname.trim().length === 0 ||
    !status
  ) {
    return null
  }

  return {
    id: String(id),
    nickname: nickname.trim(),
    status,
  }
}

// 전체 온라인 유저 목록 초기 스냅샷 조회
export async function getOnlineUsersSnapshot() {
  const { data } =
    await apiClient.get<OnlineUsersResponsePayload>('/users/online')

  return normalizeOnlineUsersPayload(data.users)
}
