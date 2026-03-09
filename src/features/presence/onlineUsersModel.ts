import type { OnlineUser, OnlineUserPayload } from './types'
import {
  getAvatarBackgroundColor,
  getAvatarText,
} from '../../components/avatar/avatarModel'

// 닉네임 첫 글자를 아바타 텍스트로 변환
export function getOnlineUserAvatarText(nickname: string) {
  return getAvatarText(nickname)
}

// userId 문자열 해시로 일관된 아바타 배경색 선택
export function getOnlineUserAvatarBackground(userId: string) {
  return getAvatarBackgroundColor(userId)
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
