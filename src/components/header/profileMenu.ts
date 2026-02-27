export interface ProfileMenuItem {
  id: string
  label: string
  onSelect: () => void
  tone?: 'default' | 'danger'
}

interface CreateProfileMenuItemsParams {
  isGuest: boolean
  onGoMyPage: () => void
  onLogout: () => void
}

export function getAvatarText(nickname?: string): string {
  const trimmedNickname = nickname?.trim() ?? ''
  return trimmedNickname.length > 0 ? trimmedNickname.slice(0, 1) : 'P'
}

export function getAvatarBackground(isGuest?: boolean): string {
  return isGuest ? '#fde68a' : '#bfdbfe'
}

export function createProfileMenuItems({
  isGuest,
  onGoMyPage,
  onLogout,
}: CreateProfileMenuItemsParams): ProfileMenuItem[] {
  if (isGuest) {
    return [
      {
        id: 'logout',
        label: '로그아웃',
        onSelect: onLogout,
        tone: 'danger',
      },
    ]
  }

  return [
    {
      id: 'my-page',
      label: '마이페이지',
      onSelect: onGoMyPage,
    },
    {
      id: 'logout',
      label: '로그아웃',
      onSelect: onLogout,
      tone: 'danger',
    },
  ]
}
