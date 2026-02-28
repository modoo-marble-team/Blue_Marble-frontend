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

  const openedDirectMessageUserId = dmTargetUser?.id

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

  useEffect(() => {
    if (!dmTargetUser) {
      return
    }

    const matchedUser = users.find((user) => user.id === dmTargetUser.id)

    if (!matchedUser) {
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

  function handleGoMyPage() {
    navigate('/my-page')
  }

  function handleOpenDirectMessage(user: OnlineUser) {
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

  function handleSendDirectMessage(message: string) {
    if (!dmTargetUser || !session) {
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

  function handleCloseCreateRoomModal() {
    if (isCreateRoomPending) {
      return
    }

    setIsCreateRoomModalOpen(false)
  }

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

  async function handleSubmitCreateRoom(values: CreateRoomFormValues) {
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
