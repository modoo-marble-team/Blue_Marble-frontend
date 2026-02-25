export type LobbyRoomStatus = 'WAITING' | 'PLAYING'

export type LobbyUserStatus = 'WAITING' | 'PLAYING'

export interface LobbyRoom {
  id: string
  title: string
  status: LobbyRoomStatus
  currentPlayers: number
  maxPlayers: number
  isPrivate: boolean
}

export interface LobbyUser {
  id: string
  nickname: string
  status: LobbyUserStatus
  avatarText: string
  avatarBackground: string
}
