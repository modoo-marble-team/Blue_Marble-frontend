import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useAuthStore } from '../../features/auth/store'
import {
  createProfileMenuItems,
  getAvatarBackground,
  getAvatarText,
} from '../../components/header/profileMenu'
import { DirectMessagePanel } from '../../features/presence/components/DirectMessagePanel'
import { UserListPanel } from '../../features/presence/components/UserListPanel'
import {
  sendDirectMessage,
  subscribeDirectMessageSocketEvents,
} from '../../features/presence/directMessageSocket'
import { useOnlineUsersSocket } from '../../features/presence/hooks'
import { isDirectMessageAllowed } from '../../features/presence/status'
import type {
  DirectMessage,
  DirectMessageReceiveSocketPayload,
  OnlineUser,
} from '../../features/presence/types'
import { cn } from '../../lib/utils'
import { WaitingRoomHeader } from './components/WaitingRoomHeader'
import { WaitingSeatCard } from './components/WaitingSeatCard'
import { WaitingRoomSidePanel } from './components/WaitingRoomSidePanel'
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
  const [dmTargetUser, setDmTargetUser] = useState<OnlineUser | null>(null)
  const [directMessagesByUserId, setDirectMessagesByUserId] = useState<
    Record<string, DirectMessage[]>
  >({})
  const [
    unreadDirectMessageCountByUserId,
    setUnreadDirectMessageCountByUserId,
  ] = useState<Record<string, number>>({})

  const locationState = location.state as WaitingRoomLocationState | null
  const isSameRoomState = locationState?.roomId === currentRoomId
  const selectedRoomTitle = isSameRoomState ? locationState?.roomTitle : null
  const preJoinedSnapshot = isSameRoomState
    ? (locationState?.preJoinedSnapshot ?? null)
    : null

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
    preJoinedSnapshot,
    onGameStart: handleGameStart,
  })

  const {
    data: users = [],
    isLoading: isUsersLoading,
    isError: isUsersError,
  } = useOnlineUsersSocket()

  const openedDirectMessageUserId = dmTargetUser?.id

  // URL/세션 상태 검증 후 잘못된 진입을 리다이렉트
  useEffect(() => {
    if (!currentRoomId) {
      navigate('/lobby', { replace: true })
      return
    }

    // 비로그인 사용자는 홈으로 이동
    if (!session) {
      navigate('/', { replace: true })
      return
    }

    // 닉네임 미설정 사용자는 닉네임 설정 화면으로 이동
    if (session.needsNicknameSetup) {
      navigate('/nickname-setup', { replace: true })
    }
  }, [currentRoomId, navigate, session])

  // 대기방 로딩 에러를 토스트로 표시
  useEffect(() => {
    if (!roomErrorMessage) {
      return
    }

    toast.error(roomErrorMessage)
  }, [roomErrorMessage])

  // DM 수신 이벤트를 구독해 메시지 목록/unread 상태를 갱신
  useEffect(() => {
    if (!session) {
      return
    }

    const unsubscribe = subscribeDirectMessageSocketEvents({
      onReceive: (payload: DirectMessageReceiveSocketPayload) => {
        const receivedMessage: DirectMessage = {
          id: `${payload.sender_id}-${payload.sent_at}`,
          senderId: payload.sender_id,
          senderNickname: payload.sender_nickname,
          content: payload.message,
          sentAt: payload.sent_at,
        }

        setDirectMessagesByUserId((previousMessagesByUserId) => {
          const previousMessages =
            previousMessagesByUserId[payload.sender_id] ?? []
          const hasSameMessage = previousMessages.some(
            (message) => message.id === receivedMessage.id
          )

          // 동일 메시지는 중복 저장하지 않음
          if (hasSameMessage) {
            return previousMessagesByUserId
          }

          return {
            ...previousMessagesByUserId,
            [payload.sender_id]: [...previousMessages, receivedMessage],
          }
        })

        if (payload.sender_id === openedDirectMessageUserId) {
          return
        }

        setUnreadDirectMessageCountByUserId((previousCountByUserId) => {
          const previousCount = previousCountByUserId[payload.sender_id] ?? 0

          return {
            ...previousCountByUserId,
            [payload.sender_id]: previousCount + 1,
          }
        })
      },
    })

    return () => {
      unsubscribe()
    }
  }, [openedDirectMessageUserId, session])

  // 접속자 목록 갱신 시 DM 대상 사용자 참조를 동기화
  useEffect(() => {
    if (!dmTargetUser) {
      return
    }

    const matchedUser = users.find((user) => user.id === dmTargetUser.id)

    if (!matchedUser) {
      setDmTargetUser(null)
      return
    }

    if (!isDirectMessageAllowed(matchedUser.status)) {
      setDmTargetUser(null)
      return
    }

    if (matchedUser !== dmTargetUser) {
      setDmTargetUser(matchedUser)
    }
  }, [dmTargetUser, users])

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

    clearSession()
    navigate('/', { replace: true })
  }, [clearSession, leaveRoom, navigate])

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

  // DM 창을 열고 해당 사용자 unread 카운트를 제거
  function handleOpenDirectMessage(user: OnlineUser) {
    if (!isDirectMessageAllowed(user.status)) {
      toast.error('게임중인 유저에게는 DM을 보낼 수 없습니다.')
      return
    }

    setDmTargetUser(user)
    setUnreadDirectMessageCountByUserId((previousCountByUserId) => {
      if (!previousCountByUserId[user.id]) {
        return previousCountByUserId
      }

      const nextCountByUserId = { ...previousCountByUserId }
      delete nextCountByUserId[user.id]
      return nextCountByUserId
    })
  }

  function handleCloseDirectMessage() {
    setDmTargetUser(null)
  }

  // DM 메시지를 로컬 목록에 반영한 뒤 소켓으로 전송
  function handleSendDirectMessage(message: string) {
    // 세션 또는 대상이 없으면 전송 중단
    if (!dmTargetUser || !session) {
      return
    }

    if (!isDirectMessageAllowed(dmTargetUser.status)) {
      toast.error('게임중인 유저에게는 DM을 보낼 수 없습니다.')
      return
    }

    const targetUserId = dmTargetUser.id
    const nextDirectMessage: DirectMessage = {
      id: `${targetUserId}-${Date.now()}`,
      senderId: session.userId,
      senderNickname: session.nickname,
      content: message,
      sentAt: new Date().toISOString(),
    }

    setDirectMessagesByUserId((previousMessagesByUserId) => {
      const previousMessages = previousMessagesByUserId[targetUserId] ?? []

      return {
        ...previousMessagesByUserId,
        [targetUserId]: [...previousMessages, nextDirectMessage],
      }
    })

    sendDirectMessage({
      receiverId: dmTargetUser.id,
      receiverNickname: dmTargetUser.nickname,
      message,
    })
  }

  // 리다이렉트 대상 상태에서는 화면 렌더링 생략
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
              currentUserId={session.userId}
              unreadDirectMessageCountByUserId={
                unreadDirectMessageCountByUserId
              }
              onOpenDirectMessage={handleOpenDirectMessage}
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

      {dmTargetUser ? (
        <DirectMessagePanel
          user={dmTargetUser}
          currentUserId={session.userId}
          messages={directMessagesByUserId[dmTargetUser.id] ?? []}
          onClose={handleCloseDirectMessage}
          onSendMessage={handleSendDirectMessage}
        />
      ) : null}
    </div>
  )
}

export default WaitingRoomPage
