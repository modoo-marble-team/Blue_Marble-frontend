import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../test/renderWithProviders'
import RoomChat from './RoomChat'

describe('RoomChat', () => {
  it('제목/공지/메시지를 렌더링한다', () => {
    renderWithProviders(
      <RoomChat
        title="실시간 채팅"
        notice="공지 메시지"
        currentUserId="me"
        inputPlaceholder="메시지 입력..."
        onSendMessage={vi.fn()}
        messages={[
          {
            id: 'm1',
            sender_id: 'me',
            sender_nickname: '나',
            content: '안녕하세요',
            timestamp: '2026-03-03T10:00:00.000Z',
            type: 'talk',
          },
          {
            id: 'm2',
            sender_id: 'user-2',
            sender_nickname: '상대',
            content: '반가워요',
            timestamp: '2026-03-03T10:01:00.000Z',
            type: 'talk',
          },
        ]}
      />
    )

    expect(screen.getByText('실시간 채팅')).toBeInTheDocument()
    expect(screen.getByText('공지 메시지')).toBeInTheDocument()
    expect(screen.getByText('안녕하세요')).toBeInTheDocument()
    expect(screen.getByText('반가워요')).toBeInTheDocument()
  })

  it('메시지 전송 시 trim 처리 후 콜백 호출하고 입력을 비운다', async () => {
    const user = userEvent.setup()
    const onSendMessage = vi.fn()

    renderWithProviders(
      <RoomChat
        currentUserId="me"
        onSendMessage={onSendMessage}
        messages={[]}
      />
    )

    const input = screen.getByPlaceholderText('메시지...') as HTMLInputElement
    await user.type(input, '   테스트 전송   ')
    await user.click(screen.getByRole('button', { name: '➤' }))

    expect(onSendMessage).toHaveBeenCalledWith('테스트 전송')
    expect(input.value).toBe('')
  })

  it('공백 입력은 전송하지 않는다', async () => {
    const user = userEvent.setup()
    const onSendMessage = vi.fn()

    renderWithProviders(
      <RoomChat
        currentUserId="me"
        onSendMessage={onSendMessage}
        messages={[]}
      />
    )

    await user.type(screen.getByPlaceholderText('메시지...'), '   ')
    await user.click(screen.getByRole('button', { name: '➤' }))

    expect(onSendMessage).not.toHaveBeenCalled()
  })

  it('커스텀 placeholder를 표시한다', () => {
    renderWithProviders(
      <RoomChat
        currentUserId="me"
        onSendMessage={vi.fn()}
        inputPlaceholder="메시지를 입력하세요..."
        messages={[]}
      />
    )

    expect(
      screen.getByPlaceholderText('메시지를 입력하세요...')
    ).toBeInTheDocument()
  })
})
