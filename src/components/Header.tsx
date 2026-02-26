import { Dice5 } from 'lucide-react'
import { ProfileDropdown } from './layout/ProfileDropdown'
import type { ProfileMenuItem } from '../types/layout'

interface HeaderProps {
  playerLabel?: string
  avatarText?: string
  avatarBackground?: string
  menuItems?: ProfileMenuItem[]
}

function Header({
  playerLabel = '플레이어',
  avatarText = 'P',
  avatarBackground = '#fde68a',
  menuItems = [],
}: HeaderProps) {
  return (
    <header className="flex h-14 items-center justify-between border-b border-ui-border bg-ui-surface px-4 sm:px-6">
      <div className="flex items-center gap-2.5">
        <div className="flex size-9 items-center justify-center rounded-lg bg-ui-brand text-white">
          <Dice5 className="size-5" strokeWidth={2} />
        </div>
        <h1 className="text-lg font-bold text-ui-text-strong">MARBLE POP</h1>
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

export default Header
