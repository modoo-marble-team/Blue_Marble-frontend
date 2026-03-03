import { describe, expect, it } from 'vitest'
import {
  getOnlineUserAvatarBackground,
  getOnlineUserAvatarText,
  mapOnlineUsersToViewModel,
} from './onlineUsersModel'

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
