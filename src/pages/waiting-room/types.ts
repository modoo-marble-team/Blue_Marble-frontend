import type { Player, Tile } from '../../types/domain'
import type { LobbyRoomStatus } from '../lobby/types'

export interface WaitingRoomPlayer {
  id: string
  nickname: string
  isReady: boolean
  isHost: boolean
}

export interface WaitingRoomChatMessage {
  id: string
  senderId: string
  senderNickname: string
  content: string
  timestamp: string
  type: 'talk'
}

export interface WaitingRoomSeat {
  id: string
  nickname: string
  isReady: boolean
  isHost: boolean
  isMe: boolean
  avatarColor: string
}

export interface WaitingRoomSnapshot {
  roomId: string
  title: string
  status: LobbyRoomStatus
  maxPlayers: number
  isPrivate: boolean
  players: WaitingRoomPlayer[]
  chatMessages: WaitingRoomChatMessage[]
}

export interface WaitingRoomPlayerPayload {
  id: string
  nickname: string
  is_ready: boolean
  is_host: boolean
}

export interface WaitingRoomChatPayload {
  id: string
  sender_id: string
  sender_nickname: string
  message: string
  sent_at: string
  type: 'talk'
}

export interface JoinWaitingRoomResponsePayload {
  room_id: string
  title: string
  status: LobbyRoomStatus
  max_players: number
  is_private: boolean
  players: WaitingRoomPlayerPayload[]
  chat_messages: WaitingRoomChatPayload[]
}

export interface CreateRoomResponsePayload {
  id: string
  title: string
  status: LobbyRoomStatus
  is_private: boolean
  host_id: string
  max_players: number
}

export interface LeaveWaitingRoomResponsePayload {
  success: boolean
  new_host_id?: string
}

export interface ToggleWaitingReadyResponsePayload {
  is_ready: boolean
}

export interface StartWaitingGameResponsePayload {
  game_id: string
  success: boolean
}

export interface EnterRoomSocketPayload {
  room_id: string
}

export interface LeaveRoomSocketPayload {
  room_id: string
}

export interface SendChatSocketPayload {
  room_id: string
  message: string
}

export interface HostChangedEventPayload {
  new_host_id: string
  new_host_nickname: string
}

export interface PlayerReadyEventPayload {
  player_id: string
  is_ready: boolean
  all_ready: boolean
}

export interface ChatEventPayload {
  room_id: string
  sender_id: string
  sender_nickname: string
  message: string
  sent_at: string
}

export interface LobbyUpdatedRoomPayload {
  id: string
  title: string
  status: LobbyRoomStatus
  is_private: boolean
  current_players: number
  max_players: number
  host_nickname: string
}

export interface LobbyUpdatedEventPayload {
  action: 'created' | 'removed' | 'status_changed' | 'updated'
  room: LobbyUpdatedRoomPayload
}

export interface GameStartEventPayload {
  game_id: string
  game_state: {
    players: Player[]
    tiles: Tile[]
    current_turn: string | null
    round: number
  }
}
