import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
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
import { useDirectMessageController } from '../../features/presence/direct-message/useDirectMessageController'
import {
  removeMockOnlineUser,
  setMockOnlineUserStatus,
} from '../../features/presence/mock/mockData'
import { mergeOnlineUsersWithCurrentUser } from '../../features/presence/online-users/onlineUsersModel'
import { useOnlineUsersSocket } from '../../features/presence/online-users/useOnlineUsersSocket'
import type { LobbyRoomFilter } from './api'
import { useLobbyRoomsQuery } from './hooks'
import { LobbyControls } from './LobbyControls'
import { RoomGrid } from './RoomGrid'
import { PrivateRoomJoinModal } from './PrivateRoomJoinModal'
import { CreateRoomModal } from './CreateRoomModal'
import { useLobbyRoomActions } from './useLobbyRoomActions'
import { IS_SOCKET_MOCK_ENABLED } from '../../config/env'
import { disconnectSocketAndClearAuth } from '../../lib/socket'

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

  const lobbyUsers = useMemo(() => {
    if (!session) {
      return users
    }

    return mergeOnlineUsersWithCurrentUser(users, {
      id: session.userId,
      nickname: session.nickname,
      status: 'lobby',
    })
  }, [session, users])

  const {
    dmTargetUser,
    directMessagesByUserId,
    unreadDirectMessageCountByUserId,
    openDirectMessage,
    closeDirectMessage,
    sendDirectMessage,
  } = useDirectMessageController({
    session,
    users: lobbyUsers,
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
    if (IS_SOCKET_MOCK_ENABLED && session) {
      removeMockOnlineUser(session.userId)
    }

    clearSession()
    disconnectSocketAndClearAuth()
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
    <div className="relative min-h-screen overflow-hidden bg-ui-app-bg">
      <div className="pointer-events-none absolute inset-x-0 bottom-0 top-14">
        <img
          src="/LobbyPage_background.webp"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_28%,rgba(255,255,255,0.34),transparent_30%),linear-gradient(180deg,rgba(250,248,240,0.38),rgba(250,248,240,0.5))]" />
      </div>

      <Header
        playerLabel={session.nickname}
        avatarText={avatarText}
        avatarBackground={avatarBackground}
        menuItems={headerMenuItems}
      />

      <main className="relative flex flex-col gap-4 p-4 sm:p-6 xl:flex-row xl:items-start">
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
            users={lobbyUsers}
            isLoading={isUsersLoading}
            isError={isUsersError}
            isOpen={isUserListOpen}
            currentUserId={session.userId}
            activeDirectMessageUserId={dmTargetUser?.id}
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

      <DevPresenceControlPanel
        users={lobbyUsers}
        currentUserId={session.userId}
      />
    </div>
  )
}

export default LobbyPage
