import { socket } from '../../lib/socket'
import type {
  DirectMessageReceiveSocketPayload,
  DirectMessageSendSocketPayload,
} from './types'

// DM 송수신 소켓 이벤트 이름 맵
const DIRECT_MESSAGE_EVENT_NAMES = {
  send: 'dm_send',
  receive: 'dm_receive',
} as const

const USE_SOCKET_MOCK =
  import.meta.env.DEV && import.meta.env.VITE_USE_SOCKET_MOCK !== 'false'
const MOCK_REPLY_DELAY_MS = 700

// DM 전송 함수 입력값 타입
interface SendDirectMessageParams {
  receiverId: string
  receiverNickname: string
  message: string
}

// DM 수신 구독 함수 입력값 타입
interface SubscribeDirectMessageSocketParams {
  onReceive: (payload: DirectMessageReceiveSocketPayload) => void
}

// 목 이벤트 전송을 위한 socket listeners 접근 타입
interface SocketWithListeners {
  listeners: (
    eventName: string
  ) => Array<(payload: DirectMessageReceiveSocketPayload) => void>
}

// 실제 소켓 모드에서만 연결 상태를 확인해 connect 실행
function connectSocketIfNeeded() {
  if (USE_SOCKET_MOCK) {
    return
  }

  // 연결이 닫혀 있으면 재연결 시도
  if (!socket.connected) {
    socket.connect()
  }
}

// 목 모드에서 DM 수신 이벤트를 리스너에 직접 전파
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

// 목 자동응답 메시지를 길이 제한해 생성
function buildMockReplyMessage(originalMessage: string) {
  const shortMessage =
    originalMessage.length > 18
      ? `${originalMessage.slice(0, 18)}...`
      : originalMessage

  return `확인했어요: ${shortMessage}`
}

// DM 수신 이벤트를 구독하고 해제 함수를 반환
export function subscribeDirectMessageSocketEvents({
  onReceive,
}: SubscribeDirectMessageSocketParams) {
  socket.on(DIRECT_MESSAGE_EVENT_NAMES.receive, onReceive)
  connectSocketIfNeeded()

  return () => {
    socket.off(DIRECT_MESSAGE_EVENT_NAMES.receive, onReceive)
  }
}

// DM 메시지를 소켓으로 전송하거나 목 응답을 생성
export function sendDirectMessage({
  receiverId,
  receiverNickname,
  message,
}: SendDirectMessageParams) {
  const normalizedMessage = message.trim()

  // 공백 메시지는 전송하지 않음
  if (normalizedMessage.length === 0) {
    return
  }

  // 목 모드에서는 일정 지연 후 자동 회신을 생성
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
