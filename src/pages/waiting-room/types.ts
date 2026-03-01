import type { Player, Tile } from '../../types/domain'
import type { LobbyRoomStatus } from '../lobby/types'

// 대기방 플레이어 화면 모델
export interface WaitingRoomPlayer {
  id: string
  nickname: string
  isReady: boolean
  isHost: boolean
}

// 대기방 채팅 메시지 화면 모델
export interface WaitingRoomChatMessage {
  id: string
  senderId: string
  senderNickname: string
  content: string
  timestamp: string
  type: 'talk'
}

// 좌석 카드 렌더링용 플레이어 정보
export interface WaitingRoomSeat {
  id: string
  nickname: string
  isReady: boolean
  isHost: boolean
  isMe: boolean
  avatarColor: string
}

// 대기방 화면 전체 상태 스냅샷
export interface WaitingRoomSnapshot {
  roomId: string
  title: string
  status: LobbyRoomStatus
  maxPlayers: number
  isPrivate: boolean
  players: WaitingRoomPlayer[]
  chatMessages: WaitingRoomChatMessage[]
}

// 서버 대기방 플레이어 payload 타입
export interface WaitingRoomPlayerPayload {
  id: string
  nickname: string
  is_ready: boolean
  is_host: boolean
}

// 서버 대기방 채팅 payload 타입
export interface WaitingRoomChatPayload {
  id: string
  sender_id: string
  sender_nickname: string
  message: string
  sent_at: string
  type: 'talk'
}

// 대기방 입장 API 응답 타입
export interface JoinWaitingRoomResponsePayload {
  room_id: string
  title: string
  status: LobbyRoomStatus
  max_players: number
  is_private: boolean
  players: WaitingRoomPlayerPayload[]
  chat_messages: WaitingRoomChatPayload[]
}

// 방 생성 API 응답 타입
export interface CreateRoomResponsePayload {
  id: string
  title: string
  status: LobbyRoomStatus
  is_private: boolean
  host_id: string
  max_players: number
}

// 대기방 퇴장 API 응답 타입
export interface LeaveWaitingRoomResponsePayload {
  success: boolean
  new_host_id?: string
}

// 준비 토글 API 응답 타입
export interface ToggleWaitingReadyResponsePayload {
  is_ready: boolean
}

// 게임 시작 API 응답 타입
export interface StartWaitingGameResponsePayload {
  game_id: string
  success: boolean
}

// 대기방 입장 소켓 payload 타입
export interface EnterRoomSocketPayload {
  room_id: string
}

// 대기방 퇴장 소켓 payload 타입
export interface LeaveRoomSocketPayload {
  room_id: string
}

// 대기방 채팅 송신 소켓 payload 타입
export interface SendChatSocketPayload {
  room_id: string
  message: string
}

// 방장 변경 이벤트 payload 타입
export interface HostChangedEventPayload {
  new_host_id: string
  new_host_nickname: string
}

// 플레이어 준비 상태 변경 이벤트 payload 타입
export interface PlayerReadyEventPayload {
  player_id: string
  is_ready: boolean
  all_ready: boolean
}

// 채팅 이벤트 payload 타입
export interface ChatEventPayload {
  room_id: string
  sender_id: string
  sender_nickname: string
  message: string
  sent_at: string
}

// 로비 갱신 이벤트의 방 정보 payload 타입
export interface LobbyUpdatedRoomPayload {
  id: string
  title: string
  status: LobbyRoomStatus
  is_private: boolean
  current_players: number
  max_players: number
  host_nickname: string
}

// 로비 갱신 이벤트 payload 타입
export interface LobbyUpdatedEventPayload {
  action: 'created' | 'removed' | 'status_changed' | 'updated'
  room: LobbyUpdatedRoomPayload
}

// 게임 시작 이벤트 payload 타입
export interface GameStartEventPayload {
  game_id: string
  game_state: {
    players: Player[]
    tiles: Tile[]
    current_turn: string | null
    round: number
  }
}
