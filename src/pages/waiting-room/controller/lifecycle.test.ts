import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createAuthSessionFixture } from '../../../test/fixtures'
import { useWaitingRoomLifecycle } from './lifecycle'
import type { WaitingRoomSnapshot } from '../api/types'

const {
  joinWaitingRoomMock,
  getWaitingRoomErrorMessageMock,
  enterWaitingRoomSocketMock,
  requestOnlineUsersSnapshotSyncMock,
} = vi.hoisted(() => ({
  joinWaitingRoomMock: vi.fn(),
  getWaitingRoomErrorMessageMock: vi.fn(),
  enterWaitingRoomSocketMock: vi.fn(),
  requestOnlineUsersSnapshotSyncMock: vi.fn(),
}))

vi.mock('../api/api', () => ({
  joinWaitingRoom: joinWaitingRoomMock,
  getWaitingRoomErrorMessage: getWaitingRoomErrorMessageMock,
}))

vi.mock('../socket/socket', () => ({
  enterWaitingRoomSocket: enterWaitingRoomSocketMock,
}))

vi.mock('../../../features/presence/online-users/onlineUsersSocket', () => ({
  requestOnlineUsersSnapshotSync: requestOnlineUsersSnapshotSyncMock,
}))

function createPreJoinedSnapshot(): WaitingRoomSnapshot {
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

function createLifecycleParams(overrides: Record<string, unknown> = {}) {
  const session = createAuthSessionFixture({
    userId: 'user-1',
    nickname: '테스터',
  })

  return {
    roomId: 'room-5',
    session,
    fallbackRoomTitle: 'fallback',
    preJoinedSnapshot: null,
    resumeRoomMembership: false,
    resumeBootstrapSnapshot: null,
    hasReceivedRoomUpdatedRef: { current: false },
    hasEnteredRoomRef: { current: false },
    hasLeftRoomRef: { current: false },
    hasInitializedPreJoinRef: { current: false },
    setRoom: vi.fn(),
    setChatMessages: vi.fn(),
    setIsRoomLoading: vi.fn(),
    setRoomErrorMessage: vi.fn(),
    ...overrides,
  }
}

describe('useWaitingRoomLifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getWaitingRoomErrorMessageMock.mockReturnValue(
      '대기방 입장에 실패했습니다.'
    )
  })

  it('roomId가 없으면 방 상태를 초기화한다', () => {
    const params = createLifecycleParams({
      roomId: '',
      hasEnteredRoomRef: { current: true },
      hasLeftRoomRef: { current: true },
      hasInitializedPreJoinRef: { current: true },
    })

    renderHook(() => useWaitingRoomLifecycle(params))

    expect(params.setRoom).toHaveBeenCalledWith(null)
    expect(params.setChatMessages).toHaveBeenCalledWith([])
    expect(params.setIsRoomLoading).toHaveBeenCalledWith(false)
    expect(params.setRoomErrorMessage).toHaveBeenCalledWith(null)
    expect(params.hasEnteredRoomRef.current).toBe(false)
    expect(params.hasLeftRoomRef.current).toBe(false)
    expect(params.hasInitializedPreJoinRef.current).toBe(false)
  })

  it('preJoinedSnapshot이 있으면 join API 없이 즉시 상태를 반영한다', () => {
    const preJoinedSnapshot = createPreJoinedSnapshot()
    const params = createLifecycleParams({
      preJoinedSnapshot,
    })

    renderHook(() => useWaitingRoomLifecycle(params))

    expect(joinWaitingRoomMock).not.toHaveBeenCalled()
    expect(params.setRoom).toHaveBeenCalledWith(preJoinedSnapshot)
    expect(params.setChatMessages).toHaveBeenCalledWith(
      preJoinedSnapshot.chatMessages
    )
    expect(enterWaitingRoomSocketMock).toHaveBeenCalledWith({
      roomId: 'room-5',
    })
    expect(requestOnlineUsersSnapshotSyncMock).toHaveBeenCalledTimes(1)
    expect(params.hasEnteredRoomRef.current).toBe(true)
    expect(params.hasInitializedPreJoinRef.current).toBe(true)
  })

  it('join 성공 시 스냅샷 반영과 enter_room 소켓 전송을 수행한다', async () => {
    const joinedSnapshot = createPreJoinedSnapshot()
    joinWaitingRoomMock.mockResolvedValue(joinedSnapshot)
    const params = createLifecycleParams()

    renderHook(() => useWaitingRoomLifecycle(params))

    await waitFor(() => {
      expect(joinWaitingRoomMock).toHaveBeenCalledWith({
        roomId: 'room-5',
        userId: 'user-1',
        nickname: '테스터',
        fallbackTitle: 'fallback',
      })
    })

    expect(params.setRoom).toHaveBeenCalledWith(joinedSnapshot)
    expect(params.setChatMessages).toHaveBeenCalledWith(
      joinedSnapshot.chatMessages
    )
    expect(enterWaitingRoomSocketMock).toHaveBeenCalledWith({
      roomId: 'room-5',
    })
    expect(requestOnlineUsersSnapshotSyncMock).toHaveBeenCalledTimes(1)
    expect(params.setIsRoomLoading).toHaveBeenCalledWith(true)
    expect(params.setIsRoomLoading).toHaveBeenLastCalledWith(false)
  })

  it('resume room 경로에서 bootstrap snapshot이 있으면 즉시 상태를 복구하고 background join refresh를 시작한다', async () => {
    const resumeBootstrapSnapshot = createPreJoinedSnapshot()
    const refreshedSnapshot = {
      ...resumeBootstrapSnapshot,
      players: [
        { id: 'user-1', nickname: '테스터', isReady: false, isHost: true },
        { id: 'user-2', nickname: '상대', isReady: false, isHost: false },
      ],
    }
    joinWaitingRoomMock.mockResolvedValue(refreshedSnapshot)
    const params = createLifecycleParams({
      resumeRoomMembership: true,
      resumeBootstrapSnapshot,
    })

    renderHook(() => useWaitingRoomLifecycle(params))

    expect(params.setRoom).toHaveBeenCalledWith(resumeBootstrapSnapshot)
    expect(params.setChatMessages).toHaveBeenCalledWith(
      resumeBootstrapSnapshot.chatMessages
    )
    expect(params.setIsRoomLoading).toHaveBeenCalledWith(false)
    expect(enterWaitingRoomSocketMock).toHaveBeenCalledWith({
      roomId: 'room-5',
    })
    expect(requestOnlineUsersSnapshotSyncMock).toHaveBeenCalledTimes(1)

    await waitFor(() => {
      expect(joinWaitingRoomMock).toHaveBeenCalledWith({
        roomId: 'room-5',
        userId: 'user-1',
        nickname: '테스터',
        fallbackTitle: 'fallback',
      })
    })

    expect(params.setRoom).toHaveBeenCalledWith(refreshedSnapshot)
    expect(params.setChatMessages).toHaveBeenCalledWith(
      refreshedSnapshot.chatMessages
    )
  })

  it('resume room 경로에서 bootstrap snapshot이 없으면 loading을 유지한 채 authoritative join refresh를 기다린다', async () => {
    const joinedSnapshot = createPreJoinedSnapshot()
    joinWaitingRoomMock.mockResolvedValue(joinedSnapshot)
    const params = createLifecycleParams({
      resumeRoomMembership: true,
    })

    renderHook(() => useWaitingRoomLifecycle(params))

    expect(params.setRoom).not.toHaveBeenCalled()
    expect(params.setChatMessages).not.toHaveBeenCalled()
    expect(params.setIsRoomLoading).toHaveBeenCalledWith(true)
    expect(enterWaitingRoomSocketMock).toHaveBeenCalledWith({
      roomId: 'room-5',
    })
    expect(requestOnlineUsersSnapshotSyncMock).toHaveBeenCalledTimes(1)
    expect(params.hasEnteredRoomRef.current).toBe(true)
    expect(params.hasLeftRoomRef.current).toBe(false)

    await waitFor(() => {
      expect(joinWaitingRoomMock).toHaveBeenCalledWith({
        roomId: 'room-5',
        userId: 'user-1',
        nickname: '테스터',
        fallbackTitle: 'fallback',
      })
    })

    expect(params.setRoom).toHaveBeenCalledWith(joinedSnapshot)
    expect(params.setChatMessages).toHaveBeenCalledWith(
      joinedSnapshot.chatMessages
    )
    expect(params.setIsRoomLoading).toHaveBeenLastCalledWith(false)
  })

  it('room_updated가 join 응답보다 먼저 오면 뒤늦은 join 응답이 room 상태를 다시 덮지 않는다', async () => {
    const joinedSnapshot = createPreJoinedSnapshot()
    let resolveJoin: ((snapshot: WaitingRoomSnapshot) => void) | undefined
    joinWaitingRoomMock.mockReturnValue(
      new Promise<WaitingRoomSnapshot>((resolve) => {
        resolveJoin = resolve
      })
    )
    const params = createLifecycleParams({
      resumeRoomMembership: true,
    })

    renderHook(() => useWaitingRoomLifecycle(params))

    params.hasReceivedRoomUpdatedRef.current = true

    await act(async () => {
      resolveJoin?.(joinedSnapshot)
      await Promise.resolve()
    })

    await waitFor(() => {
      expect(joinWaitingRoomMock).toHaveBeenCalled()
    })

    expect(params.setRoom).not.toHaveBeenCalledWith(joinedSnapshot)
    expect(params.setChatMessages).not.toHaveBeenCalledWith(
      joinedSnapshot.chatMessages
    )
    expect(enterWaitingRoomSocketMock).toHaveBeenCalledWith({
      roomId: 'room-5',
    })
  })

  it('join 실패 시 파싱된 오류 메시지를 roomError로 설정한다', async () => {
    joinWaitingRoomMock.mockRejectedValue(new Error('join failed'))
    getWaitingRoomErrorMessageMock.mockReturnValue('입장 실패')
    const params = createLifecycleParams()

    renderHook(() => useWaitingRoomLifecycle(params))

    await waitFor(() => {
      expect(params.setRoomErrorMessage).toHaveBeenCalledWith('입장 실패')
    })
    expect(params.setIsRoomLoading).toHaveBeenLastCalledWith(false)
  })
})
