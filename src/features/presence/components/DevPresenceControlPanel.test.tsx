import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createOnlineUserFixture } from '../../../test/fixtures'
import { DevPresenceControlPanel } from './DevPresenceControlPanel'

const {
  emitDirectMessageReceiveMockForDevMock,
  isOnlineUsersSocketMockModeMock,
} = vi.hoisted(() => ({
  emitDirectMessageReceiveMockForDevMock: vi.fn(),
  isOnlineUsersSocketMockModeMock: vi.fn(),
}))

vi.mock('../direct-message/directMessageSocket', () => ({
  emitDirectMessageReceiveMockForDev: emitDirectMessageReceiveMockForDevMock,
}))

vi.mock('../mock/mockData', () => ({
  setMockOnlineUserStatus: vi.fn(),
}))

vi.mock('../online-users/onlineUsersSocket', () => ({
  emitMockOnlineUsersSnapshot: vi.fn(),
  isOnlineUsersSocketMockMode: isOnlineUsersSocketMockModeMock,
}))

describe('DevPresenceControlPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    isOnlineUsersSocketMockModeMock.mockReturnValue(true)
  })

  it('수신 DM 입력에서 Enter를 누르면 선택 유저 기준으로 DM 수신을 주입한다', async () => {
    const user = userEvent.setup()

    render(
      <DevPresenceControlPanel
        users={[
          createOnlineUserFixture({
            id: 'user-1',
            nickname: '테스터',
            status: 'lobby',
          }),
          createOnlineUserFixture({
            id: 'user-2',
            nickname: '상대방',
            status: 'lobby',
          }),
        ]}
        currentUserId="user-1"
      />
    )

    await user.click(
      screen.getByRole('button', { name: 'DM 테스트용 패널 열기' })
    )

    const incomingDmInput = screen.getByLabelText('수신 DM')

    expect(incomingDmInput).toHaveValue('')
    await user.type(incomingDmInput, '엔터 수신 DM{enter}')

    await waitFor(() => {
      expect(emitDirectMessageReceiveMockForDevMock).toHaveBeenCalledWith(
        expect.objectContaining({
          sender_id: 'user-2',
          sender_nickname: '상대방',
          message: '엔터 수신 DM',
        })
      )
    })

    expect(incomingDmInput).toHaveValue('')
  })

  it('상태 변경 버튼 없이 DM 입력 폼만 노출한다', async () => {
    const user = userEvent.setup()

    render(
      <DevPresenceControlPanel
        users={[
          createOnlineUserFixture({
            id: 'user-1',
            nickname: '테스터',
            status: 'lobby',
          }),
          createOnlineUserFixture({
            id: 'user-2',
            nickname: '상대방',
            status: 'lobby',
          }),
        ]}
        currentUserId="user-1"
      />
    )

    await user.click(
      screen.getByRole('button', { name: 'DM 테스트용 패널 열기' })
    )

    expect(screen.getByText('DM 테스트용 패널')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: '로비' })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: '대기방' })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: '게임중' })
    ).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '전송' })).toBeDisabled()
  })
})
