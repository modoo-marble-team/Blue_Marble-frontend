import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DevRoomChatControlPanel } from './DevRoomChatControlPanel'

const { sendWaitingRoomChatMock } = vi.hoisted(() => ({
  sendWaitingRoomChatMock: vi.fn(),
}))

vi.mock('../../config/env', () => ({
  IS_SOCKET_MOCK_ENABLED: true,
}))

vi.mock('../../pages/waiting-room/socket/socket', () => ({
  sendWaitingRoomChat: sendWaitingRoomChatMock,
}))

describe('DevRoomChatControlPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('게임방 채팅 테스트 패널 문구와 발신자 입력 폼을 렌더링한다', async () => {
    const user = userEvent.setup()

    render(
      <DevRoomChatControlPanel
        roomId="room-1"
        senderOptions={[
          { id: 'user-1', nickname: '나' },
          { id: 'user-2', nickname: '상대방' },
        ]}
        preferredSenderId="user-2"
      />
    )

    await user.click(
      screen.getByRole('button', { name: '게임방 채팅 테스트 패널 열기' })
    )

    expect(screen.getByText('게임방 채팅 테스트 패널')).toBeInTheDocument()
    expect(screen.getByText('room-1')).toBeInTheDocument()
    expect(screen.getByLabelText('발신 유저')).toBeInTheDocument()
    expect(screen.getByLabelText('수신 채팅')).toBeInTheDocument()
  })

  it('선택 유저 기준으로 게임 채팅 수신 이벤트를 전송한다', async () => {
    const user = userEvent.setup()

    render(
      <DevRoomChatControlPanel
        roomId="room-1"
        senderOptions={[
          { id: 'user-1', nickname: '나' },
          { id: 'user-2', nickname: '상대방' },
        ]}
        preferredSenderId="user-2"
      />
    )

    await user.click(
      screen.getByRole('button', { name: '게임방 채팅 테스트 패널 열기' })
    )

    const incomingChatInput = screen.getByLabelText('수신 채팅')

    await user.clear(incomingChatInput)
    await user.type(incomingChatInput, '게임 채팅 테스트')
    await user.click(
      screen.getByRole('button', { name: '선택 유저 채팅 전송' })
    )

    expect(sendWaitingRoomChatMock).toHaveBeenCalledWith({
      roomId: 'room-1',
      senderId: 'user-2',
      senderNickname: '상대방',
      message: '게임 채팅 테스트',
    })
    expect(incomingChatInput).toHaveValue('')
  })
})
