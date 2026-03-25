import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createAuthSessionFixture } from '../../../test/fixtures'
import { useWaitingRoomActions } from './actions'
import type { WaitingRoomSnapshot } from '../api/types'
import type { WaitingRoomActionResult } from './state'

const {
  leaveWaitingRoomMock,
  startWaitingGameMock,
  toggleWaitingReadyMock,
  getWaitingRoomErrorMessageMock,
  leaveWaitingRoomSocketMock,
  requestOnlineUsersSnapshotSyncMock,
  sendWaitingRoomChatMock,
} = vi.hoisted(() => ({
  leaveWaitingRoomMock: vi.fn(),
  startWaitingGameMock: vi.fn(),
  toggleWaitingReadyMock: vi.fn(),
  getWaitingRoomErrorMessageMock: vi.fn(),
  leaveWaitingRoomSocketMock: vi.fn(),
  requestOnlineUsersSnapshotSyncMock: vi.fn(),
  sendWaitingRoomChatMock: vi.fn(),
}))

vi.mock('../api/api', () => ({
  leaveWaitingRoom: leaveWaitingRoomMock,
  startWaitingGame: startWaitingGameMock,
  toggleWaitingReady: toggleWaitingReadyMock,
  getWaitingRoomErrorMessage: getWaitingRoomErrorMessageMock,
}))

vi.mock('../socket/socket', () => ({
  leaveWaitingRoomSocket: leaveWaitingRoomSocketMock,
  sendWaitingRoomChat: sendWaitingRoomChatMock,
}))

vi.mock('../../../features/presence/online-users/onlineUsersSocket', () => ({
  requestOnlineUsersSnapshotSync: requestOnlineUsersSnapshotSyncMock,
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
      { id: 'user-2', nickname: '상대', isReady: false, isHost: false },
    ],
    chatMessages: [],
  }
}

function createActionsHookParams(overrides: Record<string, unknown> = {}) {
  const session = createAuthSessionFixture({
    userId: 'user-1',
    nickname: '테스터',
  })
  const room = createRoomSnapshot()

  return {
    roomId: room.roomId,
    room,
    session,
    canToggleReady: true,
    canStartGame: true,
    isReadyPending: false,
    isStartPending: false,
    hasEnteredRoomRef: { current: true },
    hasLeftRoomRef: { current: false },
    shouldSkipNextCleanupLeaveRef: { current: false },
    leaveInFlightRef: {
      current: null as Promise<WaitingRoomActionResult> | null,
    },
    sessionRef: { current: session },
    roomIdRef: { current: room.roomId },
    roomRef: { current: room },
    setRoom: vi.fn(),
    setIsReadyPending: vi.fn(),
    setIsStartPending: vi.fn(),
    setIsLeavePending: vi.fn(),
    ...overrides,
  }
}

