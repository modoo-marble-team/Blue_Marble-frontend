import { useQuery } from '@tanstack/react-query'
import { getOnlineUsers } from './api'

const PRESENCE_QUERY_STALE_TIME_MS = 20_000

export function useOnlineUsersQuery() {
  return useQuery({
    queryKey: ['presence', 'online-users'],
    queryFn: getOnlineUsers,
    staleTime: PRESENCE_QUERY_STALE_TIME_MS,
  })
}
