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

// room_updated는 대기방 snapshot과 동일한 payload 계약을 사용
export type RoomUpdatedEventPayload = JoinWaitingRoomResponsePayload

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

// created/updated/status_changed 시 내려오는 full room card payload 타입
export interface LobbyUpdatedFullRoomPayload {
  id: string
  title: string
  status: LobbyRoomStatus
  is_private: boolean
  current_players: number
  max_players: number
  host_id: string
  host_nickname: string
}

// removed 시에는 room id만 내려오는 최소 payload 타입
export interface LobbyUpdatedRemovedRoomPayload {
  id: string
}

// room card 전체 정보가 포함된 로비 갱신 이벤트 타입
export interface LobbyUpdatedFullEventPayload {
  action: 'created' | 'status_changed' | 'updated'
  room: LobbyUpdatedFullRoomPayload
}

// 방 삭제 시 최소 payload만 전달되는 이벤트 타입
export interface LobbyUpdatedRemovedEventPayload {
  action: 'removed'
  room: LobbyUpdatedRemovedRoomPayload
}

// 로비 갱신 이벤트 payload 타입
export type LobbyUpdatedEventPayload =
  | LobbyUpdatedFullEventPayload
  | LobbyUpdatedRemovedEventPayload

// 게임 시작 이벤트 payload 타입
export interface GameStartEventPayload {
  game_id: string
  room_id: string
  game_state?: {
    players: unknown[]
    tiles: unknown[]
    current_turn: string | null
    round: number
  }
}
