import { Users } from 'lucide-react'
import type { LobbyRoom, LobbyRoomStatus } from './types'
import { cn } from '../../lib/utils'

// 방 상태별 배지 라벨 매핑
const ROOM_STATUS_LABEL: Record<LobbyRoomStatus, string> = {
  waiting: '대기중',
  playing: '게임중',
}

const ROOM_STATUS_STYLE: Record<LobbyRoomStatus, string> = {
  waiting: 'bg-ui-tag-waiting-bg text-ui-tag-waiting-text',
  playing: 'bg-ui-tag-playing-bg text-ui-tag-playing-text',
}

// 입장 버튼 문구 상수
const JOIN_BUTTON_LABEL = {
  PLAYING: '입장 불가(게임중)',
  FULL: '입장 불가(정원초과)',
  AVAILABLE: '입장하기',
} as const

// 방 상태/정원 기준으로 입장 버튼 라벨 결정
function getJoinButtonLabel(room: LobbyRoom): string {
  // 게임 중인 방은 항상 입장 불가 처리
  if (room.status === 'playing') {
    return JOIN_BUTTON_LABEL.PLAYING
  }
  const isFull = room.currentPlayers >= room.maxPlayers
  return isFull ? JOIN_BUTTON_LABEL.FULL : JOIN_BUTTON_LABEL.AVAILABLE
}

// 방 카드 렌더링 입력값 타입
interface RoomCardProps {
  room: LobbyRoom
  onJoinRoom?: (room: LobbyRoom) => void
}

// 상태 배지, 인원수, 입장 버튼을 포함한 로비 방 카드 렌더링
export function RoomCard({ room, onJoinRoom }: RoomCardProps) {
  const isFull = room.currentPlayers >= room.maxPlayers
  const isJoinDisabled = room.status === 'playing' || isFull
  const joinButtonLabel = getJoinButtonLabel(room)

  return (
    <article className="flex min-h-[160px] select-none flex-col rounded-2xl border border-ui-border bg-ui-surface px-5 py-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-shadow hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)]">
      <div className="flex flex-wrap items-center gap-1.5">
        <span
          className={cn(
            'inline-flex rounded-lg px-2.5 py-0.5 text-xs font-semibold',
            ROOM_STATUS_STYLE[room.status]
          )}
        >
          {ROOM_STATUS_LABEL[room.status]}
        </span>
        {room.isPrivate && (
          <span className="inline-flex rounded-lg bg-ui-tag-private-bg px-2.5 py-0.5 text-xs font-semibold text-ui-tag-private-text">
            비밀방
          </span>
        )}
      </div>

      <h3 className="mt-3 truncate text-[1rem] font-bold leading-snug text-ui-text-primary">
        {room.title}
      </h3>

      <div className="mt-auto flex items-center justify-between gap-3 pt-4">
        <div className="flex items-center gap-1.5 text-sm font-medium text-ui-text-muted">
          <Users
            className="size-4 shrink-0 text-ui-text-subtle"
            strokeWidth={2}
          />
          <span>
            {room.currentPlayers}/{room.maxPlayers}
          </span>
        </div>

        <button
          type="button"
          disabled={isJoinDisabled}
          onClick={() => onJoinRoom?.(room)}
          className={cn(
            'shrink-0 select-none rounded-xl px-4 py-2 text-sm font-semibold transition-colors',
            isJoinDisabled
              ? 'cursor-not-allowed bg-ui-disabled-bg text-ui-disabled-text'
              : 'bg-ui-brand text-white hover:bg-ui-brand-strong active:scale-[0.98]'
          )}
        >
          {joinButtonLabel}
        </button>
      </div>
    </article>
  )
}
