import type { LobbyRoom } from './types'
import { cn } from '../../lib/utils'
import { RoomCard } from './RoomCard'

// 방 그리드 렌더링 입력값 타입
interface RoomGridProps {
  rooms: LobbyRoom[]
  isLoading: boolean
  isError: boolean
  isUserListOpen: boolean
  onJoinRoom?: (room: LobbyRoom) => void
}

// 로딩/에러/빈 상태를 포함한 로비 방 카드 그리드 렌더링
export function RoomGrid({
  rooms,
  isLoading,
  isError,
  isUserListOpen,
  onJoinRoom,
}: RoomGridProps) {
  return (
    <div
      className={cn(
        'mt-4 grid gap-3',
        // 접속자 패널 열림 여부에 따라 카드 열 수를 조절
        isUserListOpen
          ? 'sm:grid-cols-2 xl:grid-cols-3'
          : 'sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4'
      )}
    >
      {isLoading &&
        Array.from({ length: isUserListOpen ? 6 : 8 }).map((_, index) => (
          <div
            key={`room-skeleton-${index}`}
            className="h-[160px] animate-pulse rounded-2xl bg-ui-surface-soft"
          />
        ))}

      {!isLoading && isError && (
        <div className="col-span-full rounded-xl border border-ui-danger-border bg-ui-danger-bg px-4 py-6 text-center text-sm font-medium text-ui-danger">
          방 목록을 불러오지 못했습니다.
        </div>
      )}

      {!isLoading && !isError && rooms.length === 0 && (
        <div className="col-span-full rounded-xl border border-ui-border bg-ui-surface-muted px-4 py-8 text-center text-sm font-medium text-ui-text-muted">
          조건에 맞는 방이 없습니다.
        </div>
      )}

      {!isLoading &&
        !isError &&
        rooms.map((room) => (
          <RoomCard key={room.id} room={room} onJoinRoom={onJoinRoom} />
        ))}
    </div>
  )
}
