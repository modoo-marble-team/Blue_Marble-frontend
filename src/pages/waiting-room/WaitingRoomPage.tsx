import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useRequireActiveSession } from '../../features/auth/hooks/useRequireActiveSession'
import { useAuthStore } from '../../features/auth/store'
import {
  createProfileMenuItems,
  getAvatarBackground,
  getAvatarText,
} from '../../components/header/profileMenu'
import { DirectMessagePanel } from '../../features/presence/components/DirectMessagePanel'
import { UserListPanel } from '../../features/presence/components/UserListPanel'
import {
  getOnlineUserAvatarBackground,
  getOnlineUserAvatarText,
} from '../../features/presence/onlineUsersModel'
import type { OnlineUser } from '../../features/presence/types'
import { useOnlineUsersSocket } from '../../features/presence/useOnlineUsersSocket'
import { useDirectMessageController } from '../../features/presence/useDirectMessageController'
import { removeMockOnlineUser } from '../../features/presence/mockData'
import { cn } from '../../lib/utils'
import { IS_SOCKET_MOCK_ENABLED } from '../../config/env'
import { WaitingRoomHeader } from './components/WaitingRoomHeader'
import { WaitingSeatCard } from './components/WaitingSeatCard'
import { WaitingRoomSidePanel } from './components/WaitingRoomSidePanel'
import { DevControlPanel } from './components/DevControlPanel'
import { useWaitingRoomController } from './hooks'
import type { GameStartEventPayload, WaitingRoomSnapshot } from './types'

interface WaitingRoomLocationState {
  roomId?: string
  roomTitle?: string
  preJoinedSnapshot?: WaitingRoomSnapshot
}

const DEFAULT_WAITING_ROOM_TITLE = '즐거운 게임 한판!'

// roomId에서 숫자를 추출해 헤더 배지 텍스트로 변환
function formatRoomIdLabel(roomId: string) {
  const matchedNumber = roomId.match(/\d+/)?.[0]

  if (!matchedNumber) {
    return 'Room'
  }

  return `Room ${matchedNumber}`
}

