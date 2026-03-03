import type { LobbyRoom } from '../../pages/lobby/types'

// 로비 방 fixture 생성
export function createLobbyRoomFixture(
  overrides: Partial<LobbyRoom> = {}
): LobbyRoom {
  return {
    id: 'room-1',
    title: '테스트 방',
    status: 'waiting',
    currentPlayers: 2,
    maxPlayers: 4,
    isPrivate: false,
    ...overrides,
  }
}
