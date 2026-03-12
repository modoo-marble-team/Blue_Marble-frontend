import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useMemo } from 'react'
import { Avatar } from '../../../components/avatar/Avatar'
import { cn } from '../../../lib/utils'
import { ONLINE_USER_STATUS_DOT_CLASS_MAP } from '../status'
import type { OnlineUser, OnlineUserStatus } from '../types'
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

// 접속자 상태 정렬 우선순위(낮을수록 위)
const ONLINE_USER_STATUS_PRIORITY: Record<OnlineUserStatus, number> = {
  lobby: 0,
  in_room: 1,
  playing: 2,
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
    heightMode === 'full'
      ? 'h-full'
      : 'h-[calc(100dvh-6rem)] sm:h-[calc(100dvh-7rem)]'
  const panelContainerHeightClass =
    heightMode === 'full'
      ? 'h-full'
      : 'h-[calc(100dvh-6rem)] sm:h-[calc(100dvh-7rem)]'
  const widthTransitionClass = disableWidthTransition
    ? undefined
    : 'transition-[width] duration-300'
  const sortedUsers = useMemo(() => {
    return [...users].sort((firstUser, secondUser) => {
      // 1) 현재 사용자 최우선
      if (currentUserId && firstUser.id === currentUserId) {
        return -1
      }
      if (currentUserId && secondUser.id === currentUserId) {
        return 1
      }

      // 2) 상태 우선순위(lobby -> in_room -> playing)
      const statusPriorityDiff =
        ONLINE_USER_STATUS_PRIORITY[firstUser.status] -
        ONLINE_USER_STATUS_PRIORITY[secondUser.status]
      if (statusPriorityDiff !== 0) {
        return statusPriorityDiff
      }

      // 3) 같은 상태는 닉네임 가나다순
      const nicknameCompare = firstUser.nickname.localeCompare(
        secondUser.nickname,
        'ko-KR'
      )
      if (nicknameCompare !== 0) {
        return nicknameCompare
      }

      return firstUser.id.localeCompare(secondUser.id)
    })
  }, [currentUserId, users])

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
          <div className="flex items-center justify-between border-b border-ui-border px-4 py-3 select-none">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-ui-text-strong">
                접속자 목록
              </h2>
              <span className="rounded-full bg-ui-brand-soft px-2 py-0.5 text-xs font-semibold text-ui-brand">
                {sortedUsers.length}명
              </span>
            </div>
            <button
              type="button"
              onClick={onToggle}
              className="rounded-lg p-1.5 text-ui-text-subtle transition-colors hover:bg-ui-surface-soft hover:text-ui-text-muted select-none"
              aria-label="접속자 목록 닫기"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>

          <div className="ui-scrollbar flex-1 overflow-y-auto">
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
              sortedUsers.map((user) => (
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
            'ui-scrollbar flex min-h-[120px] items-center gap-2 overflow-x-auto p-3 xl:flex-col xl:items-center xl:justify-start xl:overflow-visible',
            panelHeightClass
          )}
        >
          <button
            type="button"
            onClick={onToggle}
            className="rounded-lg p-2 text-ui-text-subtle transition-colors hover:bg-ui-surface-soft hover:text-ui-text-muted select-none"
            aria-label="접속자 목록 열기"
          >
            <ChevronLeft className="size-4" />
          </button>

          <span className="rounded-full bg-ui-brand-soft px-2 py-0.5 text-xs font-semibold text-ui-brand select-none">
            {sortedUsers.length}
          </span>

          <div className="flex items-center gap-2 xl:mt-2 xl:flex-col">
            {!isLoading &&
              !isError &&
              sortedUsers.map((user) => (
                <div key={user.id} className="relative">
                  <Avatar
                    size="sm"
                    displayName={user.nickname}
                    backgroundColor={user.avatarBackground}
                  />
                  <span
                    className={cn(
                      'absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-white',
                      ONLINE_USER_STATUS_DOT_CLASS_MAP[user.status]
                    )}
                  />
                  {(unreadDirectMessageCountByUserId[user.id] ?? 0) > 0 ? (
                    <span className="absolute -left-1 -top-1 inline-flex h-4 min-w-4 select-none items-center justify-center rounded-full border border-white bg-ui-danger px-1 text-[9px] font-semibold leading-none tracking-tight text-white">
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
