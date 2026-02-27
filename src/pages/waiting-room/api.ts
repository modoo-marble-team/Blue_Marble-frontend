import { isAxiosError } from 'axios'
import { apiClient } from '../../lib/axios'
import {
  mockJoinWaitingRoom,
  mockLeaveWaitingRoom,
  mockStartWaitingGame,
  mockToggleWaitingReady,
  WaitingRoomMockError,
} from './mockGateway'
import type {
  JoinWaitingRoomResponsePayload,
  LeaveWaitingRoomResponsePayload,
  StartWaitingGameResponsePayload,
  ToggleWaitingReadyResponsePayload,
  WaitingRoomChatPayload,
  WaitingRoomPlayerPayload,
  WaitingRoomSnapshot,
} from './types'

const DEFAULT_WAITING_ROOM_TITLE = '즐거운 게임 한판!'
const DEFAULT_WAITING_ROOM_MAX_PLAYERS = 4
const USE_WAITING_ROOM_MOCK =
  import.meta.env.DEV && import.meta.env.VITE_USE_SOCKET_MOCK !== 'false'

interface JoinWaitingRoomParams {
  roomId: string
  userId: string
  nickname: string
  fallbackTitle?: string
  password?: string
}

interface LeaveWaitingRoomParams {
  roomId: string
  userId: string
}

interface ToggleWaitingReadyParams {
  roomId: string
  userId: string
}

interface StartWaitingGameParams {
  roomId: string
  userId: string
}

function mapRoomPlayer(payload: WaitingRoomPlayerPayload) {
  return {
    id: payload.id,
    nickname: payload.nickname,
    isReady: payload.is_ready,
    isHost: payload.is_host,
  }
}

function mapChatMessage(payload: WaitingRoomChatPayload) {
  return {
    id: payload.id,
    senderId: payload.sender_id,
    senderNickname: payload.sender_nickname,
    content: payload.message,
    timestamp: payload.sent_at,
    type: payload.type,
  }
}

function mapJoinResponse(
  payload: JoinWaitingRoomResponsePayload,
  fallbackTitle?: string
): WaitingRoomSnapshot {
  return {
    roomId: payload.room_id,
    title: payload.title || fallbackTitle || DEFAULT_WAITING_ROOM_TITLE,
    status: payload.status ?? 'waiting',
    maxPlayers: payload.max_players ?? DEFAULT_WAITING_ROOM_MAX_PLAYERS,
    isPrivate: payload.is_private ?? false,
    players: payload.players.map(mapRoomPlayer),
    chatMessages: (payload.chat_messages ?? []).map(mapChatMessage),
  }
}

export async function joinWaitingRoom({
  roomId,
  userId,
  nickname,
  fallbackTitle,
  password,
}: JoinWaitingRoomParams) {
  if (USE_WAITING_ROOM_MOCK) {
    return mockJoinWaitingRoom({
      roomId,
      userId,
      nickname,
      password,
    })
  }

  const requestBody = password ? { password } : undefined
  const { data } = await apiClient.post<JoinWaitingRoomResponsePayload>(
    `/rooms/${roomId}/join`,
    requestBody
  )

  return mapJoinResponse(data, fallbackTitle)
}

export async function leaveWaitingRoom({
  roomId,
  userId,
}: LeaveWaitingRoomParams) {
  if (USE_WAITING_ROOM_MOCK) {
    return mockLeaveWaitingRoom({
      roomId,
      userId,
    })
  }

  const { data } = await apiClient.post<LeaveWaitingRoomResponsePayload>(
    `/rooms/${roomId}/leave`
  )

  return {
    success: data.success,
    newHostId: data.new_host_id,
  }
}

export async function toggleWaitingReady({
  roomId,
  userId,
}: ToggleWaitingReadyParams) {
  if (USE_WAITING_ROOM_MOCK) {
    return mockToggleWaitingReady({
      roomId,
      userId,
    })
  }

  const { data } = await apiClient.patch<ToggleWaitingReadyResponsePayload>(
    `/rooms/${roomId}/ready`
  )

  return {
    isReady: data.is_ready,
  }
}

export async function startWaitingGame({
  roomId,
  userId,
}: StartWaitingGameParams) {
  if (USE_WAITING_ROOM_MOCK) {
    return mockStartWaitingGame({
      roomId,
      userId,
    })
  }

  const { data } = await apiClient.post<StartWaitingGameResponsePayload>(
    `/rooms/${roomId}/start`
  )

  return {
    success: data.success,
    gameId: data.game_id,
  }
}

export function getWaitingRoomErrorMessage(
  error: unknown,
  fallbackMessage: string
) {
  if (error instanceof WaitingRoomMockError) {
    return error.message
  }

  if (isAxiosError(error)) {
    const serverMessage = (
      error.response?.data as { message?: string } | undefined
    )?.message

    if (serverMessage) {
      return serverMessage
    }
  }

  if (error instanceof Error && error.message.length > 0) {
    return error.message
  }

  return fallbackMessage
}
