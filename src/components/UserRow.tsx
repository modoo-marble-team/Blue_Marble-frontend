import { MessageCircle } from 'lucide-react'
import type { LobbyUser } from '../features/lobby/types'
import { cn } from '../lib/utils'

export function UserRow({ user }: { user: LobbyUser }) {
  const isPlaying = user.status === 'PLAYING'

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-ui-surface-muted">
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
            isPlaying ? 'bg-ui-presence-playing' : 'bg-ui-presence-waiting'
          )}
        />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-ui-text-primary">
          {user.nickname}
        </p>
        <p className="text-xs text-ui-text-muted">
          {isPlaying ? '게임 중' : '대기실'}
        </p>
      </div>

      <button
        type="button"
        className="rounded-lg p-2 text-ui-text-subtle transition-colors hover:bg-ui-surface-soft hover:text-ui-text-muted"
        aria-label={`${user.nickname} 채팅`}
      >
        <MessageCircle className="size-4" />
      </button>
    </div>
  )
}
