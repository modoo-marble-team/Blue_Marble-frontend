import { ProfileDropdown } from './ProfileDropdown'
import type { ProfileMenuItem } from './profileMenu'

// 공통 헤더 렌더링 입력값 타입
interface HeaderProps {
  playerLabel?: string
  avatarText?: string
  avatarBackground?: string
  avatarImageUrl?: string | null
  menuItems?: ProfileMenuItem[]
}

// 좌측 로고와 우측 프로필 드롭다운을 포함한 상단 헤더 렌더링
function Header({
  playerLabel = '플레이어',
  avatarText = 'P',
  avatarBackground = '#fde68a',
  avatarImageUrl = null,
  menuItems = [],
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-ui-border bg-ui-surface/95 px-4 backdrop-blur sm:px-6">
      <div className="flex select-none items-center">
        <h1 className="text-[1.45rem] font-extrabold leading-none tracking-tight text-ui-text-strong">
          <span className="text-ui-text-strong">MARBLE</span>
          <span className="ml-1 bg-linear-to-r from-ui-brand-strong via-ui-brand to-[#0ea5e9] bg-clip-text text-transparent">
            POP
          </span>
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

export default Header
