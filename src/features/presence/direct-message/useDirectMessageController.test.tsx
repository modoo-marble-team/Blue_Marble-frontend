import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createAuthSessionFixture,
  createOnlineUserFixture,
} from '../../../test/fixtures'
import { useDirectMessageController } from './useDirectMessageController'
import type { OnlineUser } from '../types'

const {
  sendDirectMessageSocketMock,
  subscribeDirectMessageSocketEventsMock,
  unsubscribeDirectMessageSocketMock,
  directMessageReceiveHandlerRef,
} = vi.hoisted(() => ({
  sendDirectMessageSocketMock: vi.fn(),
  subscribeDirectMessageSocketEventsMock: vi.fn(),
  unsubscribeDirectMessageSocketMock: vi.fn(),
  directMessageReceiveHandlerRef: {
    current: null as
      | ((payload: {
          message_id: string
          sender_id: string
          sender_nickname: string
          message: string
          sent_at: string
        }) => void)
      | null,
  },
}))

vi.mock('./directMessageSocket', () => ({
  sendDirectMessage: sendDirectMessageSocketMock,
  subscribeDirectMessageSocketEvents: subscribeDirectMessageSocketEventsMock,
}))

interface RenderDirectMessageControllerHookParams {
  users: OnlineUser[]
  onBlockedByPlaying?: () => void
}

// useDirectMessageController 렌더 헬퍼
function renderDirectMessageControllerHook({
  users,
  onBlockedByPlaying,
}: RenderDirectMessageControllerHookParams) {
  const session = createAuthSessionFixture({
    userId: 'user-me',
    nickname: '나',
  })

  return renderHook(
    ({ nextUsers }) =>
      useDirectMessageController({
        session,
        users: nextUsers,
        onBlockedByPlaying,
      }),
    {
      initialProps: {
        nextUsers: users,
      },
    }
  )
}

