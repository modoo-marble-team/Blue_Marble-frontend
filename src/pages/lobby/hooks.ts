import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { IS_SOCKET_MOCK_ENABLED } from '../../config/env'
import { connectSocketWithAuthIfNeeded, socket } from '../../lib/socket'
import { getLobbyRooms, type GetLobbyRoomsParams } from './api'

const LOBBY_QUERY_STALE_TIME_MS = 20_000
const LOBBY_UPDATED_EVENT = 'lobby_updated'
const USE_SOCKET_MOCK = IS_SOCKET_MOCK_ENABLED

// 로비 방 목록 조회와 소켓 기반 갱신을 함께 처리
export function useLobbyRoomsQuery(params: GetLobbyRoomsParams) {
  const queryClient = useQueryClient()

  // 로비 갱신 이벤트 수신 시 방 목록 쿼리를 무효화
  useEffect(() => {
    const handleLobbyUpdated = () => {
      queryClient.invalidateQueries({
        queryKey: ['lobby', 'rooms'],
      })
    }

    socket.on(LOBBY_UPDATED_EVENT, handleLobbyUpdated)

    // 실제 소켓 모드에서만 연결 상태를 확인해 connect 실행
    if (!USE_SOCKET_MOCK && !socket.connected) {
      connectSocketWithAuthIfNeeded()
    }

    return () => {
      socket.off(LOBBY_UPDATED_EVENT, handleLobbyUpdated)
    }
  }, [queryClient])

  return useQuery({
    queryKey: [
      'lobby',
      'rooms',
      params.searchRoom,
      params.roomFilter,
      params.excludePrivateRoom,
    ],
    queryFn: () => getLobbyRooms(params),
    staleTime: LOBBY_QUERY_STALE_TIME_MS,
    refetchOnMount: 'always',
  })
}
