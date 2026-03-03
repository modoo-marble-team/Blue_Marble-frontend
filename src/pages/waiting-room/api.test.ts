import { describe, expect, it } from 'vitest'
import { getWaitingRoomErrorMessage, isJoinPasswordMismatchError } from './api'
import { WaitingRoomMockError } from './mockGateway'

// axios 에러 형태를 테스트에서 간단히 재현
function createAxiosLikeError(options: {
  status?: number
  code?: string
  detail?: string
  message?: string
}) {
  return {
    isAxiosError: true,
    message: options.message ?? 'Request failed',
    response: {
      status: options.status,
      data: {
        code: options.code,
        detail: options.detail,
      },
    },
  }
}

describe('waiting-room api error mapping', () => {
  it('getWaitingRoomErrorMessage는 mock 에러에서 detail을 우선 반환한다', () => {
    const error = new WaitingRoomMockError(403, 'fallback', {
      code: 'ROOM_PASSWORD_MISMATCH',
      detail: '비밀번호가 올바르지 않습니다.',
    })

    expect(getWaitingRoomErrorMessage(error, '기본 메시지')).toBe(
      '비밀번호가 올바르지 않습니다.'
    )
  })

  it('getWaitingRoomErrorMessage는 axios 에러의 detail/code를 파싱해 detail을 반환한다', () => {
    const error = createAxiosLikeError({
      status: 409,
      code: 'ROOM_FULL',
      detail: '방 인원이 가득 찼습니다.',
      message: 'request failed',
    })

    expect(getWaitingRoomErrorMessage(error, '기본 메시지')).toBe(
      '방 인원이 가득 찼습니다.'
    )
  })

  it('isJoinPasswordMismatchError는 code 기반으로 비밀번호 불일치를 판별한다', () => {
    const error = createAxiosLikeError({
      status: 400,
      code: 'ROOM_PASSWORD_MISMATCH',
      detail: '비밀번호가 올바르지 않습니다.',
    })

    expect(isJoinPasswordMismatchError(error)).toBe(true)
  })

  it('isJoinPasswordMismatchError는 code가 없으면 403 status로 판별한다', () => {
    const error = createAxiosLikeError({
      status: 403,
      detail: '권한이 없습니다.',
    })

    expect(isJoinPasswordMismatchError(error)).toBe(true)
  })

  it('detail/message가 없으면 fallback 메시지를 반환한다', () => {
    const error = { random: 'value' }

    expect(
      getWaitingRoomErrorMessage(error, '대기방 정보를 불러오지 못했습니다.')
    ).toBe('대기방 정보를 불러오지 못했습니다.')
  })
})
