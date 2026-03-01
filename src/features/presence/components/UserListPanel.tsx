import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '../../../lib/utils'
import { ONLINE_USER_STATUS_DOT_CLASS_MAP } from '../status'
import type { OnlineUser } from '../types'
import { formatUnreadBadgeCount } from '../unreadBadge'
import { UserRow } from './UserRow'

// 접속자 목록 패널 렌더링 입력값 타입
interface UserListPanelProps {
  users: OnlineUser[]
  isLoading: boolean
  isError: boolean
  isOpen: boolean
  onToggle: () => void
  currentUserId?: string
  unreadDirectMessageCountByUserId?: Record<string, number>
  onOpenDirectMessage?: (user: OnlineUser) => void
  heightMode?: 'screen' | 'full'
  disableWidthTransition?: boolean
}

// 접속자 목록 패널의 열림/닫힘 UI와 목록 상태 렌더링
export function UserListPanel({
  users,
  isLoading,
  isError,
  isOpen,
  onToggle,
  currentUserId,
  unreadDirectMessageCountByUserId = {},
  onOpenDirectMessage,
  heightMode = 'screen',
  disableWidthTransition = false,
}: UserListPanelProps) {
  const panelHeightClass =
    heightMode === 'full' ? 'h-full' : 'xl:min-h-[calc(100vh-7rem)]'
  const panelContainerHeightClass = heightMode === 'full' ? 'h-full' : undefined
  const widthTransitionClass = disableWidthTransition
    ? undefined
    : 'transition-[width] duration-300'

  return (
    <aside
      className={cn(
        'shrink-0 overflow-hidden rounded-2xl border border-ui-border bg-ui-surface shadow-sm',
        panelContainerHeightClass,
        widthTransitionClass,
        isOpen ? 'w-full xl:w-[280px]' : 'w-full xl:w-[72px]'
      )}
    >
      {isOpen ? (
        <div
          className={cn('flex h-full min-h-[280px] flex-col', panelHeightClass)}
        >
          <div className="flex items-center justify-between border-b border-ui-border px-4 py-3">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-ui-text-strong">
                접속자 목록
              </h2>
              <span className="rounded-full bg-ui-brand-soft px-2 py-0.5 text-xs font-semibold text-ui-brand">
                {users.length}명
              </span>
            </div>
            <button
              type="button"
              onClick={onToggle}
              className="rounded-lg p-1.5 text-ui-text-subtle transition-colors hover:bg-ui-surface-soft hover:text-ui-text-muted"
              aria-label="접속자 목록 닫기"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {isLoading &&
              Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={`user-skeleton-${index}`}
                  className="mx-4 my-3 flex items-center gap-3"
                >
                  <div className="size-10 animate-pulse rounded-full bg-ui-surface-soft" />
                  <div className="flex-1 space-y-1">
                    <div className="h-3 w-20 animate-pulse rounded bg-ui-surface-soft" />
                    <div className="h-2.5 w-12 animate-pulse rounded bg-ui-surface-soft" />
                  </div>
                </div>
              ))}

            {!isLoading && isError && (
              <p className="px-4 py-6 text-center text-sm font-medium text-ui-danger">
                접속자 목록을 불러오지 못했습니다.
              </p>
            )}

            {!isLoading &&
              !isError &&
              users.map((user) => (
                <UserRow
                  key={user.id}
                  user={user}
                  isCurrentUser={currentUserId === user.id}
                  unreadDirectMessageCount={
                    unreadDirectMessageCountByUserId[user.id] ?? 0
                  }
                  onOpenDirectMessage={onOpenDirectMessage}
                />
              ))}
          </div>
        </div>
      ) : (
        <div
          className={cn(
            'flex min-h-[120px] items-center gap-2 overflow-x-auto p-3 xl:flex-col xl:items-center xl:justify-start xl:overflow-visible',
            panelHeightClass
          )}
        >
          <button
            type="button"
            onClick={onToggle}
            className="rounded-lg p-2 text-ui-text-subtle transition-colors hover:bg-ui-surface-soft hover:text-ui-text-muted"
            aria-label="접속자 목록 열기"
          >
            <ChevronLeft className="size-4" />
          </button>

          <span className="rounded-full bg-ui-brand-soft px-2 py-0.5 text-xs font-semibold text-ui-brand">
            {users.length}
          </span>

          <div className="flex items-center gap-2 xl:mt-2 xl:flex-col">
            {!isLoading &&
              !isError &&
              users.map((user) => (
                <div key={user.id} className="relative">
                  <div
                    className="flex size-9 items-center justify-center rounded-full text-xs font-semibold text-ui-text-strong"
                    style={{ backgroundColor: user.avatarBackground }}
                  >
                    {user.avatarText}
                  </div>
                  <span
                    className={cn(
                      'absolute -bottom-0.5 -right-0.5 size-2 rounded-full border-2 border-white',
                      ONLINE_USER_STATUS_DOT_CLASS_MAP[user.status]
                    )}
                  />
                  {(unreadDirectMessageCountByUserId[user.id] ?? 0) > 0 ? (
                    <span className="absolute -left-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full border-2 border-white bg-ui-danger px-1 text-[10px] font-bold leading-none text-white">
                      {formatUnreadBadgeCount(
                        unreadDirectMessageCountByUserId[user.id] ?? 0
                      )}
                    </span>
                  ) : null}
                </div>
              ))}
          </div>
        </div>
      )}
    </aside>
  )
}
