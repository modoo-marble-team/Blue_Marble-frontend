import { ArrowLeft } from 'lucide-react'
import { ProfileDropdown } from '../../../components/layout/ProfileDropdown'
import type { ProfileMenuItem } from '../../../types/layout'

interface WaitingRoomHeaderProps {
  roomIdLabel: string
  roomTitle: string
  playerLabel: string
  avatarText: string
  avatarBackground: string
  menuItems: ProfileMenuItem[]
  onBackToLobby: () => void
}

export function WaitingRoomHeader({
  roomIdLabel,
  roomTitle,
  playerLabel,
  avatarText,
  avatarBackground,
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
        menuItems={menuItems}
      />
    </header>
  )
}
