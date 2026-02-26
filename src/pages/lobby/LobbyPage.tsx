import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../../components/Header'
import { useAuthStore } from '../../features/auth/store'
import { UserListPanel } from '../../features/presence/components/UserListPanel'
import { useOnlineUsersSocket } from '../../features/presence/hooks'
import type { LobbyRoomFilter } from './api'
import { useLobbyRoomsQuery } from './hooks'
import { LobbyControls } from './LobbyControls'
import { RoomGrid } from './RoomGrid'

function LobbyPage() {
  const navigate = useNavigate()
  const session = useAuthStore((state) => state.session)
  const clearSession = useAuthStore((state) => state.clearSession)

  const [searchRoom, setSearchRoom] = useState('')
  const [roomFilter, setRoomFilter] = useState<LobbyRoomFilter>('ALL')
  const [excludePrivateRoom, setExcludePrivateRoom] = useState(false)
  const [isUserListOpen, setIsUserListOpen] = useState(true)

  useEffect(() => {
    if (!session) {
      navigate('/', { replace: true })
      return
    }

    if (session.needsNicknameSetup) {
      navigate('/nickname-setup', { replace: true })
    }
  }, [navigate, session])

  const {
    data: rooms = [],
    isLoading: isRoomsLoading,
    isError: isRoomsError,
  } = useLobbyRoomsQuery({
    searchRoom,
    roomFilter,
    excludePrivateRoom,
  })

  const {
    data: users = [],
    isLoading: isUsersLoading,
    isError: isUsersError,
  } = useOnlineUsersSocket()

  const avatarText = useMemo(() => {
    const trimmedNickname = session?.nickname.trim() ?? ''
    return trimmedNickname.length > 0 ? trimmedNickname.slice(0, 1) : 'P'
  }, [session?.nickname])

  const avatarBackground = session?.isGuest ? '#fde68a' : '#bfdbfe'

  function handleLogout() {
    clearSession()
    navigate('/', { replace: true })
  }

  if (!session || session.needsNicknameSetup) {
    return null
  }

  return (
    <div className="min-h-screen bg-ui-app-bg">
      <Header
        playerLabel={session.nickname}
        avatarText={avatarText}
        avatarBackground={avatarBackground}
        menuItems={[
          {
            id: 'logout',
            label: '로그아웃',
            onSelect: handleLogout,
            tone: 'danger',
          },
        ]}
      />

      <main className="flex flex-col gap-4 p-4 sm:p-6 xl:flex-row">
        <section className="min-w-0 flex-1">
          <LobbyControls
            searchKeyword={searchRoom}
            roomFilter={roomFilter}
            excludePrivateRoom={excludePrivateRoom}
            onSearchKeywordChange={setSearchRoom}
            onRoomFilterChange={setRoomFilter}
            onExcludePrivateRoomChange={setExcludePrivateRoom}
          />

          <RoomGrid
            rooms={rooms}
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
