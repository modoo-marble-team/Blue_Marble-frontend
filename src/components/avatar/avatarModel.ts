// 아바타 fallback 배경색 후보군
const AVATAR_FALLBACK_COLORS = [
  '#f6c8a9',
  '#7f8ea3',
  '#dbc4f8',
  '#8f7f77',
  '#b5d9ff',
  '#ffd8a6',
]

// 이름 첫 글자를 아바타 텍스트로 변환
export function getAvatarText(displayName?: string): string {
  const normalizedDisplayName = displayName?.trim() ?? ''

  if (normalizedDisplayName.length === 0) {
    return '?'
  }

  return normalizedDisplayName.slice(0, 1).toUpperCase()
}

// userId/닉네임 같은 seed 값으로 일관된 아바타 배경색 계산
export function getAvatarBackgroundColor(seed?: string): string {
  const normalizedSeed = seed?.trim() ?? ''

  if (normalizedSeed.length === 0) {
    return AVATAR_FALLBACK_COLORS[0]
  }

  const colorIndex =
    normalizedSeed
      .split('')
      .reduce((sum, currentChar) => sum + currentChar.charCodeAt(0), 0) %
    AVATAR_FALLBACK_COLORS.length

  return AVATAR_FALLBACK_COLORS[colorIndex]
}
