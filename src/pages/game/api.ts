import { IS_SOCKET_MOCK_ENABLED } from '../../config/env'
import { getParsedApiErrorMessage, parseApiError } from '../../lib/apiError'
import { apiClient } from '../../lib/axios'
import { setMockOnlineUserStatus } from '../../features/presence/mock/mockData'

type LeaveGameResumeTarget = 'lobby' | 'room' | 'game'

interface LeaveGameResponsePayload {
  success: boolean
  room_id?: string | null
  resume_target?: LeaveGameResumeTarget | null
}

interface LeaveGameParams {
  gameId: string
  userId?: string
  nickname?: string
}

export interface LeaveGameResult {
  success: boolean
  roomId: string | null
  resumeTarget: LeaveGameResumeTarget
}

const USE_GAME_API_MOCK = IS_SOCKET_MOCK_ENABLED

export async function leaveGame({
  gameId,
  userId,
  nickname,
}: LeaveGameParams): Promise<LeaveGameResult> {
  if (USE_GAME_API_MOCK) {
    if (userId) {
      setMockOnlineUserStatus(String(userId), 'lobby', nickname)
    }

    return {
      success: true,
      roomId: null,
      resumeTarget: 'lobby',
    }
  }

  const { data } = await apiClient.post<LeaveGameResponsePayload>(
    `/games/${gameId}/leave`
  )

  return {
    success: data.success,
    roomId: data.room_id ?? null,
    resumeTarget: data.resume_target ?? 'lobby',
  }
}

export function getGameLeaveErrorMessage(
  error: unknown,
  fallbackMessage: string
) {
  return getParsedApiErrorMessage(parseApiError(error), fallbackMessage)
}
