import { http, HttpResponse } from 'msw'
import { gameHandlers } from './handlers/game.handler'

export const handlers = [
  ...gameHandlers,
  http.get('/api/health', () => {
    return HttpResponse.json({ status: 'ok' })
  }),
]
