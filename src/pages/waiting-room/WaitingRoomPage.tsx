import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
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
import { WaitingRoomHeader } from './components/WaitingRoomHeader'
import { WaitingSeatCard } from './components/WaitingSeatCard'
import { WaitingRoomSidePanel } from './components/WaitingRoomSidePanel'
import { useWaitingRoomController } from './hooks'
import type { GameStartEventPayload } from './types'

interface WaitingRoomLocationState {
  roomId?: string
  roomTitle?: string
}

const DEFAULT_WAITING_ROOM_TITLE = '즐거운 게임 한판!'

function formatRoomIdLabel(roomId: string) {
  const matchedNumber = roomId.match(/\d+/)?.[0]

  if (!matchedNumber) {
    return 'Room'
  }

  return `Room ${matchedNumber}`
}

function WaitingRoomPage() {
  const { roomId } = useParams<{ roomId: string }>()
  const currentRoomId = roomId ?? ''
  const location = useLocation()
  const navigate = useNavigate()
  const session = useAuthStore((state) => state.session)
  const clearSession = useAuthStore((state) => state.clearSession)
  const [isUserListOpen, setIsUserListOpen] = useState(true)

  const locationState = location.state as WaitingRoomLocationState | null
  const isSameRoomState = locationState?.roomId === currentRoomId
  const selectedRoomTitle = isSameRoomState ? locationState?.roomTitle : null

  const handleGameStart = useCallback(
    (payload: GameStartEventPayload) => {
      navigate('/game', {
        state: {
          gameId: payload.game_id,
          roomId: currentRoomId,
        },
      })
    },
    [currentRoomId, navigate]
  )

  const {
    room,
    seats,
    chatMessages,
    isRoomLoading,
    roomErrorMessage,
    isReadyPending,
    isStartPending,
    isLeavePending,
    isHost,
    isReady,
    canToggleReady,
    canStartGame,
    sendChatMessage,
    handleToggleReady,
    handleStartGame,
    leaveRoom,
  } = useWaitingRoomController({
    roomId: currentRoomId,
    session,
    fallbackRoomTitle: selectedRoomTitle ?? undefined,
    onGameStart: handleGameStart,
  })

  const {
    data: users = [],
    isLoading: isUsersLoading,
    isError: isUsersError,
  } = useOnlineUsersSocket()

  useEffect(() => {
    if (!currentRoomId) {
      navigate('/lobby', { replace: true })
      return
    }

    if (!session) {
      navigate('/', { replace: true })
      return
    }

    if (session.needsNicknameSetup) {
      navigate('/nickname-setup', { replace: true })
    }
  }, [currentRoomId, navigate, session])

  useEffect(() => {
    if (!roomErrorMessage) {
      return
    }

    toast.error(roomErrorMessage)
  }, [roomErrorMessage])

  const handleLeaveToLobby = useCallback(async () => {
    const result = await leaveRoom()

    if (!result.ok) {
      if (result.message) {
        toast.error(result.message)
      }
      return
    }

    navigate('/lobby', { replace: true })
  }, [leaveRoom, navigate])

  const handleLogout = useCallback(async () => {
    const result = await leaveRoom()

    if (!result.ok && result.message) {
      toast.error(result.message)
    }

    clearSession()
    navigate('/', { replace: true })
  }, [clearSession, leaveRoom, navigate])

  const handleGoMyPage = useCallback(async () => {
    const result = await leaveRoom()

    if (!result.ok) {
      if (result.message) {
        toast.error(result.message)
      }
      return
    }

    navigate('/my-page')
  }, [leaveRoom, navigate])

  const onToggleReady = useCallback(async () => {
    const result = await handleToggleReady()

    if (!result.ok && result.message) {
      toast.error(result.message)
    }
  }, [handleToggleReady])

  const onStartGame = useCallback(async () => {
    const result = await handleStartGame()

    if (!result.ok && result.message) {
      toast.error(result.message)
    }
  }, [handleStartGame])

  if (!session || session.needsNicknameSetup) {
    return null
  }
  if (!currentRoomId) {
    return null
  }

  const roomTitle =
    room?.title ?? selectedRoomTitle ?? DEFAULT_WAITING_ROOM_TITLE
  const roomIdLabel = formatRoomIdLabel(currentRoomId)
  const avatarText = getAvatarText(session.nickname)
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
        onBackToLobby={() => {
          void handleLeaveToLobby()
        }}
      />

      <main className="flex min-h-0 flex-1 flex-col gap-4 p-4 sm:p-6 xl:flex-row">
        <section className="grid min-h-0 flex-1 gap-4 sm:grid-cols-2 xl:auto-rows-fr">
          {isRoomLoading &&
            Array.from({ length: 4 }).map((_, index) => (
              <div
                key={`waiting-seat-skeleton-${index}`}
                className="h-full min-h-[260px] animate-pulse rounded-[34px] bg-ui-surface-soft"
              />
            ))}

          {!isRoomLoading && roomErrorMessage && (
            <article className="col-span-full flex min-h-[260px] flex-col items-center justify-center rounded-[34px] border border-ui-danger-border bg-ui-danger-bg p-6 text-center">
              <p className="text-base font-semibold text-ui-danger">
                대기방 정보를 불러오지 못했습니다.
              </p>
              <button
                type="button"
                onClick={() => {
                  void handleLeaveToLobby()
                }}
                className="mt-4 rounded-xl bg-ui-brand px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-ui-brand-strong"
              >
                로비로 돌아가기
              </button>
            </article>
          )}

          {!isRoomLoading &&
            !roomErrorMessage &&
            seats.map((seat, seatIndex) => (
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
            <WaitingRoomSidePanel
              messages={chatMessages}
              currentUserId={session.userId}
              isHost={isHost}
              canStartGame={canStartGame}
              canToggleReady={canToggleReady}
              isReady={isReady}
              isReadyPending={isReadyPending}
              isStartPending={isStartPending}
              onToggleReady={() => {
                void onToggleReady()
              }}
              onStartGame={() => {
                void onStartGame()
              }}
              onSendMessage={sendChatMessage}
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

      {isLeavePending && (
        <div
          className="pointer-events-none absolute inset-0 bg-black/5"
          aria-hidden
        />
      )}
    </div>
  )
}

export default WaitingRoomPage
