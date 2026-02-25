import { apiClient } from '../../lib/axios'
import type { LobbyRoom, LobbyRoomPayload, LobbyRoomStatus } from './types'

interface LobbyRoomsResponse {
  rooms: LobbyRoomPayload[]
}

export type LobbyRoomFilter = 'ALL' | LobbyRoomStatus

export interface GetLobbyRoomsParams {
  searchRoom: string
  roomFilter: LobbyRoomFilter
  excludePrivateRoom: boolean
}

function mapLobbyRoom(payload: LobbyRoomPayload): LobbyRoom {
  return {
    id: payload.id,
    title: payload.title,
    status: payload.status,
    currentPlayers: payload.current_players,
    maxPlayers: payload.max_players,
    isPrivate: payload.is_private,
  }
}

function buildLobbyRoomsQuery(params: GetLobbyRoomsParams) {
  const query: Record<string, string> = {}
  const normalizedKeyword = params.searchRoom.trim()

  if (params.roomFilter !== 'ALL') {
    query.status = params.roomFilter
  }

  if (params.excludePrivateRoom) {
    query.exclude_private = 'true'
  }

  if (normalizedKeyword.length > 0) {
    query.keyword = normalizedKeyword
  }

  return query
}

export async function getLobbyRooms(params: GetLobbyRoomsParams) {
  const { data } = await apiClient.get<LobbyRoomsResponse>('/rooms', {
    params: buildLobbyRoomsQuery(params),
  })

  return data.rooms.map(mapLobbyRoom)
}
