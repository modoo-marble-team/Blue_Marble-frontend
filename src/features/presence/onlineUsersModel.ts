import type { OnlineUser, OnlineUserPayload } from './types'

// userId 해시 기반 아바타 배경색 후보군
const AVATAR_BACKGROUND_COLORS = [
  '#f6c8a9',
  '#7f8ea3',
  '#dbc4f8',
  '#8f7f77',
  '#b5d9ff',
  '#ffd8a6',
]

// 닉네임 첫 글자를 아바타 텍스트로 변환
export function getOnlineUserAvatarText(nickname: string) {
  const trimmedNickname = nickname.trim()

  // 빈 문자열 닉네임은 기본 문자 반환
  if (trimmedNickname.length === 0) {
    return '?'
  }

  return trimmedNickname.slice(0, 1).toUpperCase()
}

// userId 문자열 해시로 일관된 아바타 배경색 선택
export function getOnlineUserAvatarBackground(userId: string) {
  const colorIndex =
    userId
      .split('')
      .reduce((acc, character) => acc + character.charCodeAt(0), 0) %
    AVATAR_BACKGROUND_COLORS.length

  return AVATAR_BACKGROUND_COLORS[colorIndex]
}

// 접속자 payload를 UI 전용 접속자 모델로 매핑
export function mapOnlineUsersToViewModel(
  payloadUsers: OnlineUserPayload[]
): OnlineUser[] {
  return payloadUsers.map((user) => ({
    ...user,
    avatarText: getOnlineUserAvatarText(user.nickname),
    avatarBackground: getOnlineUserAvatarBackground(user.id),
  }))
}
