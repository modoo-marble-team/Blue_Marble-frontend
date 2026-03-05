// 소켓 도메인 이벤트 이름을 단일 상수로 관리
export const SOCKET_EVENTS = {
  onlineUsers: 'online_users',
  enterRoom: 'enter_room',
  leaveRoom: 'leave_room',
  sendChat: 'send_chat',
  toggleReady: 'toggle_ready',
  startGame: 'start_game',
  chat: 'chat',
  playerReady: 'player_ready',
  hostChanged: 'host_changed',
  gameStart: 'game_start',
  directMessageSend: 'dm_send',
  directMessageReceive: 'dm_receive',
  gameAction: 'game:action',
  gameAck: 'game:ack',
  gamePatch: 'game:patch',
  gamePrompt: 'game:prompt',
  gameError: 'game:error',
  gameSync: 'game:sync',
  gamePromptResponse: 'game:prompt_response',
} as const

export type SocketEventName = (typeof SOCKET_EVENTS)[keyof typeof SOCKET_EVENTS]

// 접속 상태 표현은 정의서 기준 값으로 고정
export type ContractUserStatus = 'lobby' | 'in_room' | 'playing'

// 접속자 목록 기본 모델
export interface ContractOnlineUser {
  id: string
  nickname: string
  status: ContractUserStatus
}

export interface OnlineUsersEventPayload {
  users: ContractOnlineUser[]
}

// 1:1 DM 이벤트 모델
export interface DirectMessageSendEventPayload {
  receiver_id: string
  message: string
}

export interface DirectMessageReceiveEventPayload {
  sender_id: string
  sender_nickname: string
  message: string
  sent_at: string
}

// 대기방 주요 이벤트 모델
export interface EnterRoomEventPayload {
  room_id: string
}

export interface LeaveRoomEventPayload {
  room_id: string
}

export interface SendChatEventPayload {
  room_id: string
  message: string
}

export interface ToggleReadyEventPayload {
  room_id: string
}

export interface StartGameEventPayload {
  room_id: string
}

export interface ChatEventPayload {
  room_id: string
  sender_id: string
  sender_nickname: string
  message: string
  sent_at: string
}

export interface PlayerReadyEventPayload {
  player_id: string
  is_ready: boolean
  all_ready: boolean
}

export interface HostChangedEventPayload {
  new_host_id: string
  new_host_nickname: string
}

export interface GameStartEventPayload {
  game_id: string
  room_id: string
}

// 소켓 ACK 공통 응답 모델
export interface SocketAckSuccess<T = Record<string, never>> {
  ok: true
  data: T
}

export interface SocketAckError {
  ok: false
  error: {
    detail: string
    code: string
  }
}

export type SocketAck<T = Record<string, never>> =
  | SocketAckSuccess<T>
  | SocketAckError
