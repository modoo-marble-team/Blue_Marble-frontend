import { describe, expect, it, vi } from 'vitest'
import { CHAT_MESSAGE_MAX_LENGTH } from '../../../constants/chat'

type MockGatewayModule = typeof import('./mockGateway')

// mockGateway의 내부 저장소가 테스트 간 섞이지 않도록 매번 새 모듈로 로드
async function loadMockGateway(): Promise<MockGatewayModule> {
  vi.resetModules()
  return import('./mockGateway')
}

interface LoadedMockGatewayWithSocket {
  gateway: MockGatewayModule
  registerListener: (
    eventName: string,
    listener: (payload: unknown) => void
  ) => void
}

async function loadMockGatewayWithSocket(): Promise<LoadedMockGatewayWithSocket> {
  vi.resetModules()

  const listenersMap = new Map<string, Array<(payload: unknown) => void>>()
  const registerListener = (
    eventName: string,
    listener: (payload: unknown) => void
  ) => {
    const listeners = listenersMap.get(eventName) ?? []
    listeners.push(listener)
    listenersMap.set(eventName, listeners)
  }

  vi.doMock('../../../lib/socket', () => ({
    socket: {
      listeners: vi.fn(
        (eventName: string) => listenersMap.get(eventName) ?? []
      ),
    },
  }))

  const gateway = await import('./mockGateway')

  return {
    gateway,
    registerListener,
  }
}

// 코드 기반 에러 검증 헬퍼
function expectGatewayErrorCode(error: unknown, expectedCode: string) {
  expect(error).toBeTruthy()
  expect(typeof error).toBe('object')
  expect((error as { code?: string }).code).toBe(expectedCode)
}

