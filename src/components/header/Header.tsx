import { BrandLockup } from './BrandLockup'
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
      <BrandLockup compact />

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
