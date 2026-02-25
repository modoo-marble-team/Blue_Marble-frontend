import { Plus, Search } from 'lucide-react'
import type { LobbyRoomFilter } from './api'
import { cn } from '../../lib/utils'

interface LobbyControlsProps {
  searchKeyword: string
  roomFilter: LobbyRoomFilter
  excludePrivateRoom: boolean
  onSearchKeywordChange: (value: string) => void
  onRoomFilterChange: (filter: LobbyRoomFilter) => void
  onExcludePrivateRoomChange: (next: boolean) => void
  onCreateRoom?: () => void
}

const ROOM_FILTERS: Array<{ value: LobbyRoomFilter; label: string }> = [
  { value: 'ALL', label: '전체' },
  { value: 'waiting', label: '대기중' },
  { value: 'playing', label: '게임중' },
]

export function LobbyControls({
  searchKeyword,
  roomFilter,
  excludePrivateRoom,
  onSearchKeywordChange,
  onRoomFilterChange,
  onExcludePrivateRoomChange,
  onCreateRoom,
}: LobbyControlsProps) {
  return (
    <div className="rounded-2xl border border-ui-border bg-ui-surface p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ui-text-subtle" />
          <input
            value={searchKeyword}
            onChange={(event) => onSearchKeywordChange(event.target.value)}
            placeholder="방 제목을 검색하세요..."
            className="h-10 w-full rounded-xl border border-ui-border bg-ui-surface-muted pl-10 pr-4 text-sm text-ui-text-primary outline-none placeholder:text-ui-text-subtle focus:border-ui-brand focus:ring-2 focus:ring-ui-brand/20"
          />
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={onCreateRoom}
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-ui-brand px-4 text-sm font-semibold text-white transition-colors hover:bg-ui-brand-strong active:scale-[0.98]"
          >
            <Plus className="size-4" />방 만들기
          </button>

          <div className="inline-flex items-center gap-2">
            <button
              type="button"
              role="switch"
              aria-checked={excludePrivateRoom}
              onClick={() => onExcludePrivateRoomChange(!excludePrivateRoom)}
              className={cn(
                'relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors',
                excludePrivateRoom ? 'bg-ui-brand' : 'bg-ui-text-subtle/40'
              )}
            >
              <span
                className={cn(
                  'absolute left-0.5 top-0.5 size-5 rounded-full bg-white shadow transition-transform',
                  excludePrivateRoom ? 'translate-x-5' : 'translate-x-0'
                )}
              />
            </button>
            <span className="text-sm font-medium text-ui-text-muted">
              비밀방 제외
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4 flex gap-1 rounded-xl bg-ui-surface-soft p-1">
        {ROOM_FILTERS.map((filter) => (
          <button
            key={filter.value}
            type="button"
            onClick={() => onRoomFilterChange(filter.value)}
            className={cn(
              'flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              roomFilter === filter.value
                ? 'bg-ui-surface text-ui-brand shadow-sm'
                : 'text-ui-text-muted hover:text-ui-text-primary'
            )}
          >
            {filter.label}
          </button>
        ))}
      </div>
    </div>
  )
}
