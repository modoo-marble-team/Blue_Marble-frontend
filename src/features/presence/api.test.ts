import { describe, expect, it } from 'vitest'
import { normalizeOnlineUsersPayload } from './api'

describe('normalizeOnlineUsersPayload', () => {
  it('숫자 id를 문자열로 정규화하고 nickname 공백을 제거한다', () => {
    expect(
      normalizeOnlineUsersPayload([
        {
          id: 7,
          nickname: '  실유저 ',
          status: 'lobby',
        },
      ])
    ).toEqual([
      {
        id: '7',
        nickname: '실유저',
        status: 'lobby',
      },
    ])
  })

  it('지원하지 않는 status나 잘못된 레코드는 제외한다', () => {
    expect(
      normalizeOnlineUsersPayload([
        {
          id: 1,
          nickname: '유효유저',
          status: 'playing',
        },
        {
          id: 2,
          nickname: '   ',
          status: 'lobby',
        },
        {
          id: 3,
          nickname: '레거시상태',
          status: 'online',
        },
        null,
      ])
    ).toEqual([
      {
        id: '1',
        nickname: '유효유저',
        status: 'playing',
      },
    ])
  })
})
