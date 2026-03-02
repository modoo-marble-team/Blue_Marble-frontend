import { apiClient } from '../../lib/axios'
import type { OnlineUserPayload } from './types'

// 접속자 목록 초기 스냅샷 응답 타입
interface OnlineUsersResponsePayload {
  users: OnlineUserPayload[]
}

// 전체 온라인 유저 목록 초기 스냅샷 조회
export async function getOnlineUsersSnapshot() {
  const { data } =
    await apiClient.get<OnlineUsersResponsePayload>('/users/online')

  return data.users
}