// 대기방 화면 렌더링과 DM/접속자/대기방 컨트롤 흐름 통합
function WaitingRoomPage() {
  const { roomId } = useParams<{ roomId: string }>()
  const currentRoomId = roomId ?? ''
  const location = useLocation()
  const navigate = useNavigate()
  const session = useAuthStore((state) => state.session)
  const clearSession = useAuthStore((state) => state.clearSession)
  const [isUserListOpen, setIsUserListOpen] = useState(true)
  const isAllowedSession = useRequireActiveSession(session)

  const locationState = location.state as WaitingRoomLocationState | null
  const isSameRoomState = locationState?.roomId === currentRoomId
  const selectedRoomTitle = isSameRoomState ? locationState?.roomTitle : null
  const preJoinedSnapshot = isSameRoomState
    ? (locationState?.preJoinedSnapshot ?? null)
    : null

  const handleGameStart = useCallback(
    (payload: GameStartEventPayload) => {
      navigate(`/game/${payload.game_id}`, {
        state: {
          gameId: payload.game_id,
          roomId: payload.room_id,
        },
      })
    },
    [navigate]
  )

  const handleRoomRemoved = useCallback(() => {
    navigate('/lobby', { replace: true })
  }, [navigate])

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
    applyRoomSnapshot,
  } = useWaitingRoomController({
    roomId: currentRoomId,
    session,
    fallbackRoomTitle: selectedRoomTitle ?? undefined,
    preJoinedSnapshot,
    onGameStart: handleGameStart,
    onRoomRemoved: handleRoomRemoved,
  })

  const {
    data: users = [],
    isLoading: isUsersLoading,
    isError: isUsersError,
  } = useOnlineUsersSocket()

  const waitingRoomUsers = useMemo(() => {
    if (!room) {
      return users
    }

    const currentRoomStatus = room.status === 'playing' ? 'playing' : 'in_room'
    const mergedUsersById = new Map<string, OnlineUser>(
      users.map((user) => [user.id, user])
    )

    room.players.forEach((player) => {
      const existingUser = mergedUsersById.get(player.id)

      if (existingUser) {
        mergedUsersById.set(player.id, {
          ...existingUser,
          nickname: player.nickname,
          status: currentRoomStatus,
        })
        return
      }

      mergedUsersById.set(player.id, {
        id: player.id,
        nickname: player.nickname,
        status: currentRoomStatus,
        avatarText: getOnlineUserAvatarText(player.nickname),
        avatarBackground: getOnlineUserAvatarBackground(player.id),
      })
    })

    return Array.from(mergedUsersById.values())
  }, [room, users])

  const {
    dmTargetUser,
    directMessagesByUserId,
    unreadDirectMessageCountByUserId,
    openDirectMessage,
    closeDirectMessage,
    sendDirectMessage,
  } = useDirectMessageController({
    session,
    users: waitingRoomUsers,
    onBlockedByPlaying: () => {
      toast.error('게임중인 유저에게는 DM을 보낼 수 없습니다.')
    },
  })

  // roomId 파라미터가 없으면 로비로 복귀
  useEffect(() => {
    if (!currentRoomId) {
      navigate('/lobby', { replace: true })
    }
  }, [currentRoomId, navigate])

  // 대기방 로딩 에러를 토스트로 표시
  useEffect(() => {
    if (!roomErrorMessage) {
      return
    }

    toast.error(roomErrorMessage)
  }, [roomErrorMessage])

  // 대기방을 떠나 로비로 복귀
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

  // 로그아웃 시 대기방 정리 후 세션을 제거
  const handleLogout = useCallback(async () => {
    const result = await leaveRoom()

    if (!result.ok && result.message) {
      toast.error(result.message)
    }

    if (IS_SOCKET_MOCK_ENABLED && session) {
      removeMockOnlineUser(session.userId)
    }

    clearSession()
    navigate('/', { replace: true })
  }, [clearSession, leaveRoom, navigate, session])

  // 마이페이지 이동 전 대기방 퇴장 처리
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

  // 준비 토글 액션 실패 메시지를 토스트로 표시
  const onToggleReady = useCallback(async () => {
    const result = await handleToggleReady()

    if (!result.ok && result.message) {
      toast.error(result.message)
    }
  }, [handleToggleReady])

  // 게임 시작 액션 실패 메시지를 토스트로 표시
  const onStartGame = useCallback(async () => {
    const result = await handleStartGame()

    if (!result.ok && result.message) {
      toast.error(result.message)
    }
  }, [handleStartGame])

  // 리다이렉트 대상 상태에서는 화면 렌더링 생략
  if (!isAllowedSession || !session) {
    return null
  }
  if (!currentRoomId) {
    return null
  }

  const roomTitle =
    room?.title ?? selectedRoomTitle ?? DEFAULT_WAITING_ROOM_TITLE
  const roomIdLabel = formatRoomIdLabel(currentRoomId)
  const avatarText = getAvatarText(session.nickname)
  const avatarBackground = getAvatarBackground(session.userId)
  const headerMenuItems = createProfileMenuItems({
    isGuest: session.isGuest,
    onGoMyPage: handleGoMyPage,
    onLogout: handleLogout,
  })

  return (
    <div className="relative flex h-screen flex-col overflow-hidden bg-ui-app-bg">
      <div className="pointer-events-none absolute inset-x-0 bottom-0 top-14">
        <img
          src="/LobbyPage_background.webp"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_24%,rgba(255,255,255,0.3),transparent_28%),linear-gradient(180deg,rgba(250,248,240,0.48),rgba(250,248,240,0.62))]" />
      </div>

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

      <main className="relative flex min-h-0 flex-1 flex-col gap-4 p-4 sm:p-6 xl:flex-row">
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
              users={waitingRoomUsers}
              isLoading={isUsersLoading}
              isError={isUsersError}
              isOpen={isUserListOpen}
              currentUserId={session.userId}
              activeDirectMessageUserId={dmTargetUser?.id}
              unreadDirectMessageCountByUserId={
                unreadDirectMessageCountByUserId
              }
              onOpenDirectMessage={openDirectMessage}
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

      <DevControlPanel
        roomId={currentRoomId}
        currentUserId={session.userId}
        currentNickname={session.nickname}
        users={users}
        roomPlayers={room?.players ?? []}
        onApplySnapshot={applyRoomSnapshot}
        onError={(message) => {
          toast.error(message)
        }}
      />

      <AnimatePresence>
        {dmTargetUser ? (
          <DirectMessagePanel
            user={dmTargetUser}
            currentUserId={session.userId}
            messages={directMessagesByUserId[dmTargetUser.id] ?? []}
            onClose={closeDirectMessage}
            onSendMessage={sendDirectMessage}
          />
        ) : null}
      </AnimatePresence>
    </div>
  )
}

export default WaitingRoomPage
