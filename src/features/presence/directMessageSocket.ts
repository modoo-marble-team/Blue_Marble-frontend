import { socket } from '../../lib/socket'
import type {
  DirectMessageReceiveSocketPayload,
  DirectMessageSendSocketPayload,
} from './types'

const DIRECT_MESSAGE_EVENT_NAMES = {
  send: 'dm_send',
  receive: 'dm_receive',
} as const

const USE_SOCKET_MOCK =
  import.meta.env.DEV && import.meta.env.VITE_USE_SOCKET_MOCK !== 'false'
const MOCK_REPLY_DELAY_MS = 700

interface SendDirectMessageParams {
  receiverId: string
  receiverNickname: string
  message: string
}

interface SubscribeDirectMessageSocketParams {
  onReceive: (payload: DirectMessageReceiveSocketPayload) => void
}

interface SocketWithListeners {
  listeners: (
    eventName: string
  ) => Array<(payload: DirectMessageReceiveSocketPayload) => void>
}

function connectSocketIfNeeded() {
  if (USE_SOCKET_MOCK) {
    return
  }

  if (!socket.connected) {
    socket.connect()
  }
}

function emitDirectMessageReceiveMock(
  payload: DirectMessageReceiveSocketPayload
) {
  const socketWithListeners = socket as unknown as SocketWithListeners
  const listeners = socketWithListeners.listeners(
    DIRECT_MESSAGE_EVENT_NAMES.receive
  )

  listeners.forEach((listener) => {
    listener(payload)
  })
}

function buildMockReplyMessage(originalMessage: string) {
  const shortMessage =
    originalMessage.length > 18
      ? `${originalMessage.slice(0, 18)}...`
      : originalMessage

  return `확인했어요: ${shortMessage}`
}

export function subscribeDirectMessageSocketEvents({
  onReceive,
}: SubscribeDirectMessageSocketParams) {
  socket.on(DIRECT_MESSAGE_EVENT_NAMES.receive, onReceive)
  connectSocketIfNeeded()

  return () => {
    socket.off(DIRECT_MESSAGE_EVENT_NAMES.receive, onReceive)
  }
}

export function sendDirectMessage({
  receiverId,
  receiverNickname,
  message,
}: SendDirectMessageParams) {
  const normalizedMessage = message.trim()

  if (normalizedMessage.length === 0) {
    return
  }

  if (USE_SOCKET_MOCK) {
    window.setTimeout(() => {
      emitDirectMessageReceiveMock({
        sender_id: receiverId,
        sender_nickname: receiverNickname,
        message: buildMockReplyMessage(normalizedMessage),
        sent_at: new Date().toISOString(),
      })
    }, MOCK_REPLY_DELAY_MS)

    return
  }

  connectSocketIfNeeded()

  const payload: DirectMessageSendSocketPayload = {
    receiver_id: receiverId,
    message: normalizedMessage,
  }

  socket.emit(DIRECT_MESSAGE_EVENT_NAMES.send, payload)
}
