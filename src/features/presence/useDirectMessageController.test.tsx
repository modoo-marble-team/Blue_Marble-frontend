import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createAuthSessionFixture,
  createOnlineUserFixture,
} from '../../test/fixtures'
import { useDirectMessageController } from './useDirectMessageController'
import type { OnlineUser } from './types'

const {
  sendDirectMessageSocketMock,
  subscribeDirectMessageSocketEventsMock,
  unsubscribeDirectMessageSocketMock,
} = vi.hoisted(() => ({
  sendDirectMessageSocketMock: vi.fn(),
  subscribeDirectMessageSocketEventsMock: vi.fn(),
  unsubscribeDirectMessageSocketMock: vi.fn(),
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

    subscribeDirectMessageSocketEventsMock.mockReturnValue(
      unsubscribeDirectMessageSocketMock
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
      receiverNickname: '로비 유저',
      message: '안녕하세요',
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
})
