import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Dispatch, SetStateAction } from 'react'
import { createAuthSessionFixture } from '../../../test/fixtures'
import { useWaitingRoomSocketSync } from './socketSync'
import type {
  ChatEventPayload,
  GameStartEventPayload,
  HostChangedEventPayload,
  PlayerReadyEventPayload,
  WaitingRoomSnapshot,
} from '../types'

const { subscribeWaitingRoomSocketEventsMock, unsubscribeMock } = vi.hoisted(
  () => ({
    subscribeWaitingRoomSocketEventsMock: vi.fn(),
    unsubscribeMock: vi.fn(),
  })
)

vi.mock('../socket', () => ({
  subscribeWaitingRoomSocketEvents: subscribeWaitingRoomSocketEventsMock,
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

interface SocketSyncHookParams {
  roomId: string
  session: ReturnType<typeof createAuthSessionFixture> | null
  activeRoomId?: string
  onGameStart: (payload: GameStartEventPayload) => void
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
    onGameStart: vi.fn(),
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
  })

  it('핵심 입력값(roomId/session/activeRoomId)이 없으면 구독을 생략한다', () => {
    const params = createBaseParams()
    params.activeRoomId = undefined

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
})
