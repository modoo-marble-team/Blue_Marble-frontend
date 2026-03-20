import { IS_SOCKET_MOCK_ENABLED } from '../../config/env'
import { getParsedApiErrorMessage, parseApiError } from '../../lib/apiError'
import { apiClient } from '../../lib/axios'
import { mockLeaveWaitingRoom } from '../waiting-room/socket/mockGateway'

interface LeaveRoomResponsePayload {
  success: boolean
  new_host_id?: string | null
}

interface LeaveRoomFromGameParams {
  roomId: string
  userId?: string
}

export interface LeaveRoomFromGameResult {
  success: boolean
  newHostId: string | null
}

const USE_GAME_API_MOCK = IS_SOCKET_MOCK_ENABLED

export async function leaveRoomFromGame({
  roomId,
  userId,
}: LeaveRoomFromGameParams): Promise<LeaveRoomFromGameResult> {
  if (USE_GAME_API_MOCK) {
    if (!userId) {
      throw new Error('게임 room leave mock 경로에는 userId가 필요합니다.')
    }

    const result = await mockLeaveWaitingRoom({
      roomId,
      userId,
    })

    return {
      success: result.success,
      newHostId: result.newHostId ?? null,
    }
  }

  const { data } = await apiClient.post<LeaveRoomResponsePayload>(
    `/rooms/${roomId}/leave`
  )

  return {
    success: data.success,
    newHostId: data.new_host_id ?? null,
  }
}

export function getGameLeaveErrorMessage(
  error: unknown,
  fallbackMessage: string
) {
  return getParsedApiErrorMessage(parseApiError(error), fallbackMessage)
}