describe('useWaitingRoomActions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getWaitingRoomErrorMessageMock.mockReturnValue('요청에 실패했습니다.')
  })

  it('sendChatMessage는 세션/방 정보가 있을 때만 소켓 전송을 호출한다', () => {
    const params = createActionsHookParams()
    const { result } = renderHook(() => useWaitingRoomActions(params))

    act(() => {
      result.current.sendChatMessage('안녕하세요')
    })

    expect(sendWaitingRoomChatMock).toHaveBeenCalledWith({
      roomId: 'room-5',
      senderId: 'user-1',
      senderNickname: '테스터',
      message: '안녕하세요',
    })
  })

  it('leaveRoom 수동 호출 성공 시 leave API와 leave 소켓 이벤트를 순차 실행한다', async () => {
    leaveWaitingRoomMock.mockResolvedValue({ success: true })
    const params = createActionsHookParams()
    const { result } = renderHook(() => useWaitingRoomActions(params))

    let response: WaitingRoomActionResult | undefined
    await act(async () => {
      response = await result.current.leaveRoom()
    })

    expect(response).toEqual({ ok: true })
    expect(params.setIsLeavePending).toHaveBeenNthCalledWith(1, true)
    expect(leaveWaitingRoomMock).toHaveBeenCalledWith({
      roomId: 'room-5',
      userId: 'user-1',
    })
    expect(leaveWaitingRoomSocketMock).toHaveBeenCalledWith({
      roomId: 'room-5',
    })
    expect(requestOnlineUsersSnapshotSyncMock).toHaveBeenCalledWith({
      includeFollowUpRefresh: true,
    })
    expect(params.setIsLeavePending).toHaveBeenLastCalledWith(false)
    expect(params.hasLeftRoomRef.current).toBe(true)
  })

  it('leaveRoom 중복 호출 시 진행 중 Promise를 재사용한다', async () => {
    let resolveLeave: (() => void) | undefined
    leaveWaitingRoomMock.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveLeave = () => resolve()
        })
    )

    const params = createActionsHookParams()
    const { result } = renderHook(() => useWaitingRoomActions(params))

    let firstPromise!: Promise<WaitingRoomActionResult>
    let secondPromise!: Promise<WaitingRoomActionResult>

    act(() => {
      firstPromise = result.current.leaveRoom()
      secondPromise = result.current.leaveRoom()
    })

    expect(leaveWaitingRoomMock).toHaveBeenCalledTimes(1)

    if (resolveLeave) {
      resolveLeave()
    }
    let firstResult: WaitingRoomActionResult | undefined
    let secondResult: WaitingRoomActionResult | undefined

    await act(async () => {
      firstResult = await firstPromise
      secondResult = await secondPromise
    })

    expect(firstResult).toEqual({ ok: true })
    expect(secondResult).toEqual({ ok: true })
  })

  it('cleanup에서 skip 플래그가 켜져 있으면 퇴장 시퀀스를 실행하지 않는다', () => {
    const params = createActionsHookParams({
      shouldSkipNextCleanupLeaveRef: { current: true },
    })

    const { unmount } = renderHook(() => useWaitingRoomActions(params))
    unmount()

    expect(leaveWaitingRoomMock).not.toHaveBeenCalled()
    expect(params.shouldSkipNextCleanupLeaveRef.current).toBe(false)
  })

  it('browser unload 이후 cleanup에서는 퇴장 시퀀스를 실행하지 않는다', () => {
    const params = createActionsHookParams()

    const { unmount } = renderHook(() => useWaitingRoomActions(params))

    act(() => {
      window.dispatchEvent(new Event('beforeunload'))
    })

    unmount()

    expect(leaveWaitingRoomMock).not.toHaveBeenCalled()
    expect(params.shouldSkipNextCleanupLeaveRef.current).toBe(false)
  })

  it('문서 visibility가 hidden이면 cleanup leave를 실행하지 않는다', () => {
    const params = createActionsHookParams()
    const originalVisibilityState = document.visibilityState

    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'hidden',
    })

    const { unmount } = renderHook(() => useWaitingRoomActions(params))
    unmount()

    expect(leaveWaitingRoomMock).not.toHaveBeenCalled()

    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: originalVisibilityState,
    })
  })

  it('handleToggleReady 성공 시 setRoom updater로 내 준비 상태를 갱신한다', async () => {
    toggleWaitingReadyMock.mockResolvedValue({ isReady: true })
    const params = createActionsHookParams({
      canStartGame: false,
    })
    const { result } = renderHook(() => useWaitingRoomActions(params))

    let response: WaitingRoomActionResult | undefined
    await act(async () => {
      response = await result.current.handleToggleReady()
    })

    expect(response).toEqual({ ok: true })
    expect(toggleWaitingReadyMock).toHaveBeenCalledWith({
      roomId: 'room-5',
      userId: 'user-1',
    })

    const updater = params.setRoom.mock.calls[0]?.[0] as
      | ((snapshot: WaitingRoomSnapshot | null) => WaitingRoomSnapshot | null)
      | undefined
    expect(typeof updater).toBe('function')

    const updatedRoom = updater?.(createRoomSnapshot())
    const me = updatedRoom?.players.find((player) => player.id === 'user-1')
    expect(me?.isReady).toBe(true)
  })

  it('handleStartGame 실패 시 파싱된 에러 메시지를 반환한다', async () => {
    startWaitingGameMock.mockRejectedValue(new Error('failed'))
    getWaitingRoomErrorMessageMock.mockReturnValue('게임 시작 실패')

    const params = createActionsHookParams()
    const { result } = renderHook(() => useWaitingRoomActions(params))

    let response: WaitingRoomActionResult | undefined
    await act(async () => {
      response = await result.current.handleStartGame()
    })

    expect(response).toEqual({
      ok: false,
      message: '게임 시작 실패',
    })
    expect(params.setIsStartPending).toHaveBeenNthCalledWith(1, true)
    expect(params.setIsStartPending).toHaveBeenLastCalledWith(false)
  })
})
