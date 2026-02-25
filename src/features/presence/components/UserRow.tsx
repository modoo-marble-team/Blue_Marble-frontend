import { MessageCircle } from 'lucide-react'
import { cn } from '../../../lib/utils'
import {
  ONLINE_USER_STATUS_DOT_CLASS_MAP,
  ONLINE_USER_STATUS_LABEL_MAP,
} from '../status'
import type { OnlineUser } from '../types'

export function UserRow({ user }: { user: OnlineUser }) {
  const isPlaying = user.status === 'playing'
  const statusLabel = ONLINE_USER_STATUS_LABEL_MAP[user.status]
  const isDmDisabled = isPlaying

  return (
    <div className="group flex items-center gap-3 px-4 py-2.5 hover:bg-ui-surface-muted">
      <div className="relative shrink-0">
        <div
          className="flex size-10 items-center justify-center rounded-full text-sm font-semibold text-ui-text-strong"
          style={{ backgroundColor: user.avatarBackground }}
        >
          {user.avatarText}
        </div>
        <span
          className={cn(
            'absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-white',
            ONLINE_USER_STATUS_DOT_CLASS_MAP[user.status]
          )}
        />
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
        className={cn(
          'rounded-lg p-2 text-ui-text-subtle transition-opacity transition-colors sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100',
          isDmDisabled
            ? 'cursor-not-allowed opacity-45'
            : 'hover:bg-ui-surface-soft hover:text-ui-text-muted'
        )}
        aria-label={`${user.nickname} 채팅`}
        title={isDmDisabled ? '게임 중에는 DM을 보낼 수 없습니다.' : 'DM 열기'}
      >
        <MessageCircle className="size-4" />
      </button>
    </div>
  )
}
