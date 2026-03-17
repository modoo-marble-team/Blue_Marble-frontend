import { apiClient } from '../../../lib/axios'
import type { OnlineUserPayload, OnlineUserStatus } from '../types'

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

// 전체 온라인 유저 목록 초기 스냅샷 조회
export async function getOnlineUsersSnapshot() {
  const { data } =
    await apiClient.get<OnlineUsersResponsePayload>('/users/online')

  return normalizeOnlineUsersPayload(data.users)
}