describe('mockGateway DEV control', () => {
  it('공개 데모 로비 방 목록은 시드 순서를 그대로 유지한다', async () => {
    const gateway = await loadMockGateway()

    expect(gateway.getMockLobbyRooms().map((room) => room.title)).toEqual([
      '일반방',
      '비밀방 비밀번호 1234',
      '게임 중 방',
      '정원초과 방',
    ])
  })

  it('내가 바로 방장은 현재 사용자를 즉시 host로 만든다', async () => {
    const gateway = await loadMockGateway()

    const snapshot = gateway.mockDevMakeCurrentUserHost(
      'room-5',
      'room-5-user-2'
    )
    const currentHost = snapshot.players.find((player) => player.isHost)

    expect(currentHost?.id).toBe('room-5-user-2')
  })

  it('시작조건은 현재 사용자를 방장으로 만들고 상대를 모두 준비 상태로 맞춘다', async () => {
    const gateway = await loadMockGateway()

    const snapshot = gateway.mockDevSeedStartCondition(
      'room-5',
      'room-5-user-2'
    )
    const currentHost = snapshot.players.find((player) => player.isHost)
    const nonHostPlayers = snapshot.players.filter((player) => !player.isHost)

    expect(currentHost?.id).toBe('room-5-user-2')
    expect(nonHostPlayers.length).toBeGreaterThan(0)
    expect(nonHostPlayers.every((player) => player.isReady)).toBe(true)
  })

  it('시작조건은 1인 방에서도 상대를 추가해 바로 시작 가능한 상태를 만든다', async () => {
    const gateway = await loadMockGateway()

    const snapshot = gateway.mockDevSeedStartCondition(
      'room-2',
      'room-2-user-1'
    )
    const hostPlayer = snapshot.players.find((player) => player.isHost)
    const nonHostPlayers = snapshot.players.filter((player) => !player.isHost)

    expect(snapshot.players).toHaveLength(2)
    expect(hostPlayer?.id).toBe('room-2-user-1')
    expect(nonHostPlayers).toHaveLength(1)
    expect(nonHostPlayers[0]?.isReady).toBe(true)
  })

  it('방장 넘기기는 참가자 순서대로 순환 이관된다', async () => {
    const gateway = await loadMockGateway()

    const firstTransfer = gateway.mockDevTransferWaitingRoomHost('room-5')
    const firstHost = firstTransfer.players.find((player) => player.isHost)

    expect(firstHost?.id).toBe('room-5-user-2')

    const secondTransfer = gateway.mockDevTransferWaitingRoomHost('room-5')
    const secondHost = secondTransfer.players.find((player) => player.isHost)

    expect(secondHost?.id).toBe('room-5-user-1')
  }, 15000)

  it('방장 넘기기는 1인 방에서 에러를 반환한다', async () => {
    const gateway = await loadMockGateway()

    try {
      gateway.mockDevTransferWaitingRoomHost('room-2')
      throw new Error('expected error')
    } catch (error) {
      expectGatewayErrorCode(error, 'PLAYER_NOT_IN_ROOM')
    }
  })

  it('방장 넘기기는 게임 중 상태에서 에러를 반환한다', async () => {
    const gateway = await loadMockGateway()

    try {
      gateway.mockDevTransferWaitingRoomHost('room-4')
      throw new Error('expected error')
    } catch (error) {
      expectGatewayErrorCode(error, 'ROOM_ALREADY_PLAYING')
    }
  })

  it('방 초기화는 현재 사용자만 남기고 채팅/상태를 초기화한다', async () => {
    const gateway = await loadMockGateway()
    const beforeResetSnapshot = gateway.mockDevGetWaitingRoomSnapshot('room-5')
    const currentUserNickname =
      beforeResetSnapshot.players.find(
        (player) => player.id === 'room-5-user-2'
      )?.nickname ?? ''

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
      nickname: currentUserNickname,
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

  it('긴 대기방 채팅도 300자로 정규화해 저장하고 브로드캐스트한다', async () => {
    const { gateway, registerListener } = await loadMockGatewayWithSocket()
    const onChat = vi.fn()
    const overlongMessage = ` ${'x'.repeat(CHAT_MESSAGE_MAX_LENGTH + 14)} `
    const expectedMessage = 'x'.repeat(CHAT_MESSAGE_MAX_LENGTH)

    registerListener('chat', onChat)

    gateway.mockSendWaitingRoomChat({
      roomId: 'room-5',
      senderId: 'room-5-user-1',
      senderNickname: '플레이어1',
      message: overlongMessage,
    })

    const chatMessages =
      gateway.mockDevGetWaitingRoomSnapshot('room-5').chatMessages
    const lastChatMessage = chatMessages[chatMessages.length - 1]

    expect(lastChatMessage?.content).toBe(expectedMessage)
    expect(onChat).toHaveBeenCalledWith(
      expect.objectContaining({
        room_id: 'room-5',
        sender_id: 'room-5-user-1',
        message: expectedMessage,
      })
    )
  })
})

describe('mockGateway waiting-room action sequence', () => {
  it('non-host 준비 토글은 상태를 반전한다', async () => {
    const gateway = await loadMockGateway()

    const firstToggle = await gateway.mockToggleWaitingReady({
      roomId: 'room-5',
      userId: 'room-5-user-2',
    })
    expect(firstToggle.isReady).toBe(true)

    const secondToggle = await gateway.mockToggleWaitingReady({
      roomId: 'room-5',
      userId: 'room-5-user-2',
    })
    expect(secondToggle.isReady).toBe(false)
  })

  it('host 준비 토글은 HOST_CANNOT_TOGGLE_READY 에러를 반환한다', async () => {
    const gateway = await loadMockGateway()

    try {
      await gateway.mockToggleWaitingReady({
        roomId: 'room-5',
        userId: 'room-5-user-1',
      })
      throw new Error('expected error')
    } catch (error) {
      expectGatewayErrorCode(error, 'HOST_CANNOT_TOGGLE_READY')
    }
  })

  it('시작 조건 미충족 상태에서 host 시작 요청은 READY_CONDITION_NOT_MET 에러를 반환한다', async () => {
    const gateway = await loadMockGateway()

    try {
      await gateway.mockStartWaitingGame({
        roomId: 'room-5',
        userId: 'room-5-user-1',
      })
      throw new Error('expected error')
    } catch (error) {
      expectGatewayErrorCode(error, 'READY_CONDITION_NOT_MET')
    }
  })

  it('host가 아닌 사용자의 시작 요청은 ONLY_HOST_CAN_START 에러를 반환한다', async () => {
    const gateway = await loadMockGateway()

    try {
      await gateway.mockStartWaitingGame({
        roomId: 'room-5',
        userId: 'room-5-user-2',
      })
      throw new Error('expected error')
    } catch (error) {
      expectGatewayErrorCode(error, 'ONLY_HOST_CAN_START')
    }
  })

  it('퇴장 후 같은 사용자가 다시 퇴장하면 ALREADY_LEFT_ROOM 에러를 반환한다', async () => {
    const gateway = await loadMockGateway()

    await gateway.mockLeaveWaitingRoom({
      roomId: 'room-5',
      userId: 'room-5-user-2',
    })

    try {
      await gateway.mockLeaveWaitingRoom({
        roomId: 'room-5',
        userId: 'room-5-user-2',
      })
      throw new Error('expected error')
    } catch (error) {
      expectGatewayErrorCode(error, 'ALREADY_LEFT_ROOM')
    }
  })

  it('마지막 인원이 퇴장하면 방이 삭제되어 로비 목록에서 제거된다', async () => {
    const gateway = await loadMockGateway()

    await gateway.mockLeaveWaitingRoom({
      roomId: 'room-2',
      userId: 'room-2-user-1',
    })

    const removedRoom = gateway
      .getMockLobbyRooms()
      .find((room) => room.id === 'room-2')

    expect(removedRoom).toBeUndefined()
  })

  it('입장과 퇴장 시 접속자 목록 상태가 in_room -> lobby로 동기화된다', async () => {
    const gateway = await loadMockGateway()
    const presence = await import('../../../features/presence/mock/mockData')
    const userId = 'presence-sync-user'
    const nickname = '동기화테스터'

    await gateway.mockJoinWaitingRoom({
      roomId: 'room-5',
      userId,
      nickname,
    })

    const joinedUser = presence
      .getMockOnlineUsersSnapshot()
      .find((user) => user.id === userId)

    expect(joinedUser).toBeTruthy()
    expect(joinedUser?.status).toBe('in_room')

    await gateway.mockLeaveWaitingRoom({
      roomId: 'room-5',
      userId,
    })

    const leftUser = presence
      .getMockOnlineUsersSnapshot()
      .find((user) => user.id === userId)

    expect(leftUser).toBeTruthy()
    expect(leftUser?.status).toBe('lobby')
  })

  it('resetMockWaitingRooms는 생성된 임시 방을 제거하고 초기 시드 상태로 되돌린다', async () => {
    const gateway = await loadMockGateway()

    await gateway.mockCreateWaitingRoom({
      title: '임시 테스트 방',
      isPrivate: false,
      hostUserId: 'guest-user',
      hostNickname: '게스트',
    })

    expect(
      gateway
        .getMockLobbyRooms()
        .some((room) => room.title === '임시 테스트 방')
    ).toBe(true)

    gateway.resetMockWaitingRooms()

    expect(
      gateway
        .getMockLobbyRooms()
        .some((room) => room.title === '임시 테스트 방')
    ).toBe(false)
  })
})
