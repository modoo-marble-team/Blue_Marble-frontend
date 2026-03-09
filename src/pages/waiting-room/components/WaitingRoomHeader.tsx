import { ArrowLeft } from 'lucide-react'
import { ProfileDropdown } from '../../../components/header/ProfileDropdown'
import type { ProfileMenuItem } from '../../../components/header/profileMenu'

// 대기방 헤더 렌더링 입력값 타입
interface WaitingRoomHeaderProps {
  roomIdLabel: string
  roomTitle: string
  playerLabel: string
  avatarText: string
  avatarBackground: string
  avatarImageUrl?: string | null
  menuItems: ProfileMenuItem[]
  onBackToLobby: () => void
}

// 뒤로가기/방 정보/프로필 드롭다운을 포함한 대기방 헤더 렌더링
export function WaitingRoomHeader({
  roomIdLabel,
  roomTitle,
  playerLabel,
  avatarText,
  avatarBackground,
  avatarImageUrl = null,
  menuItems,
  onBackToLobby,
}: WaitingRoomHeaderProps) {
  return (
    <header className="flex h-14 items-center justify-between border-b border-ui-border bg-ui-surface px-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-2.5">
        <button
          type="button"
          onClick={onBackToLobby}
          aria-label="로비로 이동"
          className="inline-flex size-8 items-center justify-center rounded-lg text-ui-text-primary transition-colors hover:bg-ui-surface-muted"
        >
          <ArrowLeft className="size-4" />
        </button>

        <span className="rounded-lg bg-ui-brand-soft px-2 py-0.5 text-xs font-bold text-ui-brand">
          {roomIdLabel}
        </span>

        <h1 className="truncate text-xl font-bold text-ui-text-strong">
          {roomTitle}
        </h1>
      </div>

      <ProfileDropdown
        playerLabel={playerLabel}
        avatarText={avatarText}
        avatarBackground={avatarBackground}
        avatarImageUrl={avatarImageUrl}
        menuItems={menuItems}
      />
    </header>
  )
}