describe('useDirectMessageController', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    directMessageReceiveHandlerRef.current = null
    subscribeDirectMessageSocketEventsMock.mockImplementation(
      ({ onReceive }) => {
        directMessageReceiveHandlerRef.current = onReceive
        return unsubscribeDirectMessageSocketMock
      }
    )
  })

  it('playing 상태 유저로 DM 창 열기 시 차단 콜백 호출 후 대상 설정을 막는다', () => {
    const onBlockedByPlaying = vi.fn()
    const playingUser = createOnlineUserFixture({
      id: 'user-2',
      nickname: '게임중 유저',
      status: 'playing',
    })

    const { result } = renderDirectMessageControllerHook({
      users: [playingUser],
      onBlockedByPlaying,
    })

    act(() => {
      result.current.openDirectMessage(playingUser)
    })

    expect(onBlockedByPlaying).toHaveBeenCalledTimes(1)
    expect(result.current.dmTargetUser).toBeNull()
  })

  it('lobby/in_room 상태 유저는 DM 열기 및 전송이 허용된다', () => {
    const lobbyUser = createOnlineUserFixture({
      id: 'user-2',
      nickname: '로비 유저',
      status: 'lobby',
    })

    const { result } = renderDirectMessageControllerHook({
      users: [lobbyUser],
    })

    act(() => {
      result.current.openDirectMessage(lobbyUser)
    })

    expect(result.current.dmTargetUser?.id).toBe('user-2')

    act(() => {
      result.current.sendDirectMessage('안녕하세요')
    })

    expect(sendDirectMessageSocketMock).toHaveBeenCalledWith({
      receiverId: 'user-2',
      message: '안녕하세요',
      clientMessageId: expect.any(String),
    })
    expect(result.current.directMessagesByUserId['user-2']).toHaveLength(1)
  })

  it('대상 유저가 playing 상태가 되면 DM 창을 닫는다', () => {
    const lobbyUser = createOnlineUserFixture({
      id: 'user-2',
      nickname: '상대',
      status: 'lobby',
    })

    const { result, rerender } = renderHook(
      ({ nextUsers }) =>
        useDirectMessageController({
          session: createAuthSessionFixture({
            userId: 'user-me',
            nickname: '나',
          }),
          users: nextUsers,
          onBlockedByPlaying: vi.fn(),
        }),
      {
        initialProps: {
          nextUsers: [lobbyUser],
        },
      }
    )

    act(() => {
      result.current.openDirectMessage(lobbyUser)
    })

    expect(result.current.dmTargetUser?.id).toBe('user-2')

    rerender({
      nextUsers: [
        createOnlineUserFixture({
          id: 'user-2',
          nickname: '상대',
          status: 'playing',
        }),
      ],
    })

    expect(result.current.dmTargetUser).toBeNull()
  })

  it('DM 대상이 playing 상태일 때 전송하면 차단되고 로컬 메시지가 추가되지 않는다', () => {
    const onBlockedByPlaying = vi.fn()
    const mutableUser = createOnlineUserFixture({
      id: 'user-2',
      nickname: '상대',
      status: 'lobby',
    })

    const { result } = renderDirectMessageControllerHook({
      users: [mutableUser],
      onBlockedByPlaying,
    })

    act(() => {
      result.current.openDirectMessage(mutableUser)
    })

    // DM 창이 열린 뒤 상대 상태가 게임중으로 변한 상황을 재현
    mutableUser.status = 'playing'

    act(() => {
      result.current.sendDirectMessage('보내기 시도')
    })

    expect(onBlockedByPlaying).toHaveBeenCalledTimes(1)
    expect(sendDirectMessageSocketMock).not.toHaveBeenCalled()
    expect(result.current.directMessagesByUserId['user-2']).toBeUndefined()
  })

  it('DM 창이 닫힌 상태에서 수신하면 unread 카운트가 증가하고 창을 열면 초기화된다', () => {
    const user = createOnlineUserFixture({
      id: 'user-2',
      nickname: '상대',
      status: 'lobby',
    })

    const { result } = renderDirectMessageControllerHook({
      users: [user],
    })

    act(() => {
      directMessageReceiveHandlerRef.current?.({
        message_id: 'dm-1',
        sender_id: 'user-2',
        sender_nickname: '상대',
        message: '첫 메시지',
        sent_at: '2026-03-03T10:00:00.000Z',
      })
    })

    expect(result.current.unreadDirectMessageCountByUserId['user-2']).toBe(1)

    act(() => {
      result.current.openDirectMessage(user)
    })

    expect(
      result.current.unreadDirectMessageCountByUserId['user-2']
    ).toBeUndefined()
  })

  it('현재 열어본 DM 대상은 창을 닫아도 이전 unread badge가 다시 보이지 않는다', () => {
    const user = createOnlineUserFixture({
      id: 'user-2',
      nickname: '상대',
      status: 'lobby',
    })

    const { result } = renderDirectMessageControllerHook({
      users: [user],
    })

    act(() => {
      directMessageReceiveHandlerRef.current?.({
        message_id: 'dm-1',
        sender_id: 'user-2',
        sender_nickname: '상대',
        message: '첫 메시지',
        sent_at: '2026-03-03T10:00:00.000Z',
      })
    })

    expect(result.current.unreadDirectMessageCountByUserId['user-2']).toBe(1)

    act(() => {
      result.current.openDirectMessage(user)
    })

    act(() => {
      result.current.sendDirectMessage('응답 메시지')
      result.current.closeDirectMessage()
    })

    expect(result.current.dmTargetUser).toBeNull()
    expect(
      result.current.unreadDirectMessageCountByUserId['user-2']
    ).toBeUndefined()
  })

  it('DM 창을 열고 닫아도 수신 구독은 유지되고 닫은 직후 메시지는 unread로 반영된다', () => {
    const user = createOnlineUserFixture({
      id: 'user-2',
      nickname: '상대',
      status: 'lobby',
    })

    const { result } = renderDirectMessageControllerHook({
      users: [user],
    })

    expect(subscribeDirectMessageSocketEventsMock).toHaveBeenCalledTimes(1)

    act(() => {
      result.current.openDirectMessage(user)
      result.current.closeDirectMessage()
    })

    expect(subscribeDirectMessageSocketEventsMock).toHaveBeenCalledTimes(1)

    act(() => {
      directMessageReceiveHandlerRef.current?.({
        message_id: 'dm-after-close',
        sender_id: 'user-2',
        sender_nickname: '상대',
        message: '닫은 직후 메시지',
        sent_at: '2026-03-03T10:05:00.000Z',
      })
    })

    expect(result.current.unreadDirectMessageCountByUserId['user-2']).toBe(1)
  })

  it('현재 열려 있는 대상의 수신 메시지는 unread가 증가하지 않는다', () => {
    const user = createOnlineUserFixture({
      id: 'user-2',
      nickname: '상대',
      status: 'lobby',
    })

    const { result } = renderDirectMessageControllerHook({
      users: [user],
    })

    act(() => {
      result.current.openDirectMessage(user)
    })

    act(() => {
      directMessageReceiveHandlerRef.current?.({
        message_id: 'dm-2',
        sender_id: 'user-2',
        sender_nickname: '상대',
        message: '열린 창 메시지',
        sent_at: '2026-03-03T10:01:00.000Z',
      })
    })

    expect(
      result.current.unreadDirectMessageCountByUserId['user-2']
    ).toBeUndefined()
  })

  it('다른 사용자의 수신 메시지는 unread가 사용자별로 독립 누적된다', () => {
    const user2 = createOnlineUserFixture({
      id: 'user-2',
      nickname: '상대A',
      status: 'lobby',
    })
    const user3 = createOnlineUserFixture({
      id: 'user-3',
      nickname: '상대B',
      status: 'in_room',
    })

    const { result } = renderDirectMessageControllerHook({
      users: [user2, user3],
    })

    act(() => {
      result.current.openDirectMessage(user2)
    })

    act(() => {
      directMessageReceiveHandlerRef.current?.({
        message_id: 'dm-3',
        sender_id: 'user-3',
        sender_nickname: '상대B',
        message: '다른 사용자 메시지',
        sent_at: '2026-03-03T10:02:00.000Z',
      })
    })

    expect(
      result.current.unreadDirectMessageCountByUserId['user-2']
    ).toBeUndefined()
    expect(result.current.unreadDirectMessageCountByUserId['user-3']).toBe(1)
  })

  it('같은 사용자의 수신 메시지가 여러 개 오면 unread가 메시지 수만큼 증가한다', () => {
    const user = createOnlineUserFixture({
      id: 'user-2',
      nickname: '상대',
      status: 'lobby',
    })

    const { result } = renderDirectMessageControllerHook({
      users: [user],
    })

    act(() => {
      directMessageReceiveHandlerRef.current?.({
        message_id: 'dm-1',
        sender_id: 'user-2',
        sender_nickname: '상대',
        message: '첫 메시지',
        sent_at: '2026-03-03T10:00:00.000Z',
      })
      directMessageReceiveHandlerRef.current?.({
        message_id: 'dm-2',
        sender_id: 'user-2',
        sender_nickname: '상대',
        message: '두 번째 메시지',
        sent_at: '2026-03-03T10:01:00.000Z',
      })
      directMessageReceiveHandlerRef.current?.({
        message_id: 'dm-3',
        sender_id: 'user-2',
        sender_nickname: '상대',
        message: '세 번째 메시지',
        sent_at: '2026-03-03T10:02:00.000Z',
      })
    })

    expect(result.current.directMessagesByUserId['user-2']).toHaveLength(3)
    expect(result.current.unreadDirectMessageCountByUserId['user-2']).toBe(3)
  })

  it('동일 message_id 수신은 중복 삽입하지 않는다', () => {
    const user = createOnlineUserFixture({
      id: 'user-2',
      nickname: '상대',
      status: 'lobby',
    })

    const { result } = renderDirectMessageControllerHook({
      users: [user],
    })

    act(() => {
      directMessageReceiveHandlerRef.current?.({
        message_id: 'dm-duplicate',
        sender_id: 'user-2',
        sender_nickname: '상대',
        message: '중복 메시지',
        sent_at: '2026-03-03T10:03:00.000Z',
      })
      directMessageReceiveHandlerRef.current?.({
        message_id: 'dm-duplicate',
        sender_id: 'user-2',
        sender_nickname: '상대',
        message: '중복 메시지',
        sent_at: '2026-03-03T10:03:00.000Z',
      })
    })

    expect(result.current.directMessagesByUserId['user-2']).toHaveLength(1)
    expect(result.current.unreadDirectMessageCountByUserId['user-2']).toBe(1)
  })
})
