import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { socket } from '../../lib/socket'
import { getLobbyRooms, type GetLobbyRoomsParams } from './api'

const LOBBY_QUERY_STALE_TIME_MS = 20_000
const LOBBY_UPDATED_EVENT = 'lobby_updated'
const USE_SOCKET_MOCK =
  import.meta.env.DEV && import.meta.env.VITE_USE_SOCKET_MOCK !== 'false'

export function useLobbyRoomsQuery(params: GetLobbyRoomsParams) {
  const queryClient = useQueryClient()

  useEffect(() => {
    const handleLobbyUpdated = () => {
      queryClient.invalidateQueries({
        queryKey: ['lobby', 'rooms'],
      })
    }

    socket.on(LOBBY_UPDATED_EVENT, handleLobbyUpdated)

    if (!USE_SOCKET_MOCK && !socket.connected) {
      socket.connect()
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
  })
}
