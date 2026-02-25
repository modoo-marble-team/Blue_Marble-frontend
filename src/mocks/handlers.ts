import { delay, http, HttpResponse } from 'msw'
import { mockLobbyRooms, mockLobbyUsers } from '../features/lobby/mockData'
import { gameHandlers } from './handlers/game.handler'

export const handlers = [
  ...gameHandlers,
  http.get('/api/health', () => {
    return HttpResponse.json({ status: 'ok' })
  }),
  http.get('/api/lobby/rooms', async () => {
    await delay(250)
    return HttpResponse.json({ rooms: mockLobbyRooms })
  }),
  http.get('/api/lobby/users', async () => {
    await delay(250)
    return HttpResponse.json({ users: mockLobbyUsers })
  }),
]
