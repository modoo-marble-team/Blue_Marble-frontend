import { MessageCircle } from 'lucide-react'
import { Avatar } from '../../../components/avatar/Avatar'
import { cn } from '../../../lib/utils'
import {
  isDirectMessageAllowed,
  ONLINE_USER_STATUS_DOT_CLASS_MAP,
  ONLINE_USER_STATUS_LABEL_MAP,
} from '../status'
import type { OnlineUser } from '../types'
import { formatUnreadBadgeCount } from '../unreadBadge'

// 접속자 행 렌더링 입력값 타입
interface UserRowProps {
  user: OnlineUser
  isCurrentUser?: boolean
  unreadDirectMessageCount?: number
  onOpenDirectMessage?: (user: OnlineUser) => void
}

// 접속자 1명의 아바타/상태/DM 버튼을 렌더링
export function UserRow({
  user,
  isCurrentUser = false,
  unreadDirectMessageCount = 0,
  onOpenDirectMessage,
}: UserRowProps) {
  const statusLabel = ONLINE_USER_STATUS_LABEL_MAP[user.status]
  const isDmDisabled =
    isCurrentUser ||
    !onOpenDirectMessage ||
    !isDirectMessageAllowed(user.status)

  return (
    <div className="group flex items-center gap-3 px-4 py-2.5 hover:bg-ui-surface-muted">
      <div className="relative shrink-0">
        <Avatar
          size="md"
          displayName={user.nickname}
          backgroundColor={user.avatarBackground}
        />
        <span
          className={cn(
            'absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-white',
            ONLINE_USER_STATUS_DOT_CLASS_MAP[user.status]
          )}
        />
        {unreadDirectMessageCount > 0 ? (
          <span className="absolute -left-1 -top-1 inline-flex h-4 min-w-4 select-none items-center justify-center rounded-full border border-white bg-ui-danger px-1 text-[9px] font-semibold leading-none tracking-tight text-white">
            {formatUnreadBadgeCount(unreadDirectMessageCount)}
          </span>
        ) : null}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-ui-text-primary">
          {user.nickname}
        </p>
        <p className="text-xs text-ui-text-muted">{statusLabel}</p>
      </div>

      <button
        type="button"
        disabled={isDmDisabled}
        onClick={() => {
          // 비활성 상태에서는 DM 열기 동작을 차단
          if (isDmDisabled) {
            return
          }
          onOpenDirectMessage?.(user)
        }}
        className={cn(
          'rounded-lg p-2 text-ui-text-subtle transition',
          isDmDisabled
            ? 'cursor-not-allowed opacity-45'
            : 'hover:bg-ui-surface-soft hover:text-ui-text-muted'
        )}
        aria-label={`${user.nickname} 채팅`}
        title={
          isCurrentUser
            ? '본인에게는 DM을 보낼 수 없습니다.'
            : !isDirectMessageAllowed(user.status)
              ? '게임중인 유저에게는 DM을 보낼 수 없습니다.'
              : isDmDisabled
                ? 'DM 기능을 사용할 수 없습니다.'
                : 'DM 열기'
        }
      >
        <MessageCircle className="size-4" />
      </button>
    </div>
  )
}
