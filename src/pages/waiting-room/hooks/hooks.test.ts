import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createAuthSessionFixture } from '../../../test/fixtures'
import type { GameStartEventPayload, WaitingRoomSnapshot } from '../api/types'
import { useWaitingRoomController } from './hooks'

const {
  useWaitingRoomLifecycleMock,
  useWaitingRoomSocketSyncMock,
  useWaitingRoomActionsMock,
  getStartConditionMetMock,
  buildWaitingRoomSeatsMock,
} = vi.hoisted(() => ({
  useWaitingRoomLifecycleMock: vi.fn(),
  useWaitingRoomSocketSyncMock: vi.fn(),
  useWaitingRoomActionsMock: vi.fn(),
  getStartConditionMetMock: vi.fn(),
  buildWaitingRoomSeatsMock: vi.fn(),
}))

vi.mock('../controller/lifecycle', () => ({
  useWaitingRoomLifecycle: useWaitingRoomLifecycleMock,
}))

vi.mock('../controller/socketSync', () => ({
  useWaitingRoomSocketSync: useWaitingRoomSocketSyncMock,
}))

vi.mock('../controller/actions', () => ({
  useWaitingRoomActions: useWaitingRoomActionsMock,
}))

vi.mock('../controller/state', () => ({
  buildWaitingRoomSeats: buildWaitingRoomSeatsMock,
  getStartConditionMet: getStartConditionMetMock,
}))

function createRoomSnapshot(): WaitingRoomSnapshot {
  return {
    roomId: 'room-5',
    title: '즐거운 게임 한판!',
    status: 'waiting',
    maxPlayers: 4,
    isPrivate: false,
    players: [
      { id: 'user-1', nickname: '테스터', isReady: false, isHost: true },
    ],
    chatMessages: [],
  }
}

describe('useWaitingRoomController', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    getStartConditionMetMock.mockReturnValue(false)
    buildWaitingRoomSeatsMock.mockReturnValue([])
    useWaitingRoomActionsMock.mockReturnValue({
      sendChatMessage: vi.fn(),
      handleToggleReady: vi.fn(),
      handleStartGame: vi.fn(),
      leaveRoom: vi.fn(),
    })
  })

  it('game_start 이동 경로에서는 cleanup leave를 건너뛰도록 skip ref를 세팅한다', () => {
    const session = createAuthSessionFixture({
      userId: 'user-1',
      nickname: '테스터',
    })
    const room = createRoomSnapshot()
    const parentOnGameStart = vi.fn()

    renderHook(() =>
      useWaitingRoomController({
        roomId: room.roomId,
        session,
        preJoinedSnapshot: room,
        onGameStart: parentOnGameStart,
        onRoomRemoved: vi.fn(),
      })
    )

    const actionParams = useWaitingRoomActionsMock.mock.calls[0]?.[0] as
      | {
          shouldSkipNextCleanupLeaveRef: { current: boolean }
        }
      | undefined
    const socketSyncParams = useWaitingRoomSocketSyncMock.mock.calls[0]?.[0] as
      | {
          onGameStart: (payload: GameStartEventPayload) => void
        }
      | undefined

    expect(actionParams).toBeDefined()
    expect(socketSyncParams).toBeDefined()
    if (actionParams) {
      actionParams.shouldSkipNextCleanupLeaveRef.current = false
    }

    act(() => {
      socketSyncParams?.onGameStart({
        game_id: 'game-123',
        room_id: 'room-5',
      })
    })

    expect(actionParams?.shouldSkipNextCleanupLeaveRef.current).toBe(true)
    expect(parentOnGameStart).toHaveBeenCalledWith({
      game_id: 'game-123',
      room_id: 'room-5',
    })
  })
})
