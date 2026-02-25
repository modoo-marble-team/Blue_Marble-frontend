export type OnlineUserStatus = 'WAITING' | 'PLAYING'

export interface OnlineUser {
  id: string
  nickname: string
  status: OnlineUserStatus
  avatarText: string
  avatarBackground: string
}
