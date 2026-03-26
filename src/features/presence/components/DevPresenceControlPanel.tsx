import { useEffect, useMemo, useState } from 'react'
import { cn } from '../../../lib/utils'
import { emitDirectMessageReceiveMockForDev } from '../direct-message/directMessageSocket'
import { isOnlineUsersSocketMockMode } from '../online-users/onlineUsersSocket'
import type { OnlineUser } from '../types'

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
  const [incomingMessage, setIncomingMessage] = useState('')

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
        DM 테스트용 패널 열기
      </button>
    )
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
  const canSendIncomingDm =
    selectedUser != null && incomingMessage.trim().length > 0

  return (
    <aside
      className={cn(
        'fixed bottom-4 left-4 z-50 w-[288px] rounded-2xl border border-ui-border bg-white/95 p-3 shadow-xl',
        className
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-extrabold tracking-wide text-ui-text-main">
          DM 테스트용 패널
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

      <form
        className="mt-3 flex min-w-0 items-center gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          handleEmitIncomingDm()
        }}
      >
        <input
          id="dev-presence-incoming-message"
          type="text"
          value={incomingMessage}
          onChange={(event) => setIncomingMessage(event.target.value)}
          aria-label="수신 DM"
          placeholder="DM 테스트 메시지 입력"
          className="min-w-0 h-9 flex-1 rounded-xl border border-ui-border bg-ui-surface-muted px-3 text-sm font-medium text-ui-text-primary outline-none placeholder:text-ui-text-subtle focus:border-ui-brand focus:ring-2 focus:ring-ui-brand/20"
        />

        <button
          type="submit"
          disabled={!canSendIncomingDm}
          className={cn(
            'inline-flex h-9 w-14 shrink-0 items-center justify-center rounded-xl text-sm font-semibold transition-colors',
            canSendIncomingDm
              ? 'bg-ui-brand text-white hover:bg-ui-brand-strong'
              : 'cursor-not-allowed bg-ui-disabled-bg text-ui-disabled-text'
          )}
        >
          전송
        </button>
      </form>
    </aside>
  )
}
