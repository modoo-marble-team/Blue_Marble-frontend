import { apiClient } from '../../lib/axios'
import type { LobbyRoom, LobbyUser } from './types'

interface LobbyRoomsResponse {
  rooms: LobbyRoom[]
}

interface LobbyUsersResponse {
  users: LobbyUser[]
}

export async function getLobbyRooms() {
  const { data } = await apiClient.get<LobbyRoomsResponse>('/lobby/rooms')
  return data.rooms
}

export async function getLobbyUsers() {
  const { data } = await apiClient.get<LobbyUsersResponse>('/lobby/users')
  return data.users
}
