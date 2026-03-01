// 프로필 드롭다운 메뉴 아이템 공통 타입
export interface ProfileMenuItem {
  id: string
  label: string
  onSelect: () => void
  tone?: 'default' | 'danger'
}

// 사용자 유형별 메뉴 생성 입력값 타입
interface CreateProfileMenuItemsParams {
  isGuest: boolean
  onGoMyPage: () => void
  onLogout: () => void
}

// 닉네임 첫 글자를 아바타 텍스트로 만들고 비어 있으면 기본값 반환
export function getAvatarText(nickname?: string): string {
  const trimmedNickname = nickname?.trim() ?? ''
  return trimmedNickname.length > 0 ? trimmedNickname.slice(0, 1) : 'P'
}

// 게스트 여부에 따라 아바타 배경 색상 반환
export function getAvatarBackground(isGuest?: boolean): string {
  return isGuest ? '#fde68a' : '#bfdbfe'
}

// 사용자 유형에 맞는 프로필 드롭다운 메뉴 목록 생성
export function createProfileMenuItems({
  isGuest,
  onGoMyPage,
  onLogout,
}: CreateProfileMenuItemsParams): ProfileMenuItem[] {
  // 게스트는 마이페이지 없이 로그아웃만 노출
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

  // 일반 사용자는 마이페이지와 로그아웃 메뉴를 함께 노출
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
