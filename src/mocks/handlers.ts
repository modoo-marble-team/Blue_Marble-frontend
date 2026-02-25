import { delay, http, HttpResponse } from 'msw'
import { mockOnlineUsers } from '../features/presence/mockData'
import { mockLobbyRooms } from '../pages/lobby/mockData'
import type { LobbyRoomPayload, LobbyRoomStatus } from '../pages/lobby/types'
import { gameHandlers } from './handlers/game.handler'

function mapLobbyRoomPayload(
  room: (typeof mockLobbyRooms)[number]
): LobbyRoomPayload {
  return {
    id: room.id,
    title: room.title,
    status: room.status,
    current_players: room.currentPlayers,
    max_players: room.maxPlayers,
    is_private: room.isPrivate,
  }
}

export const handlers = [
  ...gameHandlers,
  http.get('/api/health', () => {
    return HttpResponse.json({ status: 'ok' })
  }),
  http.get('/api/rooms', async ({ request }) => {
    const url = new URL(request.url)
    const status = url.searchParams.get('status') as LobbyRoomStatus | null
    const excludePrivate = url.searchParams.get('exclude_private') === 'true'
    const keyword = (url.searchParams.get('keyword') ?? '').trim().toLowerCase()

    const filteredRooms = mockLobbyRooms.filter((room) => {
      if (status && room.status !== status) {
        return false
      }

      if (excludePrivate && room.isPrivate) {
        return false
      }

      if (keyword.length > 0 && !room.title.toLowerCase().includes(keyword)) {
        return false
      }

      return true
    })

    await delay(250)
    return HttpResponse.json({
      rooms: filteredRooms.map(mapLobbyRoomPayload),
    })
  }),
  http.get('/api/lobby/users', async () => {
    await delay(250)
    return HttpResponse.json({ users: mockOnlineUsers })
  }),
]
