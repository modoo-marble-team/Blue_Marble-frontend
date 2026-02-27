import { apiClient } from '../../lib/axios'

export type GameActionErrorCode = 401 | 403 | 404 | 409 | 500

type GameActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: GameActionErrorCode | number; message: string }

const toErrorResult = (error: unknown): GameActionResult<never> => {
  const status =
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof (error as { response?: { status?: number } }).response?.status ===
      'number'
      ? (error as { response: { status: number } }).response.status
      : 500

  return {
    ok: false,
    status,
    message: '요청 처리 중 오류가 발생했습니다.',
  }
}

export const gameApi = {
  async getState() {
    try {
      const { data } = await apiClient.get('/game/state')
      return { ok: true, data } as const
    } catch (error) {
      return toErrorResult(error)
    }
  },

  // GAME-001
  async buyTile(payload: { tile_index: number }) {
    try {
      const { data } = await apiClient.post('/game/buy', payload)
      return { ok: true, data } as const
    } catch (error) {
      return toErrorResult(error)
    }
  },

  // GAME-002
  async buildTile(payload: { tile_index: number }) {
    try {
      const { data } = await apiClient.post('/game/build', payload)
      return { ok: true, data } as const
    } catch (error) {
      return toErrorResult(error)
    }
  },

  // GAME-003
  async sellTile(payload: { tile_index: number; level?: number }) {
    try {
      const { data } = await apiClient.post('/game/sell', payload)
      return { ok: true, data } as const
    } catch (error) {
      return toErrorResult(error)
    }
  },

  // GAME-004
  async syncState() {
    return this.getState()
  },
}

