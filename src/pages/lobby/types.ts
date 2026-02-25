export type LobbyRoomStatus = 'waiting' | 'playing'

export interface LobbyRoom {
  id: string
  title: string
  status: LobbyRoomStatus
  currentPlayers: number
  maxPlayers: number
  isPrivate: boolean
}

export interface LobbyRoomPayload {
  id: string
  title: string
  status: LobbyRoomStatus
  current_players: number
  max_players: number
  is_private: boolean
}
