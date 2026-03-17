import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Dispatch, SetStateAction } from 'react'
import { createAuthSessionFixture } from '../../../test/fixtures'
import { useWaitingRoomSocketSync } from './socketSync'
import type {
  ChatEventPayload,
  GameStartEventPayload,
  HostChangedEventPayload,
  LobbyUpdatedEventPayload,
  PlayerReadyEventPayload,
  RoomUpdatedEventPayload,
  WaitingRoomSnapshot,
} from '../types'

const {
  subscribeWaitingRoomSocketEventsMock,
  unsubscribeMock,
  mapWaitingRoomSnapshotPayloadMock,
  requestOnlineUsersSnapshotSyncMock,
} = vi.hoisted(() => ({
  subscribeWaitingRoomSocketEventsMock: vi.fn(),
  unsubscribeMock: vi.fn(),
  mapWaitingRoomSnapshotPayloadMock: vi.fn(),
  requestOnlineUsersSnapshotSyncMock: vi.fn(),
}))

vi.mock('../socket', () => ({
  subscribeWaitingRoomSocketEvents: subscribeWaitingRoomSocketEventsMock,
}))

vi.mock('../api', () => ({
  mapWaitingRoomSnapshotPayload: mapWaitingRoomSnapshotPayloadMock,
}))

