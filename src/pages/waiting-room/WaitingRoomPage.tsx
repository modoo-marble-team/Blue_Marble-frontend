import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useAuthStore } from '../../features/auth/store'
import {
  createProfileMenuItems,
  getAvatarBackground,
  getAvatarText,
} from '../../components/header/profileMenu'
import { UserListPanel } from '../../features/presence/components/UserListPanel'
import { useOnlineUsersSocket } from '../../features/presence/hooks'
import { cn } from '../../lib/utils'
import { waitingRoomMock } from './mockData'
import { WaitingRoomHeader } from './components/WaitingRoomHeader'
import { WaitingSeatCard } from './components/WaitingSeatCard'
import { WaitingRoomChatPanel } from './components/WaitingRoomChatPanel'

interface WaitingRoomLocationState {
  roomId?: string
  roomTitle?: string
}

function formatRoomIdLabel(roomId: string) {
  const matchedNumber = roomId.match(/\d+/)?.[0]
  if (!matchedNumber) {
    return waitingRoomMock.roomIdLabel
  }

  return `Room ${matchedNumber}`
}

function WaitingRoomPage() {
  const { roomId = 'room-5' } = useParams<{ roomId: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const session = useAuthStore((state) => state.session)
  const clearSession = useAuthStore((state) => state.clearSession)

  const [seats, setSeats] = useState(waitingRoomMock.seats)
  const [isUserListOpen, setIsUserListOpen] = useState(true)

  const {
    data: users = [],
    isLoading: isUsersLoading,
    isError: isUsersError,
  } = useOnlineUsersSocket()

  useEffect(() => {
    if (!session) {
      navigate('/', { replace: true })
      return
    }

    if (session.needsNicknameSetup) {
      navigate('/nickname-setup', { replace: true })
    }
  }, [navigate, session])

  const avatarText = getAvatarText(session?.nickname)

  const occupiedSeats = seats.filter((seat) => seat !== null)
  const isReady = seats.find((seat) => seat?.isMe)?.isReady ?? false
  const canStartGame =
    occupiedSeats.length >= 2 && occupiedSeats.every((seat) => seat?.isReady)

  function handleToggleReady() {
    setSeats((previousSeats) => {
      return previousSeats.map((seat) => {
        if (!seat || !seat.isMe) {
          return seat
        }

        return {
          ...seat,
          isReady: !seat.isReady,
        }
      })
    })
  }

  function handleLogout() {
    clearSession()
    navigate('/', { replace: true })
  }

  function handleGoMyPage() {
    navigate('/my-page')
  }

  if (!session || session.needsNicknameSetup) {
    return null
  }

  const locationState = location.state as WaitingRoomLocationState | null
  const isSameRoomState = locationState?.roomId === roomId
  const selectedRoomTitle = isSameRoomState ? locationState?.roomTitle : null
  const roomTitle = selectedRoomTitle ?? waitingRoomMock.roomTitle
  const roomIdLabel = formatRoomIdLabel(roomId)
  const avatarBackground = getAvatarBackground(session.isGuest)
  const headerMenuItems = createProfileMenuItems({
    isGuest: session.isGuest,
    onGoMyPage: handleGoMyPage,
    onLogout: handleLogout,
  })

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-ui-app-bg">
      <WaitingRoomHeader
        roomIdLabel={roomIdLabel}
        roomTitle={roomTitle}
        playerLabel={session.nickname}
        avatarText={avatarText}
        avatarBackground={avatarBackground}
        menuItems={headerMenuItems}
        onBackToLobby={() => navigate('/lobby')}
      />

      <main className="flex min-h-0 flex-1 flex-col gap-4 p-4 sm:p-6 xl:flex-row">
        <section className="grid min-h-0 flex-1 gap-4 sm:grid-cols-2 xl:auto-rows-fr">
          {seats.map((seat, seatIndex) => (
            <WaitingSeatCard
              key={seat?.id ?? `empty-seat-${seatIndex}`}
              seat={seat}
            />
          ))}
        </section>

        <div
          className={cn(
            'flex min-h-0 flex-col gap-3 xl:h-full xl:flex-row xl:items-stretch',
            isUserListOpen ? 'xl:w-[620px]' : 'xl:w-[412px]'
          )}
        >
          <div className="min-h-0 xl:h-full xl:w-[340px] xl:shrink-0">
            <WaitingRoomChatPanel
              initialMessages={waitingRoomMock.chatMessages}
              canStartGame={canStartGame}
              isReady={isReady}
              onToggleReady={handleToggleReady}
            />
          </div>

          <div className="min-h-0 xl:h-full xl:shrink-0">
            <UserListPanel
              users={users}
              isLoading={isUsersLoading}
              isError={isUsersError}
              isOpen={isUserListOpen}
              onToggle={() => setIsUserListOpen((previous) => !previous)}
              heightMode="full"
              disableWidthTransition
            />
          </div>
        </div>
      </main>
    </div>
  )
}

export default WaitingRoomPage
