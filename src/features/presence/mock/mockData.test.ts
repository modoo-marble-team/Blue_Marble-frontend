import { describe, expect, it, vi } from 'vitest'
import { createSeededRoomPlayers } from '../../../pages/waiting-room/mockSeed'

type PresenceMockDataModule = typeof import('./mockData')
type WaitingRoomMockGatewayModule =
  typeof import('../../../pages/waiting-room/mockGateway')

interface LoadedMockModules {
  presence: PresenceMockDataModule
  gateway: WaitingRoomMockGatewayModule
}

// 테스트 간 목 저장소 오염을 막기 위해 매번 새 모듈 인스턴스로 로드
async function loadMockModules(): Promise<LoadedMockModules> {
  vi.resetModules()

  const [presence, gateway] = await Promise.all([
    import('./mockData'),
    import('../../../pages/waiting-room/mockGateway'),
  ])

  return {
    presence,
    gateway,
  }
}

describe('presence mockData SSOT', () => {
  it('초기 접속자 시드는 대기방 목 스토어 플레이어 상태와 동일 규칙으로 생성된다', async () => {
    const { presence, gateway } = await loadMockModules()
    const users = presence.getMockOnlineUsersSnapshot()
    const rooms = gateway.getMockLobbyRooms()
    const uniqueNicknames = new Set(users.map((user) => user.nickname))

    // 접속자 목록 시드 닉네임은 모두 서로 다른 값이어야 한다
    expect(uniqueNicknames.size).toBe(users.length)

    rooms.forEach((room) => {
      const expectedStatus = room.status === 'playing' ? 'playing' : 'in_room'
      const seededPlayers = createSeededRoomPlayers(
        room.id,
        room.currentPlayers
      )

      for (let index = 1; index <= room.currentPlayers; index += 1) {
        const expectedUserId = `${room.id}-user-${index}`
        const matchedUser = users.find((user) => user.id === expectedUserId)
        const expectedNickname = seededPlayers[index - 1]?.nickname

        expect(matchedUser).toBeTruthy()
        expect(matchedUser?.nickname).toBe(expectedNickname)
        expect(matchedUser?.status).toBe(expectedStatus)
      }
    })
  })

  it('로그아웃한 목 접속자는 저장소에서 즉시 제거된다', async () => {
    const { presence } = await loadMockModules()
    const userId = 'logout-user'

    presence.setMockOnlineUserStatus(userId, 'lobby', '로그아웃테스터')

    expect(
      presence.getMockOnlineUsersSnapshot().some((user) => user.id === userId)
    ).toBe(true)

    const updatedSnapshot = presence.removeMockOnlineUser(userId)

    expect(updatedSnapshot.some((user) => user.id === userId)).toBe(false)
    expect(
      presence.getMockOnlineUsersSnapshot().some((user) => user.id === userId)
    ).toBe(false)
  })
})
