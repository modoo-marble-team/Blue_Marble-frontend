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
import { DevPresenceControlPanel } from '../../features/presence/components/DevPresenceControlPanel'
import { useOnlineUsersSocket } from '../../features/presence/useOnlineUsersSocket'
import { useDirectMessageController } from '../../features/presence/useDirectMessageController'
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

  const {
    dmTargetUser,
    directMessagesByUserId,
    unreadDirectMessageCountByUserId,
    openDirectMessage,
    closeDirectMessage,
    sendDirectMessage,
  } = useDirectMessageController({
    session,
    users,
    onBlockedByPlaying: () => {
      toast.error('게임중인 유저에게는 DM을 보낼 수 없습니다.')
    },
  })

  function handleLogout() {
    clearSession()
    navigate('/', { replace: true })
  }

  // 프로필 드롭다운에서 마이페이지 이동 처리
  function handleGoMyPage() {
    navigate('/my-page')
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
          onOpenDirectMessage={openDirectMessage}
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
          onClose={closeDirectMessage}
          onSendMessage={sendDirectMessage}
        />
      ) : null}

      <DevPresenceControlPanel users={users} currentUserId={session.userId} />
    </div>
  )
}

export default LobbyPage
