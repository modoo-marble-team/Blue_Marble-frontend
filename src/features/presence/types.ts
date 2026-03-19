// 접속자 상태 값 타입
export type OnlineUserStatus = 'lobby' | 'in_room' | 'playing'
export type OnlineUserRealtimeStatus = OnlineUserStatus | 'offline'

// 서버에서 내려주는 접속자 payload 타입
export interface OnlineUserPayload {
  id: string
  nickname: string
  status: OnlineUserStatus
}

// 접속자 목록 소켓 이벤트 payload 타입
export interface OnlineUsersEventPayload {
  users: OnlineUserPayload[]
}

// 접속자 상태 변경 소켓 이벤트 payload 타입
export interface OnlineUserStatusChangedEventPayload {
  id: string
  nickname: string
  status: OnlineUserRealtimeStatus
}

// UI 렌더링용 아바타 필드를 포함한 접속자 모델
export interface OnlineUser extends OnlineUserPayload {
  avatarText: string
  avatarBackground: string
}

// 1:1 채팅 메시지 화면 모델
export interface DirectMessage {
  id: string
  senderId: string
  senderNickname: string
  content: string
  sentAt: string
}

// DM 송신 소켓 payload 타입
export interface DirectMessageSendSocketPayload {
  receiver_id: string
  message: string
  client_message_id?: string
}

// DM 수신 소켓 payload 타입
export interface DirectMessageReceiveSocketPayload {
  message_id: string
  sender_id: string
  sender_nickname: string
  message: string
  sent_at: string
}
