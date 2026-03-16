import { describe, expect, it } from 'vitest'
import { buildAuthSession, mapMyPageProfile } from './api'

describe('buildAuthSession', () => {
  it('REST의 numeric user.id를 문자열 userId로 정규화한다', () => {
    const session = buildAuthSession({
      accessToken: 'token-123',
      user: {
        id: 7,
        nickname: '홍길동',
        profile_image_url: null,
        is_guest: false,
      },
      provider: 'kakao',
    })

    expect(session).toEqual({
      accessToken: 'token-123',
      userId: '7',
      nickname: '홍길동',
      profileImage: null,
      isGuest: false,
      needsNicknameSetup: false,
      provider: 'kakao',
    })
  })

  it('게스트 응답은 provider를 guest로 고정한다', () => {
    const session = buildAuthSession({
      accessToken: 'guest-token',
      user: {
        id: 12,
        nickname: 'Guest_1234',
        profile_image_url: null,
        is_guest: true,
      },
      provider: 'kakao',
    })

    expect(session.provider).toBe('guest')
    expect(session.isGuest).toBe(true)
  })
})

describe('mapMyPageProfile', () => {
  it('마이페이지 프로필 id를 문자열로 정규화하고 profile_image를 읽는다', () => {
    const profile = mapMyPageProfile({
      id: 3,
      nickname: '마블러',
      profile_image: 'https://example.com/avatar.png',
      stats: {
        total: 10,
        wins: 6,
        losses: 4,
      },
    })

    expect(profile).toEqual({
      id: '3',
      nickname: '마블러',
      profileImage: 'https://example.com/avatar.png',
      stats: {
        total: 10,
        wins: 6,
        losses: 4,
      },
    })
  })
})
