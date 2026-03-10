import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import Header from '../../components/header/Header'
import { useRequireActiveSession } from '../../features/auth/hooks/useRequireActiveSession'
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
import { setMockOnlineUserStatus } from '../../features/presence/mockData'
import type { LobbyRoomFilter } from './api'
import { useLobbyRoomsQuery } from './hooks'
import { LobbyControls } from './LobbyControls'
import { RoomGrid } from './RoomGrid'
import { PrivateRoomJoinModal } from './PrivateRoomJoinModal'
import { CreateRoomModal } from './CreateRoomModal'
import { useLobbyRoomActions } from './useLobbyRoomActions'
import { IS_SOCKET_MOCK_ENABLED } from '../../config/env'

// 로비 화면 상태 관리와 방/접속자/DM 상호작용 통합 처리
function LobbyPage() {
  const navigate = useNavigate()
  const session = useAuthStore((state) => state.session)
  const clearSession = useAuthStore((state) => state.clearSession)

  const [searchRoom, setSearchRoom] = useState('')
  const [roomFilter, setRoomFilter] = useState<LobbyRoomFilter>('ALL')
  const [excludePrivateRoom, setExcludePrivateRoom] = useState(false)
  const [isUserListOpen, setIsUserListOpen] = useState(true)
  const isAllowedSession = useRequireActiveSession(session)
  const {
    isCreateRoomModalOpen,
    isCreateRoomPending,
    selectedPrivateRoom,
    privateRoomPassword,
    isPrivateRoomJoinPending,
    isPrivateRoomPasswordInvalid,
    openCreateRoomModal,
    closeCreateRoomModal,
    joinRoom,
    closePrivateRoomModal,
    changePrivateRoomPassword,
    submitCreateRoom,
    submitPrivateRoomJoin,
  } = useLobbyRoomActions({ session })

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

  // 목 모드에서는 로비 진입 시 현재 사용자를 접속자 목록에 즉시 반영
  useEffect(() => {
    if (!IS_SOCKET_MOCK_ENABLED || !session) {
      return
    }

    setMockOnlineUserStatus(session.userId, 'lobby', session.nickname)
  }, [session])

  function handleLogout() {
    clearSession()
    navigate('/', { replace: true })
  }

  // 프로필 드롭다운에서 마이페이지 이동 처리
  function handleGoMyPage() {
    navigate('/my-page')
  }

  // 리다이렉트 대상 세션 상태면 화면 렌더링 생략
  if (!isAllowedSession || !session) {
    return null
  }

  const avatarText = getAvatarText(session.nickname)
  const avatarBackground = getAvatarBackground(session.userId)
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

      <main className="flex flex-col gap-4 p-4 sm:p-6 xl:flex-row xl:items-start">
        <section className="min-w-0 flex-1">
          <LobbyControls
            searchKeyword={searchRoom}
            roomFilter={roomFilter}
            excludePrivateRoom={excludePrivateRoom}
            onSearchKeywordChange={setSearchRoom}
            onRoomFilterChange={setRoomFilter}
            onExcludePrivateRoomChange={setExcludePrivateRoom}
            onCreateRoom={openCreateRoomModal}
          />

          <RoomGrid
            rooms={rooms}
            isLoading={isRoomsLoading}
            isError={isRoomsError}
            isUserListOpen={isUserListOpen}
            onJoinRoom={joinRoom}
          />
        </section>

        <div className="xl:sticky xl:top-20 xl:self-start">
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
        </div>
      </main>

      {selectedPrivateRoom ? (
        <PrivateRoomJoinModal
          roomTitle={selectedPrivateRoom.title}
          password={privateRoomPassword}
          isSubmitting={isPrivateRoomJoinPending}
          isPasswordInvalid={isPrivateRoomPasswordInvalid}
          onPasswordChange={changePrivateRoomPassword}
          onClose={closePrivateRoomModal}
          onSubmit={() => {
            void submitPrivateRoomJoin()
          }}
        />
      ) : null}

      {isCreateRoomModalOpen ? (
        <CreateRoomModal
          defaultRoomTitle={`${session.nickname}님의 방`}
          isSubmitting={isCreateRoomPending}
          onClose={closeCreateRoomModal}
          onSubmit={(values) => {
            void submitCreateRoom(values)
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
