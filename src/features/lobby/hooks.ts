import { useQuery } from '@tanstack/react-query'
import { getLobbyRooms, getLobbyUsers } from './api'

export function useLobbyRoomsQuery() {
  return useQuery({
    queryKey: ['lobby', 'rooms'],
    queryFn: getLobbyRooms,
    staleTime: 20_000,
  })
}

export function useLobbyUsersQuery() {
  return useQuery({
    queryKey: ['lobby', 'users'],
    queryFn: getLobbyUsers,
    staleTime: 20_000,
  })
}
