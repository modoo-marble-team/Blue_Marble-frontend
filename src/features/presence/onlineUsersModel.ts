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

function createOnlineUserViewModel(user: OnlineUserPayload): OnlineUser {
  return {
    ...user,
    avatarText: getOnlineUserAvatarText(user.nickname),
    avatarBackground: getOnlineUserAvatarBackground(user.id),
  }
}

// 접속자 payload를 UI 전용 접속자 모델로 매핑
export function mapOnlineUsersToViewModel(
  payloadUsers: OnlineUserPayload[]
): OnlineUser[] {
  return payloadUsers.map((user) => createOnlineUserViewModel(user))
}

// 현재 사용자가 snapshot에 없더라도 원하는 상태로 보정한 접속자 목록을 반환
export function mergeOnlineUsersWithCurrentUser(
  users: OnlineUser[],
  currentUser: {
    id: string
    nickname: string
    status: OnlineUserPayload['status']
  }
) {
  const usersById = new Map<string, OnlineUser>(
    users.map((user) => [user.id, user])
  )

  usersById.set(
    currentUser.id,
    createOnlineUserViewModel({
      id: currentUser.id,
      nickname: currentUser.nickname,
      status: currentUser.status,
    })
  )

  return Array.from(usersById.values())
}

// room.players를 기준으로 현재 방 참가자의 상태를 접속자 목록에 반영한다
export function mergeOnlineUsersWithRoomPlayers(
  users: OnlineUser[],
  players: Array<{
    id: string
    nickname: string
  }>,
  status: Extract<OnlineUserPayload['status'], 'in_room' | 'playing'>
) {
  const usersById = new Map<string, OnlineUser>(
    users.map((user) => [user.id, user])
  )

  players.forEach((player) => {
    usersById.set(
      player.id,
      createOnlineUserViewModel({
        id: player.id,
        nickname: player.nickname,
        status,
      })
    )
  })

  return Array.from(usersById.values())
}
