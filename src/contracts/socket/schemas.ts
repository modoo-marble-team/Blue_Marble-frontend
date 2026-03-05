import { z } from 'zod'
import { SOCKET_EVENTS } from './events'

// 사용자 상태 enum을 계약 스키마로 고정
export const contractUserStatusSchema = z.enum(['lobby', 'in_room', 'playing'])

export const contractOnlineUserSchema = z.object({
  id: z.string().min(1),
  nickname: z.string().min(1),
  status: contractUserStatusSchema,
})

export const onlineUsersEventSchema = z.object({
  users: z.array(contractOnlineUserSchema),
})

export const directMessageSendEventSchema = z.object({
  receiver_id: z.string().min(1),
  message: z.string().trim().min(1),
})

export const directMessageReceiveEventSchema = z.object({
  sender_id: z.string().min(1),
  sender_nickname: z.string().min(1),
  message: z.string().trim().min(1),
  sent_at: z.string().datetime(),
})

export const enterRoomEventSchema = z.object({
  room_id: z.string().min(1),
})

export const leaveRoomEventSchema = z.object({
  room_id: z.string().min(1),
})

export const sendChatEventSchema = z.object({
  room_id: z.string().min(1),
  message: z.string().trim().min(1),
})

export const toggleReadyEventSchema = z.object({
  room_id: z.string().min(1),
})

export const startGameEventSchema = z.object({
  room_id: z.string().min(1),
})

export const chatEventSchema = z.object({
  room_id: z.string().min(1),
  sender_id: z.string().min(1),
  sender_nickname: z.string().min(1),
  message: z.string().trim().min(1),
  sent_at: z.string().datetime(),
})

export const playerReadyEventSchema = z.object({
  player_id: z.string().min(1),
  is_ready: z.boolean(),
  all_ready: z.boolean(),
})

export const hostChangedEventSchema = z.object({
  new_host_id: z.string().min(1),
  new_host_nickname: z.string().min(1),
})

export const gameStartEventSchema = z.object({
  game_id: z.string().min(1),
  room_id: z.string().min(1),
})

export const eventPayloadSchemas = {
  [SOCKET_EVENTS.onlineUsers]: onlineUsersEventSchema,
  [SOCKET_EVENTS.enterRoom]: enterRoomEventSchema,
  [SOCKET_EVENTS.leaveRoom]: leaveRoomEventSchema,
  [SOCKET_EVENTS.sendChat]: sendChatEventSchema,
  [SOCKET_EVENTS.toggleReady]: toggleReadyEventSchema,
  [SOCKET_EVENTS.startGame]: startGameEventSchema,
  [SOCKET_EVENTS.chat]: chatEventSchema,
  [SOCKET_EVENTS.playerReady]: playerReadyEventSchema,
  [SOCKET_EVENTS.hostChanged]: hostChangedEventSchema,
  [SOCKET_EVENTS.directMessageSend]: directMessageSendEventSchema,
  [SOCKET_EVENTS.directMessageReceive]: directMessageReceiveEventSchema,
  [SOCKET_EVENTS.gameStart]: gameStartEventSchema,
} as const

// 이벤트 payload 검증 결과를 공통 형태로 반환
export function validateSocketEventPayload<T>(
  schema: z.ZodType<T>,
  payload: unknown
) {
  const parsed = schema.safeParse(payload)

  if (parsed.success) {
    return {
      success: true as const,
      data: parsed.data,
    }
  }

  return {
    success: false as const,
    error: {
      detail: 'Socket payload validation failed',
      code: 'INVALID_SOCKET_PAYLOAD',
      issues: parsed.error.issues.map((issue) => issue.message),
    },
  }
}
