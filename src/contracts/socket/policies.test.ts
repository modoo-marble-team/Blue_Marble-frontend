import { describe, expect, it } from 'vitest'
import {
  isDirectMessageBlockedByStatus,
  isWaitingRoomStartConditionMet,
} from './policies'

describe('socket contract policies', () => {
  it('DM 정책은 송신자/수신자 중 한 명이라도 playing이면 차단한다', () => {
    expect(isDirectMessageBlockedByStatus('playing', 'lobby')).toBe(true)
    expect(isDirectMessageBlockedByStatus('in_room', 'playing')).toBe(true)
    expect(isDirectMessageBlockedByStatus('lobby', 'in_room')).toBe(false)
  })

  it('대기방 시작 조건은 최소 2명 + non-host 전원 준비 완료를 만족해야 한다', () => {
    expect(
      isWaitingRoomStartConditionMet([{ isHost: true, isReady: false }])
    ).toBe(false)

    expect(
      isWaitingRoomStartConditionMet([
        { isHost: true, isReady: false },
        { isHost: false, isReady: false },
      ])
    ).toBe(false)

    expect(
      isWaitingRoomStartConditionMet([
        { isHost: true, isReady: false },
        { isHost: false, isReady: true },
      ])
    ).toBe(true)
  })
})
