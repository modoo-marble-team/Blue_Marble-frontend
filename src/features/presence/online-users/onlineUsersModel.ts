import type { OnlineUser, OnlineUserPayload } from '../types'
import {
  getAvatarBackgroundColor,
  getAvatarText,
} from '../../../components/avatar/avatarModel'

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

interface MergeOnlineUsersWithRoomPlayersOptions {
  includeMissingPlayers?: boolean
  overrideExistingStatus?: boolean
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

  const existingUser = usersById.get(currentUser.id)

  usersById.set(
    currentUser.id,
    createOnlineUserViewModel({
      id: currentUser.id,
      nickname: currentUser.nickname,
      status: existingUser?.status ?? currentUser.status,
    })
  )

  return Array.from(usersById.values())
}

// room.players를 기준으로 현재 방 참가자의 상태를 접속자 목록에 반영한다.
// 기본 source of truth는 online snapshot이지만, waiting-room처럼 현재 room membership이
// 더 강한 local truth인 화면에서는 상태 override와 missing player 보강을 허용한다.
export function mergeOnlineUsersWithRoomPlayers(
  users: OnlineUser[],
  players: Array<{
    id: string
    nickname: string
  }>,
  status: Extract<OnlineUserPayload['status'], 'in_room' | 'playing'>,
  options: MergeOnlineUsersWithRoomPlayersOptions = {}
) {
  const { includeMissingPlayers = false, overrideExistingStatus = false } =
    options
  const usersById = new Map<string, OnlineUser>(
    users.map((user) => [user.id, user])
  )

  players.forEach((player) => {
    const existingUser = usersById.get(player.id)

    if (!existingUser && !includeMissingPlayers) {
      return
    }

    usersById.set(
      player.id,
      createOnlineUserViewModel({
        id: player.id,
        nickname: player.nickname,
        status:
          existingUser && !overrideExistingStatus
            ? existingUser.status
            : status,
      })
    )
  })

  return Array.from(usersById.values())
}
