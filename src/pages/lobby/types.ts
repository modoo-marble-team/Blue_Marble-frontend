export type LobbyRoomStatus = 'WAITING' | 'PLAYING'

export interface LobbyRoom {
  id: string
  title: string
  status: LobbyRoomStatus
  currentPlayers: number
  maxPlayers: number
  isPrivate: boolean
}
