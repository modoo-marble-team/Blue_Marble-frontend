import { afterEach, describe, expect, it, vi } from 'vitest'
import axios from 'axios'

async function loadGameApiModule(options?: { mockEnabled?: boolean }) {
  const postMock = vi.fn()
  const setMockOnlineUserStatusMock = vi.fn()

  vi.resetModules()

  vi.doMock('../../config/env', () => ({
    IS_SOCKET_MOCK_ENABLED: options?.mockEnabled ?? false,
  }))
  vi.doMock('../../lib/axios', () => ({
    apiClient: {
      post: postMock,
    },
  }))
  vi.doMock('../../features/presence/mock/mockData', () => ({
    setMockOnlineUserStatus: setMockOnlineUserStatusMock,
  }))

  const module = await import('./api')

  return {
    module,
    postMock,
    setMockOnlineUserStatusMock,
  }
}

describe('game api', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.resetModules()
  })

  it('leaveGame은 실서버 모드에서 games leave endpoint를 호출한다', async () => {
    const { module, postMock } = await loadGameApiModule()

    postMock.mockResolvedValue({
      data: {
        success: true,
        room_id: 'room-1',
        resume_target: 'lobby',
      },
    })

    const result = await module.leaveGame({ gameId: 'game-1' })

    expect(postMock).toHaveBeenCalledWith('/games/game-1/leave')
    expect(result).toEqual({
      success: true,
      roomId: 'room-1',
      resumeTarget: 'lobby',
    })
  })

  it('leaveGame은 mock 모드에서 접속 상태를 lobby로 바꾸고 성공 결과를 반환한다', async () => {
    const { module, postMock, setMockOnlineUserStatusMock } =
      await loadGameApiModule({ mockEnabled: true })

    const result = await module.leaveGame({
      gameId: 'game-1',
      userId: 'user-1',
      nickname: '유저1',
    })

    expect(postMock).not.toHaveBeenCalled()
    expect(setMockOnlineUserStatusMock).toHaveBeenCalledWith(
      'user-1',
      'lobby',
      '유저1'
    )
    expect(result).toEqual({
      success: true,
      roomId: null,
      resumeTarget: 'lobby',
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