vi.mock('../../../features/presence/onlineUsersSocket', () => ({
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

function createJoinedRoomSnapshotPayload(): WaitingRoomSnapshot {
  return {
    roomId: 'room-5',
    title: '즐거운 게임 한판!',
    status: 'waiting',
    maxPlayers: 4,
    isPrivate: false,
    players: [
      { id: 'user-1', nickname: '테스터', isReady: false, isHost: true },
      { id: 'user-2', nickname: '상대', isReady: false, isHost: false },
      { id: 'user-3', nickname: '새 참가자', isReady: false, isHost: false },
    ],
    chatMessages: [],
  }
}

function createRoomUpdatedPayload(): RoomUpdatedEventPayload {
  return {
    room_id: 'room-5',
    title: '즐거운 게임 한판!',
    status: 'waiting',
    max_players: 4,
    is_private: false,
    players: [
      { id: 'user-1', nickname: '테스터', is_ready: false, is_host: true },
      { id: 'user-2', nickname: '상대', is_ready: false, is_host: false },
      { id: 'user-3', nickname: '새 참가자', is_ready: false, is_host: false },
    ],
    chat_messages: [],
  }
}

interface SocketSyncHookParams {
  roomId: string
  session: ReturnType<typeof createAuthSessionFixture> | null
  activeRoomId?: string
  hasReceivedRoomUpdatedRef: { current: boolean }
  onGameStart: (payload: GameStartEventPayload) => void
  onRoomRemoved: () => void
  setRoom: Dispatch<SetStateAction<WaitingRoomSnapshot | null>>
  setChatMessages: Dispatch<SetStateAction<WaitingRoomSnapshot['chatMessages']>>
  setRoomMock: ReturnType<typeof vi.fn>
  setChatMessagesMock: ReturnType<typeof vi.fn>
}

function createBaseParams(): SocketSyncHookParams {
  const setRoomMock = vi.fn()
  const setChatMessagesMock = vi.fn()

  return {
    roomId: 'room-5',
    session: createAuthSessionFixture({
      userId: 'user-1',
      nickname: '테스터',
    }),
    activeRoomId: 'room-5',
    hasReceivedRoomUpdatedRef: { current: false },
    onGameStart: vi.fn(),
    onRoomRemoved: vi.fn(),
    setRoom: setRoomMock as unknown as Dispatch<
      SetStateAction<WaitingRoomSnapshot | null>
    >,
    setChatMessages: setChatMessagesMock as unknown as Dispatch<
      SetStateAction<WaitingRoomSnapshot['chatMessages']>
    >,
    setRoomMock,
    setChatMessagesMock,
  }
}

describe('useWaitingRoomSocketSync', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    subscribeWaitingRoomSocketEventsMock.mockReturnValue(unsubscribeMock)
    mapWaitingRoomSnapshotPayloadMock.mockReturnValue(
      createJoinedRoomSnapshotPayload()
    )
  })

  it('핵심 입력값(roomId/session)이 없으면 구독을 생략한다', () => {
    const params = createBaseParams()
    params.session = null

    renderHook(() => useWaitingRoomSocketSync(params))

    expect(subscribeWaitingRoomSocketEventsMock).not.toHaveBeenCalled()
  })

  it('onChat은 현재 방 이벤트만 반영하고 중복 메시지를 무시한다', () => {
    const params = createBaseParams()
    renderHook(() => useWaitingRoomSocketSync(params))

    const handlers = subscribeWaitingRoomSocketEventsMock.mock
      .calls[0]?.[0] as {
      onChat: (payload: ChatEventPayload) => void
    }

    act(() => {
      handlers.onChat({
        room_id: 'room-other',
        sender_id: 'user-2',
        sender_nickname: '상대',
        message: '다른 방 메시지',
        sent_at: '2026-03-05T01:00:00.000Z',
      })
    })
    expect(params.setChatMessagesMock).not.toHaveBeenCalled()

    act(() => {
      handlers.onChat({
        room_id: 'room-5',
        sender_id: 'user-2',
        sender_nickname: '상대',
        message: '중복 테스트',
        sent_at: '2026-03-05T01:00:00.000Z',
      })
    })

    const updater = params.setChatMessagesMock.mock.calls[0]?.[0] as
      | ((
          messages: WaitingRoomSnapshot['chatMessages']
        ) => WaitingRoomSnapshot['chatMessages'])
      | undefined
    expect(typeof updater).toBe('function')

    const duplicatedMessages = [
      {
        id: 'room-5-user-2-2026-03-05T01:00:00.000Z',
        senderId: 'user-2',
        senderNickname: '상대',
        content: '중복 테스트',
        timestamp: '2026-03-05T01:00:00.000Z',
        type: 'talk' as const,
      },
    ]
    const deduped = updater?.(duplicatedMessages)
    expect(deduped).toBe(duplicatedMessages)
  })

  it('onPlayerReady와 onHostChanged는 room updater를 통해 플레이어 상태를 갱신한다', () => {
    const params = createBaseParams()
    renderHook(() => useWaitingRoomSocketSync(params))

    const handlers = subscribeWaitingRoomSocketEventsMock.mock
      .calls[0]?.[0] as {
      onPlayerReady: (payload: PlayerReadyEventPayload) => void
      onHostChanged: (payload: HostChangedEventPayload) => void
    }

    act(() => {
      handlers.onPlayerReady({
        player_id: 'user-2',
        is_ready: true,
        all_ready: true,
      })
    })

    const readyUpdater = params.setRoomMock.mock.calls[0]?.[0] as
      | ((room: WaitingRoomSnapshot | null) => WaitingRoomSnapshot | null)
      | undefined
    const afterReady = readyUpdater?.(createRoomSnapshot())
    expect(
      afterReady?.players.find((player) => player.id === 'user-2')?.isReady
    ).toBe(true)

    act(() => {
      handlers.onHostChanged({
        new_host_id: 'user-2',
        new_host_nickname: '상대',
      })
    })

    const hostUpdater = params.setRoomMock.mock.calls[1]?.[0] as
      | ((room: WaitingRoomSnapshot | null) => WaitingRoomSnapshot | null)
      | undefined
    const afterHostChanged = hostUpdater?.(createRoomSnapshot())
    expect(
      afterHostChanged?.players.find((player) => player.id === 'user-2')?.isHost
    ).toBe(true)
    expect(
      afterHostChanged?.players.find((player) => player.id === 'user-2')
        ?.isReady
    ).toBe(false)
  })

  it('onGameStart는 현재 방 이벤트만 전달하고 cleanup에서 unsubscribe를 호출한다', () => {
    const params = createBaseParams()
    const { unmount } = renderHook(() => useWaitingRoomSocketSync(params))

    const handlers = subscribeWaitingRoomSocketEventsMock.mock
      .calls[0]?.[0] as {
      onGameStart: (payload: GameStartEventPayload) => void
    }

    act(() => {
      handlers.onGameStart({
        game_id: 'game-1',
        room_id: 'room-other',
      })
    })
    expect(params.onGameStart).not.toHaveBeenCalled()

    act(() => {
      handlers.onGameStart({
        game_id: 'game-2',
        room_id: 'room-5',
      })
    })
    expect(params.onGameStart).toHaveBeenCalledWith({
      game_id: 'game-2',
      room_id: 'room-5',
    })

    unmount()
    expect(unsubscribeMock).toHaveBeenCalledTimes(1)
  })

  it('lobby_updated removed는 현재 방 삭제일 때만 상태를 비우고 콜백을 호출한다', () => {
    const params = createBaseParams()
    renderHook(() => useWaitingRoomSocketSync(params))

    const handlers = subscribeWaitingRoomSocketEventsMock.mock
      .calls[0]?.[0] as {
      onLobbyUpdated: (payload: LobbyUpdatedEventPayload) => void
    }

    act(() => {
      handlers.onLobbyUpdated({
        action: 'removed',
        room: {
          id: 'room-other',
        },
      })
    })

    expect(params.setRoomMock).not.toHaveBeenCalledWith(null)
    expect(params.setChatMessagesMock).not.toHaveBeenCalledWith([])
    expect(params.onRoomRemoved).not.toHaveBeenCalled()

    act(() => {
      handlers.onLobbyUpdated({
        action: 'removed',
        room: {
          id: 'room-5',
        },
      })
    })

    expect(params.setRoomMock).toHaveBeenCalledWith(null)
    expect(params.setChatMessagesMock).toHaveBeenCalledWith([])
    expect(params.onRoomRemoved).toHaveBeenCalledTimes(1)
  })

  it('room_updated는 현재 방 snapshot을 반영해 플레이어 목록을 갱신한다', async () => {
    const params = createBaseParams()
    renderHook(() => useWaitingRoomSocketSync(params))

    const handlers = subscribeWaitingRoomSocketEventsMock.mock
      .calls[0]?.[0] as {
      onRoomUpdated: (payload: RoomUpdatedEventPayload) => void
    }

    act(() => {
      handlers.onRoomUpdated(createRoomUpdatedPayload())
    })

    await waitFor(() => {
      expect(mapWaitingRoomSnapshotPayloadMock).toHaveBeenCalledWith(
        createRoomUpdatedPayload()
      )
    })

    expect(params.setRoomMock).toHaveBeenCalledWith(
      createJoinedRoomSnapshotPayload()
    )
    expect(params.setChatMessagesMock).toHaveBeenCalledWith([])
    expect(requestOnlineUsersSnapshotSyncMock).toHaveBeenCalledTimes(1)
    expect(params.hasReceivedRoomUpdatedRef.current).toBe(true)
  })

  it('activeRoomId가 없어도 route roomId 기준으로 room_updated를 반영한다', async () => {
    const params = createBaseParams()
    params.activeRoomId = undefined
    renderHook(() => useWaitingRoomSocketSync(params))

    expect(subscribeWaitingRoomSocketEventsMock).toHaveBeenCalledTimes(1)

    const handlers = subscribeWaitingRoomSocketEventsMock.mock
      .calls[0]?.[0] as {
      onRoomUpdated: (payload: RoomUpdatedEventPayload) => void
    }

    act(() => {
      handlers.onRoomUpdated(createRoomUpdatedPayload())
    })

    await waitFor(() => {
      expect(mapWaitingRoomSnapshotPayloadMock).toHaveBeenCalledWith(
        createRoomUpdatedPayload()
      )
    })
  })
})
