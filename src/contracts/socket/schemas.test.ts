import { describe, expect, it } from 'vitest'
import {
  gameStartEventSchema,
  userStatusChangedEventSchema,
  validateSocketEventPayload,
} from './schemas'

describe('socket schema validator', () => {
  it('유효한 payload는 success=true와 파싱 데이터를 반환한다', () => {
    const result = validateSocketEventPayload(gameStartEventSchema, {
      game_id: 'game-1',
      room_id: 'room-1',
    })

    expect(result.success).toBe(true)

    if (result.success) {
      expect(result.data).toEqual({
        game_id: 'game-1',
        room_id: 'room-1',
      })
    }
  })

  it('유효하지 않은 payload는 code/message/detail 형식 에러를 반환한다', () => {
    const result = validateSocketEventPayload(gameStartEventSchema, {
      game_id: 'game-1',
    })

    expect(result.success).toBe(false)

    if (!result.success) {
      expect(result.error.code).toBe('INVALID_SOCKET_PAYLOAD')
      expect(result.error.message).toBe('Socket payload validation failed')
      expect(typeof result.error.detail).toBe('string')
      expect(result.error.detail?.length).toBeGreaterThan(0)
    }
  })

  it('user_status_changed는 숫자 id와 offline 상태를 허용한다', () => {
    const result = validateSocketEventPayload(userStatusChangedEventSchema, {
      id: 196,
      nickname: 'Guest_010fwimn',
      status: 'offline',
    })

    expect(result.success).toBe(true)

    if (result.success) {
      expect(result.data).toEqual({
        id: 196,
        nickname: 'Guest_010fwimn',
        status: 'offline',
      })
    }
  })
})
