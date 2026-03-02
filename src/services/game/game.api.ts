import { apiClient } from '../../lib/axios'

export type GameActionErrorCode = 401 | 403 | 404 | 409 | 500

type ErrorResponse = {
  status?: number
  data?: {
    message?: string
  }
}

type GameActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: GameActionErrorCode | number; message: string }

const DEFAULT_ERROR_MESSAGE = '요청 처리 중 오류가 발생했습니다.'

const toErrorResult = (error: unknown): GameActionResult<never> => {
  const response =
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof (error as { response?: unknown }).response === 'object'
      ? ((error as { response?: ErrorResponse }).response ?? undefined)
      : undefined

  const status = typeof response?.status === 'number' ? response.status : 500

  const message =
    typeof response?.data?.message === 'string' && response.data.message.trim()
      ? response.data.message
      : DEFAULT_ERROR_MESSAGE

  return {
    ok: false,
    status,
    message,
  }
}

const buildGamePath = (roomId: string, action?: string) => {
  const encodedRoomId = encodeURIComponent(roomId)
  return action
    ? `/game/${encodedRoomId}/${action}`
    : `/game/${encodedRoomId}/state`
}

export const gameApi = {
  async getState(roomId: string, options?: { reset?: boolean }) {
    try {
      const { data } = await apiClient.get(buildGamePath(roomId), {
        params: options?.reset ? { reset: 'true' } : undefined,
      })
      return { ok: true, data } as const
    } catch (error) {
      return toErrorResult(error)
    }
  },

  // GAME-001
  async buyTile(roomId: string, payload: { tile_index: number }) {
    try {
      const { data } = await apiClient.post(
        buildGamePath(roomId, 'buy'),
        payload
      )
      return { ok: true, data } as const
    } catch (error) {
      return toErrorResult(error)
    }
  },

  // GAME-002
  async buildTile(roomId: string, payload: { tile_index: number }) {
    try {
      const { data } = await apiClient.post(
        buildGamePath(roomId, 'build'),
        payload
      )
      return { ok: true, data } as const
    } catch (error) {
      return toErrorResult(error)
    }
  },

  // GAME-003
  async sellTile(
    roomId: string,
    payload: { tile_index: number; level?: number }
  ) {
    try {
      const { data } = await apiClient.post(
        buildGamePath(roomId, 'sell'),
        payload
      )
      return { ok: true, data } as const
    } catch (error) {
      return toErrorResult(error)
    }
  },

  // GAME-004
  async syncState(roomId: string, options?: { reset?: boolean }) {
    return this.getState(roomId, options)
  },
}
