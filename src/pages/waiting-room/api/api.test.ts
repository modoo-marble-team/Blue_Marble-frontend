import { describe, expect, it } from 'vitest'
import {
  getWaitingRoomErrorMessage,
  isJoinPasswordMismatchError,
  parseJoinWaitingRoomPayload,
  WaitingRoomContractError,
} from './api'
import { WaitingRoomMockError } from '../socket/mockGateway'

// axios 에러 형태를 테스트에서 간단히 재현
function createAxiosLikeError(options: {
  status?: number
  code?: string
  detail?: string
  message?: string
}) {
  const responseData =
    options.code || options.detail
      ? {
          code: options.code,
          detail: options.detail,
        }
      : undefined

  return {
    isAxiosError: true,
    message: options.message ?? 'Request failed',
    request: {},
    response:
      options.status || responseData
        ? {
            status: options.status,
            data: responseData,
          }
        : undefined,
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

  it('네트워크/CORS 오류는 공통 네트워크 메시지로 정리한다', () => {
    const error = createAxiosLikeError({
      message: 'Network Error',
    })

    expect(
      getWaitingRoomErrorMessage(error, '대기방 입장에 실패했습니다.')
    ).toBe(
      '네트워크 오류가 발생했습니다. 연결 상태를 확인한 뒤 다시 시도해 주세요.'
    )
  })
})

describe('waiting-room join response contract', () => {
  it('필수 필드가 모두 있으면 join payload 파싱에 성공한다', () => {
    const parsedPayload = parseJoinWaitingRoomPayload({
      room_id: 'room-1',
      title: '즐거운 게임 한판!',
      status: 'waiting',
      max_players: 4,
      is_private: false,
      players: [
        {
          id: 'u-1',
          nickname: '고름EE',
          is_ready: false,
          is_host: true,
        },
      ],
      chat_messages: [
        {
          id: 'chat-1',
          sender_id: 'u-1',
          sender_nickname: '고름EE',
          message: '안녕하세요',
          sent_at: '2026-03-06T10:00:00.000Z',
          type: 'talk',
        },
      ],
    })

    expect(parsedPayload.room_id).toBe('room-1')
    expect(parsedPayload.chat_messages).toHaveLength(1)
  })

  it('chat_messages 필드가 누락되면 계약 오류를 던진다', () => {
    expect(() =>
      parseJoinWaitingRoomPayload({
        room_id: 'room-1',
        title: '즐거운 게임 한판!',
        status: 'waiting',
        max_players: 4,
        is_private: false,
        players: [],
      })
    ).toThrow(WaitingRoomContractError)
  })

  it('status 값이 계약 외 값이면 계약 오류를 던진다', () => {
    expect(() =>
      parseJoinWaitingRoomPayload({
        room_id: 'room-1',
        title: '즐거운 게임 한판!',
        status: 'closed',
        max_players: 4,
        is_private: false,
        players: [],
        chat_messages: [],
      })
    ).toThrow(WaitingRoomContractError)
  })
})
