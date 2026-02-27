import { socket } from '../../lib/socket'
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
  LeaveRoomSocketPayload,
  PlayerReadyEventPayload,
  SendChatSocketPayload,
} from './types'

const WAITING_ROOM_EVENT_NAMES = {
  enterRoom: 'enter_room',
  leaveRoom: 'leave_room',
  sendChat: 'send_chat',
  playerReady: 'player_ready',
  hostChanged: 'host_changed',
  chat: 'chat',
  gameStart: 'game_start',
} as const

const USE_WAITING_ROOM_SOCKET_MOCK =
  import.meta.env.DEV && import.meta.env.VITE_USE_SOCKET_MOCK !== 'false'

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

interface WaitingRoomSocketHandlers {
  onPlayerReady: (payload: PlayerReadyEventPayload) => void
  onHostChanged: (payload: HostChangedEventPayload) => void
  onChat: (payload: ChatEventPayload) => void
  onGameStart: (payload: GameStartEventPayload) => void
}

function connectSocketIfNeeded() {
  if (USE_WAITING_ROOM_SOCKET_MOCK) {
    return
  }

  if (!socket.connected) {
    socket.connect()
  }
}

export function subscribeWaitingRoomSocketEvents(
  handlers: WaitingRoomSocketHandlers
) {
  socket.on(WAITING_ROOM_EVENT_NAMES.playerReady, handlers.onPlayerReady)
  socket.on(WAITING_ROOM_EVENT_NAMES.hostChanged, handlers.onHostChanged)
  socket.on(WAITING_ROOM_EVENT_NAMES.chat, handlers.onChat)
  socket.on(WAITING_ROOM_EVENT_NAMES.gameStart, handlers.onGameStart)

  connectSocketIfNeeded()

  return () => {
    socket.off(WAITING_ROOM_EVENT_NAMES.playerReady, handlers.onPlayerReady)
    socket.off(WAITING_ROOM_EVENT_NAMES.hostChanged, handlers.onHostChanged)
    socket.off(WAITING_ROOM_EVENT_NAMES.chat, handlers.onChat)
    socket.off(WAITING_ROOM_EVENT_NAMES.gameStart, handlers.onGameStart)
  }
}

export function enterWaitingRoomSocket({
  roomId,
}: EnterWaitingRoomSocketParams) {
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

export function sendWaitingRoomChat({
  roomId,
  senderId,
  senderNickname,
  message,
}: SendWaitingRoomChatParams) {
  if (USE_WAITING_ROOM_SOCKET_MOCK) {
    mockSendWaitingRoomChat({
      roomId,
      senderId,
      senderNickname,
      message,
    })
    return
  }

  const payload: SendChatSocketPayload = {
    room_id: roomId,
    message,
  }
  socket.emit(WAITING_ROOM_EVENT_NAMES.sendChat, payload)
}
