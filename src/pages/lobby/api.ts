import { apiClient } from '../../lib/axios'
import type { LobbyRoom, LobbyRoomPayload, LobbyRoomStatus } from './types'

// 로비 방 목록 응답 래퍼 타입
interface LobbyRoomsResponse {
  rooms: LobbyRoomPayload[]
}

// 로비 탭 필터 타입
export type LobbyRoomFilter = 'ALL' | LobbyRoomStatus

// 로비 방 조회 쿼리 파라미터 타입
export interface GetLobbyRoomsParams {
  searchRoom: string
  roomFilter: LobbyRoomFilter
  excludePrivateRoom: boolean
}

// API payload 필드를 화면 도메인 모델로 정규화
function mapLobbyRoom(payload: LobbyRoomPayload): LobbyRoom {
  return {
    id: payload.id,
    title: payload.title,
    status: payload.status,
    currentPlayers: payload.current_players,
    maxPlayers: payload.max_players,
    isPrivate: payload.is_private,
  }
}

// 사용자 입력 필터를 서버 쿼리 문자열로 변환
function buildLobbyRoomsQuery(params: GetLobbyRoomsParams) {
  const query: Record<string, string> = {}
  const normalizedKeyword = params.searchRoom.trim()

  // 전체 탭이 아닐 때만 상태 조건 전달
  if (params.roomFilter !== 'ALL') {
    query.status = params.roomFilter
  }

  // 비밀방 제외 토글이 켜진 경우만 파라미터 전달
  if (params.excludePrivateRoom) {
    query.exclude_private = 'true'
  }

  // 검색어가 비어 있지 않을 때만 keyword 추가
  if (normalizedKeyword.length > 0) {
    query.keyword = normalizedKeyword
  }

  return query
}

// 로비 방 목록 조회 후 payload를 화면 모델 배열로 반환
export async function getLobbyRooms(params: GetLobbyRoomsParams) {
  const { data } = await apiClient.get<LobbyRoomsResponse>('/rooms', {
    params: buildLobbyRoomsQuery(params),
  })

  return data.rooms.map(mapLobbyRoom)
}
