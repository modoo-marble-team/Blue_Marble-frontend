import { delay, http, HttpResponse } from 'msw'
import { getMockOnlineUsersSnapshot } from '../features/presence/mock/mockData'
import type { LobbyRoomPayload, LobbyRoomStatus } from '../pages/lobby/types'
import { getMockLobbyRooms } from '../pages/waiting-room/socket/mockGateway'
import { gameHandlers } from './handlers/game.handler'

// 로비 방 모델을 API 응답 payload 포맷으로 변환
function mapLobbyRoomPayload(
  room: ReturnType<typeof getMockLobbyRooms>[number]
): LobbyRoomPayload {
  return {
    id: room.id,
    title: room.title,
    status: room.status,
    current_players: room.currentPlayers,
    max_players: room.maxPlayers,
    is_private: room.isPrivate,
  }
}

// 개발 환경 API 모킹 핸들러 목록
export const handlers = [
  ...gameHandlers,
  // 헬스 체크 endpoint 모킹
  http.get('/api/health', () => {
    return HttpResponse.json({ status: 'ok' })
  }),
  http.get('/api/rooms', async ({ request }) => {
    const url = new URL(request.url)
    const status = url.searchParams.get('status') as LobbyRoomStatus | null
    const excludePrivate = url.searchParams.get('exclude_private') === 'true'
    const keyword = (url.searchParams.get('keyword') ?? '').trim().toLowerCase()

    // 요청 쿼리에 맞춰 목 방 목록 필터링
    const filteredRooms = getMockLobbyRooms().filter((room) => {
      // 상태 필터가 있으면 일치하는 방만 통과
      if (status && room.status !== status) {
        return false
      }

      // 비밀방 제외 옵션이 켜지면 비밀방 제거
      if (excludePrivate && room.isPrivate) {
        return false
      }

      // 키워드가 있으면 방 제목 포함 여부로 필터
      if (keyword.length > 0 && !room.title.toLowerCase().includes(keyword)) {
        return false
      }

      return true
    })

    await delay(250)
    return HttpResponse.json({
      rooms: filteredRooms.map(mapLobbyRoomPayload),
    })
  }),
  // 전체 온라인 유저 목록 endpoint 모킹
  http.get('/api/users/online', async () => {
    await delay(250)
    return HttpResponse.json({ users: getMockOnlineUsersSnapshot() })
  }),
]
