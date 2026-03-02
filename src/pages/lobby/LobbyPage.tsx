import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import Header from '../../components/header/Header'
import { useAuthStore } from '../../features/auth/store'
import {
  createProfileMenuItems,
  getAvatarBackground,
  getAvatarText,
} from '../../components/header/profileMenu'
import { UserListPanel } from '../../features/presence/components/UserListPanel'
import { DirectMessagePanel } from '../../features/presence/components/DirectMessagePanel'
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
import type { LobbyRoomFilter } from './api'
import { useLobbyRoomsQuery } from './hooks'
import { LobbyControls } from './LobbyControls'
import { RoomGrid } from './RoomGrid'
import { PrivateRoomJoinModal } from './PrivateRoomJoinModal'
import { CreateRoomModal, type CreateRoomFormValues } from './CreateRoomModal'
import {
  createWaitingRoom,
  getWaitingRoomErrorMessage,
  isJoinPasswordMismatchError,
  joinWaitingRoom,
} from '../waiting-room/api'
import type { LobbyRoom } from './types'
import type { WaitingRoomSnapshot } from '../waiting-room/types'

// 로비 화면 상태 관리와 방/접속자/DM 상호작용 통합 처리
function LobbyPage() {
  const navigate = useNavigate()
  const session = useAuthStore((state) => state.session)
  const clearSession = useAuthStore((state) => state.clearSession)

  const [searchRoom, setSearchRoom] = useState('')
  const [roomFilter, setRoomFilter] = useState<LobbyRoomFilter>('ALL')
  const [excludePrivateRoom, setExcludePrivateRoom] = useState(false)
  const [isUserListOpen, setIsUserListOpen] = useState(true)
  const [isCreateRoomModalOpen, setIsCreateRoomModalOpen] = useState(false)
  const [isCreateRoomPending, setIsCreateRoomPending] = useState(false)
  const [dmTargetUser, setDmTargetUser] = useState<OnlineUser | null>(null)
  const [directMessagesByUserId, setDirectMessagesByUserId] = useState<
    Record<string, DirectMessage[]>
  >({})
  const [
    unreadDirectMessageCountByUserId,
    setUnreadDirectMessageCountByUserId,
  ] = useState<Record<string, number>>({})
  const [selectedPrivateRoom, setSelectedPrivateRoom] =
    useState<LobbyRoom | null>(null)
  const [privateRoomPassword, setPrivateRoomPassword] = useState('')
  const [isPrivateRoomJoinPending, setIsPrivateRoomJoinPending] =
    useState(false)
  const [isPrivateRoomPasswordInvalid, setIsPrivateRoomPasswordInvalid] =
    useState(false)

  // 세션 유효성에 따라 홈 또는 닉네임 설정 페이지로 이동
  useEffect(() => {
    // 로그인 세션이 없으면 홈으로 이동
    if (!session) {
      navigate('/', { replace: true })
      return
    }

    // 닉네임 미설정 세션은 닉네임 설정 페이지로 이동
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

  const openedDirectMessageUserId = dmTargetUser?.id

  // DM 수신 이벤트를 구독해 대화 목록과 unread 카운트를 갱신
  useEffect(() => {
    // 비로그인 상태에서는 구독을 등록하지 않음
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

          // 동일 메시지 ID는 중복 삽입을 방지
          if (hasSameMessage) {
            return previousMessagesByUserId
          }

          return {
            ...previousMessagesByUserId,
            [payload.sender_id]: [...previousMessages, receivedMessage],
          }
        })

        // 현재 열려 있는 사용자 메시지는 unread 카운트에서 제외
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

  // 접속자 목록 갱신 시 DM 대상 사용자 참조를 최신 객체로 동기화
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

  function handleLogout() {
    clearSession()
    navigate('/', { replace: true })
  }

  // 프로필 드롭다운에서 마이페이지 이동 처리
  function handleGoMyPage() {
    navigate('/my-page')
  }

  // DM 창을 열고 해당 사용자 unread 카운트를 초기화
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

  // 로컬 DM 목록에 메시지를 추가하고 소켓 전송 실행
  function handleSendDirectMessage(message: string) {
    // 대상 사용자 또는 세션이 없으면 전송 중단
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

  function handleOpenCreateRoomModal() {
    setIsCreateRoomModalOpen(true)
  }

  // 방 생성 요청 중에는 모달 닫기를 막아 중복 동작 방지
  function handleCloseCreateRoomModal() {
    if (isCreateRoomPending) {
      return
    }

    setIsCreateRoomModalOpen(false)
  }

  // 비밀방은 비밀번호 모달을 열고, 일반방은 바로 입장 처리
  function handleJoinRoom(room: LobbyRoom) {
    if (room.isPrivate) {
      setSelectedPrivateRoom(room)
      setPrivateRoomPassword('')
      setIsPrivateRoomPasswordInvalid(false)
      return
    }

    handleEnterWaitingRoom(room)
  }

  function handleClosePrivateRoomModal() {
    setSelectedPrivateRoom(null)
    setPrivateRoomPassword('')
    setIsPrivateRoomPasswordInvalid(false)
  }

  // 대기방 페이지로 이동하면서 roomId/title/snapshot을 전달
  function handleEnterWaitingRoom(
    room: LobbyRoom,
    preJoinedSnapshot?: WaitingRoomSnapshot
  ) {
    navigate(`/rooms/${room.id}`, {
      state: {
        roomId: room.id,
        roomTitle: room.title,
        preJoinedSnapshot,
      },
    })
  }

  // 방 생성 API를 호출하고 성공 시 생성된 대기방으로 이동
  async function handleSubmitCreateRoom(values: CreateRoomFormValues) {
    // 세션이 없으면 생성 요청을 보내지 않음
    if (!session) {
      return
    }

    setIsCreateRoomPending(true)

    try {
      const createdRoom = await createWaitingRoom({
        title: values.title,
        isPrivate: values.isPrivate,
        password: values.password,
        hostUserId: session.userId,
        hostNickname: session.nickname,
      })

      setIsCreateRoomModalOpen(false)
      navigate(`/rooms/${createdRoom.roomId}`, {
        state: {
          roomId: createdRoom.roomId,
          roomTitle: createdRoom.roomTitle,
          preJoinedSnapshot: createdRoom.preJoinedSnapshot,
        },
      })
    } catch (error) {
      toast.error(getWaitingRoomErrorMessage(error, '방 생성에 실패했습니다.'))
    } finally {
      setIsCreateRoomPending(false)
    }
  }

  // 비밀방 비밀번호 검증 입장 요청 처리
  async function handleSubmitPrivateRoomJoin() {
    if (!selectedPrivateRoom || !session) {
      return
    }

    setIsPrivateRoomJoinPending(true)

    try {
      const joinedRoomSnapshot = await joinWaitingRoom({
        roomId: selectedPrivateRoom.id,
        userId: session.userId,
        nickname: session.nickname,
        fallbackTitle: selectedPrivateRoom.title,
        password: privateRoomPassword,
      })

      handleEnterWaitingRoom(selectedPrivateRoom, joinedRoomSnapshot)
      handleClosePrivateRoomModal()
    } catch (error) {
      // 비밀번호 불일치 에러는 인풋 에러 상태를 별도 표시
      if (isJoinPasswordMismatchError(error)) {
        setIsPrivateRoomPasswordInvalid(true)
      }

      toast.error(
        getWaitingRoomErrorMessage(error, '비밀방 입장에 실패했습니다.')
      )
    } finally {
      setIsPrivateRoomJoinPending(false)
    }
  }

  // 리다이렉트 대상 세션 상태면 화면 렌더링 생략
  if (!session || session.needsNicknameSetup) {
    return null
  }

  const avatarText = getAvatarText(session.nickname)
  const avatarBackground = getAvatarBackground(session.isGuest)
  const headerMenuItems = createProfileMenuItems({
    isGuest: session.isGuest,
    onGoMyPage: handleGoMyPage,
    onLogout: handleLogout,
  })

  return (
    <div className="min-h-screen bg-ui-app-bg">
      <Header
        playerLabel={session.nickname}
        avatarText={avatarText}
        avatarBackground={avatarBackground}
        menuItems={headerMenuItems}
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
            onCreateRoom={handleOpenCreateRoomModal}
          />

          <RoomGrid
            rooms={rooms}
            isLoading={isRoomsLoading}
            isError={isRoomsError}
            isUserListOpen={isUserListOpen}
            onJoinRoom={handleJoinRoom}
          />
        </section>

        <UserListPanel
          users={users}
          isLoading={isUsersLoading}
          isError={isUsersError}
          isOpen={isUserListOpen}
          currentUserId={session.userId}
          unreadDirectMessageCountByUserId={unreadDirectMessageCountByUserId}
          onOpenDirectMessage={handleOpenDirectMessage}
          onToggle={() => setIsUserListOpen((prev) => !prev)}
        />
      </main>

      {selectedPrivateRoom ? (
        <PrivateRoomJoinModal
          roomTitle={selectedPrivateRoom.title}
          password={privateRoomPassword}
          isSubmitting={isPrivateRoomJoinPending}
          isPasswordInvalid={isPrivateRoomPasswordInvalid}
          onPasswordChange={(password) => {
            setPrivateRoomPassword(password)
            if (isPrivateRoomPasswordInvalid) {
              setIsPrivateRoomPasswordInvalid(false)
            }
          }}
          onClose={handleClosePrivateRoomModal}
          onSubmit={() => {
            void handleSubmitPrivateRoomJoin()
          }}
        />
      ) : null}

      {isCreateRoomModalOpen ? (
        <CreateRoomModal
          defaultRoomTitle={`${session.nickname}님의 방`}
          isSubmitting={isCreateRoomPending}
          onClose={handleCloseCreateRoomModal}
          onSubmit={(values) => {
            void handleSubmitCreateRoom(values)
          }}
        />
      ) : null}

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

export default LobbyPage
