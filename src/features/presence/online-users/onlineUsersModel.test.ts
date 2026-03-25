import { describe, expect, it } from 'vitest'
import {
  getOnlineUserAvatarBackground,
  getOnlineUserAvatarText,
  mapOnlineUsersToViewModel,
  mergeOnlineUsersWithCurrentUser,
  mergeOnlineUsersWithRoomPlayers,
} from './onlineUsersModel'
import { createOnlineUserFixture } from '../../../test/fixtures'

describe('getOnlineUserAvatarText', () => {
  it('앞뒤 공백을 제거한 닉네임 첫 글자를 대문자로 반환한다', () => {
    expect(getOnlineUserAvatarText('  goorm  ')).toBe('G')
  })

  it('닉네임이 공백이면 기본 문자 ? 를 반환한다', () => {
    expect(getOnlineUserAvatarText('   ')).toBe('?')
  })
})

describe('getOnlineUserAvatarBackground', () => {
  it('동일 userId에 대해 항상 동일한 배경색을 반환한다', () => {
    const first = getOnlineUserAvatarBackground('user-100')
    const second = getOnlineUserAvatarBackground('user-100')

    expect(first).toBe(second)
  })
})

describe('mapOnlineUsersToViewModel', () => {
  it('payload를 렌더링 모델로 매핑하고 avatar 필드를 채운다', () => {
    const mapped = mapOnlineUsersToViewModel([
      { id: 'u-1', nickname: 'Alpha', status: 'lobby' },
      { id: 'u-2', nickname: '   ', status: 'in_room' },
    ])

    expect(mapped).toHaveLength(2)
    expect(mapped[0]).toMatchObject({
      id: 'u-1',
      nickname: 'Alpha',
      status: 'lobby',
      avatarText: 'A',
    })
    expect(mapped[1]).toMatchObject({
      id: 'u-2',
      nickname: '   ',
      status: 'in_room',
      avatarText: '?',
    })
    expect(mapped[0].avatarBackground).toBeTruthy()
    expect(mapped[1].avatarBackground).toBeTruthy()
  })
})

describe('mergeOnlineUsersWithCurrentUser', () => {
  it('현재 사용자가 snapshot에 없으면 lobby 상태로 추가한다', () => {
    const merged = mergeOnlineUsersWithCurrentUser(
      [
        createOnlineUserFixture({
          id: 'user-2',
          nickname: '상대방',
          status: 'in_room',
        }),
      ],
      {
        id: 'user-1',
        nickname: '테스터',
        status: 'lobby',
      }
    )

    expect(merged).toHaveLength(2)
    expect(merged).toContainEqual(
      expect.objectContaining({
        id: 'user-1',
        nickname: '테스터',
        status: 'lobby',
        avatarText: '테',
      })
    )
  })

  it('현재 사용자가 이미 snapshot에 있으면 기존 status를 유지한다', () => {
    const merged = mergeOnlineUsersWithCurrentUser(
      [
        createOnlineUserFixture({
          id: 'user-1',
          nickname: '테스터',
          status: 'in_room',
        }),
      ],
      {
        id: 'user-1',
        nickname: '테스터',
        status: 'lobby',
      }
    )

    expect(merged).toContainEqual(
      expect.objectContaining({
        id: 'user-1',
        status: 'in_room',
      })
    )
  })
})

describe('mergeOnlineUsersWithRoomPlayers', () => {
  it('기본 옵션에서는 room.players 기준으로 닉네임은 보강하되 기존 online status는 유지한다', () => {
    const merged = mergeOnlineUsersWithRoomPlayers(
      [
        createOnlineUserFixture({
          id: 'user-1',
          nickname: '이전닉네임',
          status: 'lobby',
          avatarText: '이',
        }),
        createOnlineUserFixture({
          id: 'user-2',
          nickname: '상대방',
          status: 'lobby',
        }),
      ],
      [
        {
          id: 'user-1',
          nickname: '방장',
        },
      ],
      'in_room'
    )

    expect(merged).toContainEqual(
      expect.objectContaining({
        id: 'user-1',
        nickname: '방장',
        status: 'lobby',
        avatarText: '방',
      })
    )
    expect(merged).toContainEqual(
      expect.objectContaining({
        id: 'user-2',
        nickname: '상대방',
        status: 'lobby',
      })
    )
  })

  it('overrideExistingStatus 옵션이 켜지면 existing status를 room status로 덮어쓴다', () => {
    const merged = mergeOnlineUsersWithRoomPlayers(
      [
        createOnlineUserFixture({
          id: 'user-1',
          nickname: '이전닉네임',
          status: 'lobby',
          avatarText: '이',
        }),
      ],
      [
        {
          id: 'user-1',
          nickname: '방장',
        },
      ],
      'in_room',
      { overrideExistingStatus: true }
    )

    expect(merged).toContainEqual(
      expect.objectContaining({
        id: 'user-1',
        nickname: '방장',
        status: 'in_room',
        avatarText: '방',
      })
    )
  })

  it('기본 옵션에서는 online snapshot에 없는 room player를 다시 추가하지 않는다', () => {
    const merged = mergeOnlineUsersWithRoomPlayers(
      [
        createOnlineUserFixture({
          id: 'user-1',
          nickname: '테스터',
          status: 'lobby',
        }),
      ],
      [
        {
          id: 'user-2',
          nickname: '상대방',
        },
      ],
      'in_room'
    )

    expect(merged).toHaveLength(1)
    expect(merged.find((user) => user.id === 'user-2')).toBeUndefined()
  })

  it('waiting-room 옵션을 주면 snapshot에 없는 room player도 fallback으로 포함할 수 있다', () => {
    const merged = mergeOnlineUsersWithRoomPlayers(
      [],
      [
        {
          id: 'user-2',
          nickname: '상대방',
        },
      ],
      'in_room',
      {
        includeMissingPlayers: true,
        overrideExistingStatus: true,
      }
    )

    expect(merged).toContainEqual(
      expect.objectContaining({
        id: 'user-2',
        nickname: '상대방',
        status: 'in_room',
      })
    )
  })
})
