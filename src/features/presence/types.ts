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
