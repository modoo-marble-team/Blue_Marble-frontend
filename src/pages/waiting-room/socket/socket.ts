import { connectSocketWithAuthIfNeeded, socket } from '../../../lib/socket'
import { IS_SOCKET_MOCK_ENABLED } from '../../../config/env'
import { normalizeChatMessage } from '../../../constants/chat'
import {
  mockEnterWaitingRoomSocket,
  mockLeaveWaitingRoomSocket,
  mockSendWaitingRoomChat,
} from './mockGateway'
import type {
  ChatEventPayload,
  EnterRoomSocketPayload,
  GameStartEventPayload,
  HostChangedEventPayload,
  LobbyUpdatedEventPayload,
  LeaveRoomSocketPayload,
  PlayerReadyEventPayload,
  RoomUpdatedEventPayload,
  SendChatSocketPayload,
} from '../api/types'

// 대기방 소켓 이벤트 이름 맵
const WAITING_ROOM_EVENT_NAMES = {
  enterRoom: 'enter_room',
  leaveRoom: 'leave_room',
  sendChat: 'send_chat',
  playerReady: 'player_ready',
  hostChanged: 'host_changed',
  chat: 'chat',
  gameStart: 'game_start',
  lobbyUpdated: 'lobby_updated',
  roomUpdated: 'room_updated',
} as const

const USE_WAITING_ROOM_SOCKET_MOCK = IS_SOCKET_MOCK_ENABLED

// 소켓 송신 함수 파라미터 타입
interface EnterWaitingRoomSocketParams {
  roomId: string
}

interface LeaveWaitingRoomSocketParams {
  roomId: string
}

interface SendWaitingRoomChatParams {
  roomId: string
  senderId: string
  senderNickname: string
  message: string
}

// 대기방 소켓 구독 핸들러 타입
interface WaitingRoomSocketHandlers {
  onPlayerReady: (payload: PlayerReadyEventPayload) => void
  onHostChanged: (payload: HostChangedEventPayload) => void
  onChat: (payload: ChatEventPayload) => void
  onGameStart: (payload: GameStartEventPayload) => void
  onLobbyUpdated: (payload: LobbyUpdatedEventPayload) => void
  onRoomUpdated: (payload: RoomUpdatedEventPayload) => void
}

// 실소켓 모드에서만 연결 상태를 확인해 connect 실행
function connectSocketIfNeeded() {
  if (USE_WAITING_ROOM_SOCKET_MOCK) {
    return
  }

  connectSocketWithAuthIfNeeded()
}

// 대기방에서 필요한 소켓 이벤트를 한 번에 구독
export function subscribeWaitingRoomSocketEvents(
  handlers: WaitingRoomSocketHandlers
) {
  socket.on(WAITING_ROOM_EVENT_NAMES.playerReady, handlers.onPlayerReady)
  socket.on(WAITING_ROOM_EVENT_NAMES.hostChanged, handlers.onHostChanged)
  socket.on(WAITING_ROOM_EVENT_NAMES.chat, handlers.onChat)
  socket.on(WAITING_ROOM_EVENT_NAMES.gameStart, handlers.onGameStart)
  socket.on(WAITING_ROOM_EVENT_NAMES.lobbyUpdated, handlers.onLobbyUpdated)
  socket.on(WAITING_ROOM_EVENT_NAMES.roomUpdated, handlers.onRoomUpdated)

  connectSocketIfNeeded()

  return () => {
    socket.off(WAITING_ROOM_EVENT_NAMES.playerReady, handlers.onPlayerReady)
    socket.off(WAITING_ROOM_EVENT_NAMES.hostChanged, handlers.onHostChanged)
    socket.off(WAITING_ROOM_EVENT_NAMES.chat, handlers.onChat)
    socket.off(WAITING_ROOM_EVENT_NAMES.gameStart, handlers.onGameStart)
    socket.off(WAITING_ROOM_EVENT_NAMES.lobbyUpdated, handlers.onLobbyUpdated)
    socket.off(WAITING_ROOM_EVENT_NAMES.roomUpdated, handlers.onRoomUpdated)
  }
}

// 대기방 입장 소켓 이벤트 송신
export function enterWaitingRoomSocket({
  roomId,
}: EnterWaitingRoomSocketParams) {
  // 목 모드에서는 게이트웨이 내부에서 별도 처리
  if (USE_WAITING_ROOM_SOCKET_MOCK) {
    mockEnterWaitingRoomSocket()
    return
  }

  connectSocketIfNeeded()
  const payload: EnterRoomSocketPayload = {
    room_id: roomId,
  }
  socket.emit(WAITING_ROOM_EVENT_NAMES.enterRoom, payload)
}

// 대기방 퇴장 소켓 이벤트 송신
export function leaveWaitingRoomSocket({
  roomId,
}: LeaveWaitingRoomSocketParams) {
  if (USE_WAITING_ROOM_SOCKET_MOCK) {
    mockLeaveWaitingRoomSocket()
    return
  }

  const payload: LeaveRoomSocketPayload = {
    room_id: roomId,
  }
  socket.emit(WAITING_ROOM_EVENT_NAMES.leaveRoom, payload)
}

// 대기방 채팅 메시지 소켓 이벤트 송신
export function sendWaitingRoomChat({
  roomId,
  senderId,
  senderNickname,
  message,
}: SendWaitingRoomChatParams) {
  const normalizedMessage = normalizeChatMessage(message)

  if (normalizedMessage.length === 0) {
    return
  }

  if (USE_WAITING_ROOM_SOCKET_MOCK) {
    mockSendWaitingRoomChat({
      roomId,
      senderId,
      senderNickname,
      message: normalizedMessage,
    })
    return
  }

  const payload: SendChatSocketPayload = {
    room_id: roomId,
    message: normalizedMessage,
  }
  socket.emit(WAITING_ROOM_EVENT_NAMES.sendChat, payload)
}
