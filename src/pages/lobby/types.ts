// 로비에서 사용하는 방 상태 값
export type LobbyRoomStatus = 'waiting' | 'playing'

// 화면에서 사용하는 로비 방 도메인 모델
export interface LobbyRoom {
  id: string
  title: string
  status: LobbyRoomStatus
  currentPlayers: number
  maxPlayers: number
  isPrivate: boolean
}

// 서버 응답 원본 필드를 반영한 로비 방 payload 타입
export interface LobbyRoomPayload {
  id: string
  title: string
  status: LobbyRoomStatus
  current_players: number
  max_players: number
  is_private: boolean
}
