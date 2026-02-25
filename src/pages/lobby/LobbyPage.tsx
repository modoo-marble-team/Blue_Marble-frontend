import { useMemo, useState } from 'react'
import Header from '../../components/Header'
import { useOnlineUsersQuery } from '../../features/presence/hooks'
import { filterLobbyRooms, type RoomFilter } from './filterRooms'
import { useLobbyRoomsQuery } from './hooks'
import { LobbyControls } from './LobbyControls'
import { RoomGrid } from './RoomGrid'
import { UserListPanel } from '../../components/UserListPanel'

function LobbyPage() {
  const [searchKeyword, setSearchKeyword] = useState('')
  const [roomFilter, setRoomFilter] = useState<RoomFilter>('ALL')
  const [excludePrivateRoom, setExcludePrivateRoom] = useState(false)
  const [isUserListOpen, setIsUserListOpen] = useState(true)

  const {
    data: rooms = [],
    isLoading: isRoomsLoading,
    isError: isRoomsError,
  } = useLobbyRoomsQuery()

  const {
    data: users = [],
    isLoading: isUsersLoading,
    isError: isUsersError,
  } = useOnlineUsersQuery()

  const filteredRooms = useMemo(() => {
    return filterLobbyRooms({
      rooms,
      searchKeyword,
      roomFilter,
      excludePrivateRoom,
    })
  }, [excludePrivateRoom, roomFilter, rooms, searchKeyword])

  return (
    <div className="min-h-screen bg-ui-app-bg">
      <Header />

      <main className="flex flex-col gap-4 p-4 sm:p-6 xl:flex-row">
        <section className="min-w-0 flex-1">
          <LobbyControls
            searchKeyword={searchKeyword}
            roomFilter={roomFilter}
            excludePrivateRoom={excludePrivateRoom}
            onSearchKeywordChange={setSearchKeyword}
            onRoomFilterChange={setRoomFilter}
            onExcludePrivateRoomChange={setExcludePrivateRoom}
          />

          <RoomGrid
            rooms={filteredRooms}
            isLoading={isRoomsLoading}
            isError={isRoomsError}
            isUserListOpen={isUserListOpen}
          />
        </section>

        <UserListPanel
          users={users}
          isLoading={isUsersLoading}
          isError={isUsersError}
          isOpen={isUserListOpen}
          onToggle={() => setIsUserListOpen((prev) => !prev)}
        />
      </main>
    </div>
  )
}

export default LobbyPage
