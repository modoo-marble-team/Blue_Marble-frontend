import { apiClient } from '../../lib/axios'

export type GameActionErrorCode = 401 | 403 | 404 | 409 | 500

type GameActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: GameActionErrorCode | number; message: string }

type ErrorLike = {
  response?: {
    status?: number
    data?: {
      message?: string
    }
  }
}

const toErrorResult = (error: unknown): GameActionResult<never> => {
  const errorLike =
    typeof error === 'object' && error !== null ? (error as ErrorLike) : {}

  return {
    ok: false,
    status: errorLike.response?.status ?? 500,
    message:
      errorLike.response?.data?.message ?? '요청 처리 중 오류가 발생했습니다.',
  }
}

const buildGamePath = (roomId: string, action?: string) => {
  const encodedRoomId = encodeURIComponent(roomId)
  return action
    ? `/game/${encodedRoomId}/${action}`
    : `/game/${encodedRoomId}/state`
}

export const gameApi = {
  async getState(roomId: string) {
    try {
      const { data } = await apiClient.get(buildGamePath(roomId))
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
  async syncState(roomId: string) {
    return this.getState(roomId)
  },
}
