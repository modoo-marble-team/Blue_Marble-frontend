import type { ChatMessage } from '../../types/domain'
import type { ChatEventPayload } from '../waiting-room/api/types'

const LOCAL_GAME_CHAT_ID_PREFIX = 'local-game-chat'
const PENDING_GAME_CHAT_TTL_MS = 30_000

export interface PendingGameChatEcho {
  id: string
  senderId: string
  content: string
  createdAtMs: number
}

export function mapGameChatEventToMessage(
  payload: ChatEventPayload
): ChatMessage {
  return {
    id: `${payload.room_id}-${payload.sender_id}-${payload.sent_at}`,
    sender_id: payload.sender_id,
    sender_nickname: payload.sender_nickname,
    content: payload.message,
    timestamp: payload.sent_at,
    type: 'talk',
  }
}

export function createOptimisticGameChatMessage(params: {
  roomId: string
  senderId: string
  senderNickname: string
  message: string
  now?: Date
}): ChatMessage {
  const now = params.now ?? new Date()

  return {
    id: `${LOCAL_GAME_CHAT_ID_PREFIX}:${params.roomId}:${params.senderId}:${now.getTime()}`,
    sender_id: params.senderId,
    sender_nickname: params.senderNickname,
    content: params.message,
    timestamp: now.toISOString(),
    type: 'talk',
  }
}

const isLocalGameChatId = (messageId: string) =>
  messageId.startsWith(`${LOCAL_GAME_CHAT_ID_PREFIX}:`)

export function prunePendingGameChatEchoes(
  pendingEchoes: PendingGameChatEcho[],
  nowMs: number = Date.now()
) {
  return pendingEchoes.filter(
    (pendingEcho) => nowMs - pendingEcho.createdAtMs <= PENDING_GAME_CHAT_TTL_MS
  )
}

export function consumePendingGameChatEcho(params: {
  pendingEchoes: PendingGameChatEcho[]
  incomingMessage: ChatMessage
  currentUserId: string | null
  nowMs?: number
}) {
  const nowMs = params.nowMs ?? Date.now()
  const prunedPendingEchoes = prunePendingGameChatEchoes(
    params.pendingEchoes,
    nowMs
  )

  if (
    params.currentUserId == null ||
    String(params.incomingMessage.sender_id) !== String(params.currentUserId)
  ) {
    return {
      matchedPendingId: null,
      pendingEchoes: prunedPendingEchoes,
    }
  }

  const matchedPendingEcho = prunedPendingEchoes.find(
    (pendingEcho) =>
      String(pendingEcho.senderId) === String(params.currentUserId) &&
      pendingEcho.content === params.incomingMessage.content
  )

  if (!matchedPendingEcho) {
    return {
      matchedPendingId: null,
      pendingEchoes: prunedPendingEchoes,
    }
  }

  return {
    matchedPendingId: matchedPendingEcho.id,
    pendingEchoes: prunedPendingEchoes.filter(
      (pendingEcho) => pendingEcho.id !== matchedPendingEcho.id
    ),
  }
}

export function reconcileGameChatMessages(params: {
  previousMessages: ChatMessage[]
  incomingMessage: ChatMessage
  matchedPendingId?: string | null
}) {
  const hasSameServerMessage = params.previousMessages.some(
    (message) => message.id === params.incomingMessage.id
  )

  if (hasSameServerMessage) {
    return params.previousMessages
  }

  if (!params.matchedPendingId) {
    return [...params.previousMessages, params.incomingMessage]
  }

  return params.previousMessages.map((message) =>
    message.id === params.matchedPendingId &&
    isLocalGameChatId(message.id) &&
    message.content === params.incomingMessage.content
      ? params.incomingMessage
      : message
  )
}
