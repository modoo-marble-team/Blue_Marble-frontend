import { useQuery } from '@tanstack/react-query'
import { getLobbyRooms } from './api'

const LOBBY_QUERY_STALE_TIME_MS = 20_000

export function useLobbyRoomsQuery() {
  return useQuery({
    queryKey: ['lobby', 'rooms'],
    queryFn: getLobbyRooms,
    staleTime: LOBBY_QUERY_STALE_TIME_MS,
  })
}
