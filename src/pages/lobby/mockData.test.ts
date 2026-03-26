import { describe, expect, it } from 'vitest'
import { mockLobbyRooms } from './mockData'

describe('mockLobbyRooms public demo seed', () => {
  it('공개 데모 로비 시드는 4개 방 조합으로 고정된다', () => {
    expect(mockLobbyRooms).toHaveLength(4)
    expect(mockLobbyRooms.map((room) => room.title)).toEqual([
      '일반방',
      '비밀방 비밀번호 1234',
      '게임 중 방',
      '정원초과 방',
    ])

    expect(
      mockLobbyRooms.filter(
        (room) =>
          room.status === 'waiting' &&
          !room.isPrivate &&
          room.currentPlayers < room.maxPlayers
      )
    ).toHaveLength(1)

    expect(mockLobbyRooms.filter((room) => room.isPrivate)).toHaveLength(1)
    expect(
      mockLobbyRooms.filter((room) => room.currentPlayers >= room.maxPlayers)
    ).toHaveLength(1)
    expect(
      mockLobbyRooms.filter((room) => room.status === 'playing')
    ).toHaveLength(1)

    const privateRoom = mockLobbyRooms.find((room) => room.isPrivate)

    expect(privateRoom?.title).toContain('1234')
  })
})
