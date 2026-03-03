import { describe, expect, it, vi } from 'vitest'

type MockGatewayModule = typeof import('./mockGateway')

// mockGateway의 내부 저장소가 테스트 간 섞이지 않도록 매번 새 모듈로 로드
async function loadMockGateway(): Promise<MockGatewayModule> {
  vi.resetModules()
  return import('./mockGateway')
}

// 코드 기반 에러 검증 헬퍼
function expectGatewayErrorCode(error: unknown, expectedCode: string) {
  expect(error).toBeTruthy()
  expect(typeof error).toBe('object')
  expect((error as { code?: string }).code).toBe(expectedCode)
}

describe('mockGateway DEV control', () => {
  it('방장 넘기기는 참가자 순서대로 순환 이관된다', async () => {
    const gateway = await loadMockGateway()

    const firstTransfer = gateway.mockDevTransferWaitingRoomHost('room-5')
    const firstHost = firstTransfer.players.find((player) => player.isHost)

    expect(firstHost?.id).toBe('room-5-user-2')

    const secondTransfer = gateway.mockDevTransferWaitingRoomHost('room-5')
    const secondHost = secondTransfer.players.find((player) => player.isHost)

    expect(secondHost?.id).toBe('room-5-user-1')
  })

  it('방장 넘기기는 1인 방에서 에러를 반환한다', async () => {
    const gateway = await loadMockGateway()

    try {
      gateway.mockDevTransferWaitingRoomHost('room-4')
      throw new Error('expected error')
    } catch (error) {
      expectGatewayErrorCode(error, 'PLAYER_NOT_IN_ROOM')
    }
  })

  it('방장 넘기기는 게임 중 상태에서 에러를 반환한다', async () => {
    const gateway = await loadMockGateway()

    try {
      gateway.mockDevTransferWaitingRoomHost('room-3')
      throw new Error('expected error')
    } catch (error) {
      expectGatewayErrorCode(error, 'ROOM_ALREADY_PLAYING')
    }
  })

  it('방 초기화는 현재 사용자만 남기고 채팅/상태를 초기화한다', async () => {
    const gateway = await loadMockGateway()

    gateway.mockSendWaitingRoomChat({
      roomId: 'room-5',
      senderId: 'room-5-user-1',
      senderNickname: '플레이어1',
      message: '테스트 메시지',
    })

    const resetSnapshot = gateway.mockDevResetWaitingRoom(
      'room-5',
      'room-5-user-2',
      '플레이어2'
    )

    expect(resetSnapshot.status).toBe('waiting')
    expect(resetSnapshot.chatMessages).toHaveLength(0)
    expect(resetSnapshot.players).toHaveLength(1)
    expect(resetSnapshot.players[0]).toEqual({
      id: 'room-5-user-2',
      nickname: '플레이어2',
      isReady: false,
      isHost: true,
    })
  })

  it('방 초기화 결과는 로비 방 목록에도 동일하게 반영된다', async () => {
    const gateway = await loadMockGateway()

    gateway.mockDevResetWaitingRoom('room-5', 'room-5-user-2', '플레이어2')

    const lobbyRoom = gateway
      .getMockLobbyRooms()
      .find((room) => room.id === 'room-5')

    expect(lobbyRoom).toBeTruthy()
    expect(lobbyRoom?.currentPlayers).toBe(1)
    expect(lobbyRoom?.status).toBe('waiting')
  })
})
