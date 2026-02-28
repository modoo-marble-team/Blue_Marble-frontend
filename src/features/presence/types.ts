export type OnlineUserStatus = 'lobby' | 'in_room' | 'playing'

export interface OnlineUserPayload {
  id: string
  nickname: string
  status: OnlineUserStatus
}

export interface OnlineUsersEventPayload {
  users: OnlineUserPayload[]
}

export interface OnlineUser extends OnlineUserPayload {
  avatarText: string
  avatarBackground: string
}

export interface DirectMessage {
  id: string
  senderId: string
  senderNickname: string
  content: string
  sentAt: string
}

export interface DirectMessageSendSocketPayload {
  receiver_id: string
  message: string
}

export interface DirectMessageReceiveSocketPayload {
  sender_id: string
  sender_nickname: string
  message: string
  sent_at: string
}
