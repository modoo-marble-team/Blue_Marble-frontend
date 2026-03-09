import type {
  ChatEventPayload,
  WaitingRoomChatMessage,
  WaitingRoomSeat,
  WaitingRoomSnapshot,
} from '../types'
import { getAvatarBackgroundColor } from '../../../components/avatar/avatarModel'

// 대기방 액션 함수 공통 반환 타입
export interface WaitingRoomActionResult {
  ok: boolean
  message?: string
}

// 퇴장 시퀀스 호출 경로 타입
export interface LeaveRoomSequenceParams {
  source: 'manual' | 'cleanup'
}

// 대기방 기본 정원
const DEFAULT_WAITING_ROOM_MAX_PLAYERS = 4

// playerId 해시 기반으로 좌석 아바타 색상 선택
function getAvatarColor(playerId: string) {
  return getAvatarBackgroundColor(playerId)
}

// 채팅 이벤트 payload에서 메시지 고유 ID 생성
function getChatMessageId(payload: ChatEventPayload) {
  return `${payload.room_id}-${payload.sender_id}-${payload.sent_at}`
}

// 채팅 이벤트 payload를 화면 메시지 모델로 매핑
export function mapChatPayloadToMessage(
  payload: ChatEventPayload
): WaitingRoomChatMessage {
  return {
    id: getChatMessageId(payload),
    senderId: payload.sender_id,
    senderNickname: payload.sender_nickname,
    content: payload.message,
    timestamp: payload.sent_at,
    type: 'talk',
  }
}

// 방 스냅샷을 좌석 배열(빈 자리 포함)로 변환
export function buildWaitingRoomSeats(
  room: WaitingRoomSnapshot | null,
  myUserId: string
): Array<WaitingRoomSeat | null> {
  const maxPlayers = room?.maxPlayers ?? DEFAULT_WAITING_ROOM_MAX_PLAYERS
  const seats = Array.from(
    { length: maxPlayers },
    () => null
  ) as Array<WaitingRoomSeat | null>

  // 방 정보가 없으면 빈 자리 배열만 반환
  if (!room) {
    return seats
  }

  room.players.slice(0, maxPlayers).forEach((player, index) => {
    seats[index] = {
      id: player.id,
      nickname: player.nickname,
      isReady: player.isReady,
      isHost: player.isHost,
      isMe: player.id === myUserId,
      avatarColor: getAvatarColor(player.id),
    }
  })

  return seats
}

// 게임 시작 가능 조건(2명 이상 + 방장 제외 전원 ready) 판별
export function getStartConditionMet(room: WaitingRoomSnapshot | null) {
  if (!room || room.players.length < 2) {
    return false
  }

  return room.players
    .filter((player) => !player.isHost)
    .every((player) => player.isReady)
}
