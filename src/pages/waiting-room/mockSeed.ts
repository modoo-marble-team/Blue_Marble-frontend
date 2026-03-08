import type {
  OnlineUserPayload,
  OnlineUserStatus,
} from '../../features/presence/types'
import { mockLobbyRooms } from '../lobby/mockData'
import type { LobbyRoom, LobbyRoomStatus } from '../lobby/types'

// 목 시드 플레이어의 공통 기본 정보 타입
interface SeededRoomPlayer {
  id: string
  nickname: string
}

// 닉네임 조합용 게임 느낌 단어 사전
const NICKNAME_PREFIXES = [
  '주사위',
  '마블',
  '럭키',
  '코인',
  '랜드',
  '턴킬',
  '부스터',
  '스피드',
  '탑티어',
  '골드',
]

const NICKNAME_SUFFIXES = [
  '헌터',
  '장인',
  '마스터',
  '러너',
  '요정',
  '킹',
  '퀸',
  '고수',
  '전략가',
  '챔프',
]

// roomId/index 조합을 숫자 시드로 변환
function createNicknameSeed(roomId: string, index: number) {
  return `${roomId}-${index + 1}`.split('').reduce((hash, char) => {
    return (hash * 31 + char.charCodeAt(0)) >>> 0
  }, 7)
}

// 동일 입력이면 항상 같은 닉네임이 나오도록 결정적 생성
function createSeededNickname(roomId: string, index: number) {
  const seed = createNicknameSeed(roomId, index)
  const roomNumber = Number.parseInt(roomId.replace('room-', ''), 10) || 0
  const prefix = NICKNAME_PREFIXES[seed % NICKNAME_PREFIXES.length]
  const suffix =
    NICKNAME_SUFFIXES[Math.floor(seed / 3) % NICKNAME_SUFFIXES.length]
  // room 번호 + 좌석 번호를 합쳐 닉네임 충돌을 방지
  const tagNumber = roomNumber * 10 + (index + 1)

  return `${prefix}${suffix}${tagNumber}`
}

// 방 시드 상태를 접속자 상태 값으로 변환
function mapLobbyStatusToOnlineStatus(
  status: LobbyRoomStatus
): OnlineUserStatus {
  if (status === 'playing') {
    return 'playing'
  }

  return 'in_room'
}

// roomId + 인원 수 규칙으로 초기 시드 플레이어 목록을 생성
export function createSeededRoomPlayers(roomId: string, count: number) {
  return Array.from({ length: count }, (_, index): SeededRoomPlayer => {
    return {
      id: `${roomId}-user-${index + 1}`,
      nickname: createSeededNickname(roomId, index),
    }
  })
}

// 로비 방 시드 배열을 접속자 초기 스냅샷으로 변환
export function createSeededOnlineUsersFromLobbyRooms(
  rooms: LobbyRoom[]
): OnlineUserPayload[] {
  return rooms.flatMap((room) => {
    const status = mapLobbyStatusToOnlineStatus(room.status)

    return createSeededRoomPlayers(room.id, room.currentPlayers).map(
      (player) => ({
        id: player.id,
        nickname: player.nickname,
        status,
      })
    )
  })
}

// 프로젝트 기본 로비 시드를 기준으로 접속자 초기 스냅샷 생성
export function createInitialSeededOnlineUsers() {
  return createSeededOnlineUsersFromLobbyRooms(mockLobbyRooms)
}
