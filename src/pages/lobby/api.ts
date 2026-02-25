import { apiClient } from '../../lib/axios'
import type { LobbyRoom } from './types'

interface LobbyRoomsResponse {
  rooms: LobbyRoom[]
}

export async function getLobbyRooms() {
  const { data } = await apiClient.get<LobbyRoomsResponse>('/lobby/rooms')
  return data.rooms
}
