import { useEffect, useMemo, useState } from 'react'
import { cn } from '../../../lib/utils'
import { emitDirectMessageReceiveMockForDev } from '../direct-message/directMessageSocket'
import { setMockOnlineUserStatus } from '../mock/mockData'
import {
  emitMockOnlineUsersSnapshot,
  isOnlineUsersSocketMockMode,
} from '../online-users/onlineUsersSocket'
import type { OnlineUser, OnlineUserStatus } from '../types'

// DEV 접속자 제어 패널 입력값 타입
interface DevPresenceControlPanelProps {
  users: OnlineUser[]
  currentUserId: string
  className?: string
}

// DEV 환경에서 상대 접속자 상태/DM 수신을 수동 제어
export function DevPresenceControlPanel({
  users,
  currentUserId,
  className,
}: DevPresenceControlPanelProps) {
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState('')
  const [incomingMessage, setIncomingMessage] = useState('테스트 DM')

  const controllableUsers = useMemo(() => {
    return users.filter((user) => user.id !== currentUserId)
  }, [currentUserId, users])

  const selectedUser = controllableUsers.find(
    (user) => user.id === selectedUserId
  )

  // 제어 대상 목록이 바뀌면 기본 선택 유저를 보정
  useEffect(() => {
    if (controllableUsers.length === 0) {
      setSelectedUserId('')
      return
    }

    const hasSelectedUser = controllableUsers.some(
      (user) => user.id === selectedUserId
    )

    if (!hasSelectedUser) {
      setSelectedUserId(controllableUsers[0].id)
    }
  }, [controllableUsers, selectedUserId])

  if (!isOnlineUsersSocketMockMode()) {
    return null
  }

  if (controllableUsers.length === 0) {
    return null
  }

  if (!isPanelOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsPanelOpen(true)}
        className={cn(
          'fixed bottom-4 left-4 z-50 h-9 rounded-xl border border-ui-border bg-white/95 px-3 text-xs font-bold text-ui-text-main shadow-xl',
          className
        )}
      >
        DEV PRESENCE 열기
      </button>
    )
  }

  // 선택 유저 상태를 변경하고 online_users 이벤트를 즉시 갱신
  function handleChangeStatus(status: OnlineUserStatus) {
    if (!selectedUser) {
      return
    }

    setMockOnlineUserStatus(selectedUser.id, status)
    emitMockOnlineUsersSnapshot()
  }

  // 선택 유저가 현재 사용자에게 DM을 보낸 이벤트를 트리거
  function handleEmitIncomingDm() {
    if (!selectedUser) {
      return
    }

    const normalizedMessage = incomingMessage.trim()

    if (normalizedMessage.length === 0) {
      return
    }

    emitDirectMessageReceiveMockForDev({
      message_id: `dev-dm-${Date.now()}`,
      sender_id: selectedUser.id,
      sender_nickname: selectedUser.nickname,
      message: normalizedMessage,
      sent_at: new Date().toISOString(),
    })

    setIncomingMessage('')
  }

  return (
    <aside
      className={cn(
        'fixed bottom-4 left-4 z-50 w-[260px] rounded-2xl border border-ui-border bg-white/95 p-3 shadow-xl',
        className
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-extrabold tracking-wide text-ui-text-main">
          DEV PRESENCE CONTROL
        </h3>
        <button
          type="button"
          onClick={() => setIsPanelOpen(false)}
          className="h-6 rounded-md border border-ui-border px-2 text-[10px] font-bold text-ui-text-sub transition-colors hover:bg-ui-surface-soft"
        >
          숨기기
        </button>
      </div>

      <label
        htmlFor="dev-presence-user-select"
        className="mt-3 block text-[11px] font-semibold text-ui-text-sub"
      >
        제어 유저
      </label>
      <select
        id="dev-presence-user-select"
        value={selectedUserId}
        onChange={(event) => setSelectedUserId(event.target.value)}
        className="mt-1 h-8 w-full rounded-lg border border-ui-border bg-white px-2 text-xs font-medium text-ui-text-main"
      >
        {controllableUsers.map((user) => (
          <option key={user.id} value={user.id}>
            {user.nickname}
          </option>
        ))}
      </select>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => handleChangeStatus('lobby')}
          className={cn(
            'rounded-lg border px-2 py-1.5 text-[11px] font-semibold',
            selectedUser?.status === 'lobby'
              ? 'border-ui-presence-waiting bg-ui-presence-waiting/10 text-ui-presence-waiting'
              : 'border-ui-border bg-white text-ui-text-main'
          )}
        >
          로비
        </button>
        <button
          type="button"
          onClick={() => handleChangeStatus('in_room')}
          className={cn(
            'rounded-lg border px-2 py-1.5 text-[11px] font-semibold',
            selectedUser?.status === 'in_room'
              ? 'border-ui-presence-in-room bg-ui-presence-in-room/10 text-ui-presence-in-room'
              : 'border-ui-border bg-white text-ui-text-main'
          )}
        >
          대기방
        </button>
        <button
          type="button"
          onClick={() => handleChangeStatus('playing')}
          className={cn(
            'rounded-lg border px-2 py-1.5 text-[11px] font-semibold',
            selectedUser?.status === 'playing'
              ? 'border-ui-presence-playing bg-ui-presence-playing/10 text-ui-presence-playing'
              : 'border-ui-border bg-white text-ui-text-main'
          )}
        >
          게임중
        </button>
      </div>

      <label
        htmlFor="dev-presence-incoming-message"
        className="mt-3 block text-[11px] font-semibold text-ui-text-sub"
      >
        수신 DM
      </label>
      <input
        id="dev-presence-incoming-message"
        type="text"
        value={incomingMessage}
        onChange={(event) => setIncomingMessage(event.target.value)}
        placeholder="상대가 보낼 메시지"
        className="mt-1 h-8 w-full rounded-lg border border-ui-border bg-white px-2 text-xs font-medium text-ui-text-main"
      />

      <button
        type="button"
        onClick={handleEmitIncomingDm}
        className="mt-2 h-8 w-full rounded-lg bg-ui-brand text-xs font-semibold text-white hover:bg-ui-brand-strong"
      >
        선택 유저로 DM 수신
      </button>
    </aside>
  )
}
