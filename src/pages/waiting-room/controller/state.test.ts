import { describe, expect, it } from 'vitest'
import { buildWaitingRoomSeats, getStartConditionMet } from './state'
import type { WaitingRoomSnapshot } from '../types'

// 테스트 기본 대기방 스냅샷 생성
function createWaitingRoomSnapshot(
  overrides?: Partial<WaitingRoomSnapshot>
): WaitingRoomSnapshot {
  return {
    roomId: 'room-1',
    title: '테스트 방',
    status: 'waiting',
    maxPlayers: 4,
    isPrivate: false,
    players: [
      { id: 'host-1', nickname: 'Host', isReady: false, isHost: true },
      { id: 'user-1', nickname: 'User1', isReady: true, isHost: false },
    ],
    chatMessages: [],
    ...overrides,
  }
}

describe('getStartConditionMet', () => {
  it('방이 없으면 false를 반환한다', () => {
    expect(getStartConditionMet(null)).toBe(false)
  })

  it('인원이 2명 미만이면 false를 반환한다', () => {
    const room = createWaitingRoomSnapshot({
      players: [
        { id: 'host-1', nickname: 'Host', isReady: false, isHost: true },
      ],
    })

    expect(getStartConditionMet(room)).toBe(false)
  })

  it('방장 제외 전원이 준비 완료면 true를 반환한다', () => {
    const room = createWaitingRoomSnapshot({
      players: [
        { id: 'host-1', nickname: 'Host', isReady: false, isHost: true },
        { id: 'user-1', nickname: 'User1', isReady: true, isHost: false },
        { id: 'user-2', nickname: 'User2', isReady: true, isHost: false },
      ],
    })

    expect(getStartConditionMet(room)).toBe(true)
  })

  it('방장 제외 인원 중 미준비자가 있으면 false를 반환한다', () => {
    const room = createWaitingRoomSnapshot({
      players: [
        { id: 'host-1', nickname: 'Host', isReady: false, isHost: true },
        { id: 'user-1', nickname: 'User1', isReady: true, isHost: false },
        { id: 'user-2', nickname: 'User2', isReady: false, isHost: false },
      ],
    })

    expect(getStartConditionMet(room)).toBe(false)
  })
})

describe('buildWaitingRoomSeats', () => {
  it('방이 없으면 기본 정원 크기의 빈 좌석 배열을 반환한다', () => {
    const seats = buildWaitingRoomSeats(null, 'user-1')

    expect(seats).toHaveLength(4)
    expect(seats.every((seat) => seat === null)).toBe(true)
  })

  it('플레이어 좌석을 채우고 내 좌석을 isMe=true로 표시한다', () => {
    const room = createWaitingRoomSnapshot()

    const seats = buildWaitingRoomSeats(room, 'user-1')

    expect(seats).toHaveLength(4)
    expect(seats[0]?.id).toBe('host-1')
    expect(seats[1]?.id).toBe('user-1')
    expect(seats[1]?.isMe).toBe(true)
    expect(seats[2]).toBeNull()
    expect(seats[0]?.avatarColor).toBeTruthy()
  })

  it('maxPlayers를 초과한 플레이어는 좌석에 배치하지 않는다', () => {
    const room = createWaitingRoomSnapshot({
      maxPlayers: 2,
      players: [
        { id: 'host-1', nickname: 'Host', isReady: false, isHost: true },
        { id: 'user-1', nickname: 'User1', isReady: true, isHost: false },
        { id: 'user-2', nickname: 'User2', isReady: true, isHost: false },
      ],
    })

    const seats = buildWaitingRoomSeats(room, 'user-2')

    expect(seats).toHaveLength(2)
    expect(seats[0]?.id).toBe('host-1')
    expect(seats[1]?.id).toBe('user-1')
  })
})
