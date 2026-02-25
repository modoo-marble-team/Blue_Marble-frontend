import { apiClient } from '../../lib/axios'
import type { OnlineUser } from './types'

interface OnlineUsersResponse {
  users: OnlineUser[]
}

export async function getOnlineUsers() {
  const { data } = await apiClient.get<OnlineUsersResponse>('/lobby/users')
  return data.users
}
