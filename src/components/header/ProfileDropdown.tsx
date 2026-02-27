import { useEffect, useRef, useState } from 'react'
import type { ProfileMenuItem } from './profileMenu'

interface ProfileDropdownProps {
  playerLabel?: string
  avatarText?: string
  avatarBackground?: string
  menuItems?: ProfileMenuItem[]
}

export function ProfileDropdown({
  playerLabel = '플레이어',
  avatarText = 'P',
  avatarBackground = '#fde68a',
  menuItems = [],
}: ProfileDropdownProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const menuContainerRef = useRef<HTMLDivElement | null>(null)

  const hasMenuItems = menuItems.length > 0
  const avatar = (
    <div
      className="flex size-9 items-center justify-center rounded-full text-xs font-semibold text-ui-text-primary"
      style={{ backgroundColor: avatarBackground }}
    >
      {avatarText}
    </div>
  )

  useEffect(() => {
    if (!hasMenuItems || !isMenuOpen) {
      return
    }

    function handlePointerDown(event: PointerEvent) {
      if (
        menuContainerRef.current &&
        !menuContainerRef.current.contains(event.target as Node)
      ) {
        setIsMenuOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsMenuOpen(false)
      }
    }

    window.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [hasMenuItems, isMenuOpen])

  return (
    <div className="flex items-center gap-2 text-sm font-medium text-ui-text-muted">
      <span className="max-w-[140px] truncate">{playerLabel}</span>
      {hasMenuItems ? (
        <div ref={menuContainerRef} className="relative group/menu">
          <button
            type="button"
            className="rounded-full outline-none"
            aria-label="프로필 메뉴 열기"
            aria-expanded={isMenuOpen}
            onClick={() => setIsMenuOpen((previous) => !previous)}
          >
            {avatar}
          </button>

          <div
            className={`absolute right-0 top-full z-20 pt-2 transition-opacity ${
              isMenuOpen
                ? 'pointer-events-auto opacity-100'
                : 'pointer-events-none opacity-0'
            } group-hover/menu:pointer-events-auto group-hover/menu:opacity-100 group-focus-within/menu:pointer-events-auto group-focus-within/menu:opacity-100`}
          >
            <ul className="min-w-[140px] rounded-xl border border-ui-border bg-ui-surface p-1 shadow-[0_8px_20px_rgba(15,23,42,0.12)]">
              {menuItems.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => {
                      item.onSelect()
                      setIsMenuOpen(false)
                    }}
                    className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium transition hover:bg-ui-surface-muted ${
                      item.tone === 'danger'
                        ? 'text-ui-danger'
                        : 'text-ui-text-primary'
                    }`}
                  >
                    <span>{item.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : (
        avatar
      )}
    </div>
  )
}
