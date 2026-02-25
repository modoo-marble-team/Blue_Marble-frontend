import type { LobbyRoom, LobbyRoomStatus } from './types'

export type RoomFilter = 'ALL' | LobbyRoomStatus

interface FilterLobbyRoomsParams {
  rooms: LobbyRoom[]
  searchKeyword: string
  roomFilter: RoomFilter
  excludePrivateRoom: boolean
}

export function filterLobbyRooms({
  rooms,
  searchKeyword,
  roomFilter,
  excludePrivateRoom,
}: FilterLobbyRoomsParams) {
  const normalizedKeyword = searchKeyword.trim().toLowerCase()

  return rooms.filter((room) => {
    if (roomFilter !== 'ALL' && room.status !== roomFilter) {
      return false
    }

    if (excludePrivateRoom && room.isPrivate) {
      return false
    }

    if (normalizedKeyword.length > 0) {
      return room.title.toLowerCase().includes(normalizedKeyword)
    }

    return true
  })
}
