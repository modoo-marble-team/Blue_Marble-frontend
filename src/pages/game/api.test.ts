import { afterEach, describe, expect, it, vi } from 'vitest'
import axios from 'axios'

async function loadGameApiModule(options?: { mockEnabled?: boolean }) {
  const postMock = vi.fn()
  const mockLeaveWaitingRoomMock = vi.fn()

  vi.resetModules()

  vi.doMock('../../config/env', () => ({
    IS_SOCKET_MOCK_ENABLED: options?.mockEnabled ?? false,
  }))
  vi.doMock('../../lib/axios', () => ({
    apiClient: {
      post: postMock,
    },
  }))
  vi.doMock('../waiting-room/socket/mockGateway', () => ({
    mockLeaveWaitingRoom: mockLeaveWaitingRoomMock,
  }))

  const module = await import('./api')

  return {
    module,
    postMock,
    mockLeaveWaitingRoomMock,
  }
}

describe('game api', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.resetModules()
  })

  it('leaveRoomFromGame은 실서버 모드에서 rooms leave endpoint를 호출한다', async () => {
    const { module, postMock } = await loadGameApiModule()

    postMock.mockResolvedValue({
      data: {
        success: true,
        new_host_id: 'host-2',
      },
    })

    const result = await module.leaveRoomFromGame({ roomId: 'room-1' })

    expect(postMock).toHaveBeenCalledWith('/rooms/room-1/leave')
    expect(result).toEqual({
      success: true,
      newHostId: 'host-2',
    })
  })

  it('leaveRoomFromGame은 mock 모드에서 waiting-room leave gateway를 재사용한다', async () => {
    const { module, postMock, mockLeaveWaitingRoomMock } =
      await loadGameApiModule({ mockEnabled: true })

    mockLeaveWaitingRoomMock.mockResolvedValue({
      success: true,
      newHostId: 'host-2',
    })

    const result = await module.leaveRoomFromGame({
      roomId: 'room-1',
      userId: 'user-1',
    })

    expect(postMock).not.toHaveBeenCalled()
    expect(mockLeaveWaitingRoomMock).toHaveBeenCalledWith({
      roomId: 'room-1',
      userId: 'user-1',
    })
    expect(result).toEqual({
      success: true,
      newHostId: 'host-2',
    })
  })

  it('getGameLeaveErrorMessage는 공통 API 오류 메시지를 사용한다', async () => {
    const { module } = await loadGameApiModule()

    const error = new axios.AxiosError(
      'Request failed with status code 403',
      undefined,
      undefined,
      undefined,
      {
        status: 403,
        statusText: 'error',
        headers: {},
        config: { headers: {} as never },
        data: {
          message: '게임을 나갈 수 없습니다.',
        },
      }
    )

    expect(
      module.getGameLeaveErrorMessage(error, '게임 나가기에 실패했습니다.')
    ).toBe('게임을 나갈 수 없습니다.')
  })
})
