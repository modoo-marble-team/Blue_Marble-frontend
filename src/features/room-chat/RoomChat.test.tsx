import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { CHAT_MESSAGE_MAX_LENGTH } from '../../constants/chat'
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

  it('입력창은 300자까지만 유지하고 전송 값도 같은 길이로 맞춘다', async () => {
    const user = userEvent.setup()
    const onSendMessage = vi.fn()
    const overlongMessage = 'a'.repeat(CHAT_MESSAGE_MAX_LENGTH + 12)
    const expectedMessage = overlongMessage.slice(0, CHAT_MESSAGE_MAX_LENGTH)

    renderWithProviders(
      <RoomChat
        currentUserId="me"
        onSendMessage={onSendMessage}
        messages={[]}
      />
    )

    const input = screen.getByPlaceholderText('메시지...') as HTMLInputElement

    await user.click(input)
    await user.paste(overlongMessage)
    expect(input).toHaveAttribute('maxLength', String(CHAT_MESSAGE_MAX_LENGTH))
    expect(input.value).toHaveLength(CHAT_MESSAGE_MAX_LENGTH)

    await user.click(screen.getByRole('button', { name: '➤' }))

    expect(onSendMessage).toHaveBeenCalledWith(expectedMessage)
  }, 10000)

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

  it('상대 닉네임은 기본 텍스트 색으로 렌더링한다', () => {
    renderWithProviders(
      <RoomChat
        currentUserId="me"
        onSendMessage={vi.fn()}
        senderMetaById={{
          'user-2': {
            displayName: '상대',
          },
        }}
        messages={[
          {
            id: 'm-accent',
            sender_id: 'user-2',
            sender_nickname: '상대',
            content: '색상 테스트',
            timestamp: '2026-03-03T10:02:00.000Z',
            type: 'talk',
          },
        ]}
      />
    )

    const senderName = screen.getByText('상대') as HTMLSpanElement

    expect(senderName.className).toContain('text-ui-text-strong')
    expect(senderName.style.color).toBe('')
  })

  it('긴 공백 없는 메시지도 말풍선 줄바꿈 클래스로 렌더링한다', () => {
    const longMessage =
      'https://example.com/' + 'verylongsegment'.repeat(16) + '/chat-overflow'

    renderWithProviders(
      <RoomChat
        currentUserId="me"
        onSendMessage={vi.fn()}
        messages={[
          {
            id: 'm-long',
            sender_id: 'user-2',
            sender_nickname: '상대',
            content: longMessage,
            timestamp: '2026-03-03T10:02:00.000Z',
            type: 'talk',
          },
        ]}
      />
    )

    const messageBubble = screen.getByText(longMessage)
    expect(messageBubble.className).toContain('whitespace-pre-wrap')
    expect(messageBubble.className).toContain('break-words')
    expect(messageBubble.className).toContain('[overflow-wrap:anywhere]')
  })

  it('내가 보낸 긴 메시지는 폭 제약 래퍼 안에서 줄바꿈되도록 렌더링한다', () => {
    const longMessage =
      'https://example.com/' + 'myownsegment'.repeat(20) + '/sent-overflow'

    renderWithProviders(
      <RoomChat
        currentUserId="me"
        onSendMessage={vi.fn()}
        messages={[
          {
            id: 'm-mine-long',
            sender_id: 'me',
            sender_nickname: '나',
            content: longMessage,
            timestamp: '2026-03-03T10:02:00.000Z',
            type: 'talk',
          },
        ]}
      />
    )

    const messageBubble = screen.getByText(longMessage)
    const messageGroupColumn = messageBubble.parentElement
    const contentColumn = messageGroupColumn?.parentElement

    expect(messageBubble.className).toContain('max-w-full')
    expect(messageGroupColumn?.className).toContain('w-full')
    expect(messageGroupColumn?.className).toContain('items-end')
    expect(contentColumn?.className).toContain('w-full')
    expect(contentColumn?.className).toContain('items-end')
  })

  it('같은 sender의 연속 메시지는 하나의 sender header로 그룹화한다', () => {
    renderWithProviders(
      <RoomChat
        currentUserId="me"
        onSendMessage={vi.fn()}
        senderMetaById={{
          'user-2': {
            displayName: '상대',
          },
        }}
        messages={[
          {
            id: 'm1',
            sender_id: 'user-2',
            sender_nickname: '상대',
            content: '첫 번째 메시지',
            timestamp: '2026-03-03T10:00:00.000Z',
            type: 'talk',
          },
          {
            id: 'm2',
            sender_id: 'user-2',
            sender_nickname: '상대',
            content: '두 번째 메시지',
            timestamp: '2026-03-03T10:04:00.000Z',
            type: 'talk',
          },
        ]}
      />
    )

    expect(screen.getAllByText('상대')).toHaveLength(1)
    expect(screen.getByText('첫 번째 메시지')).toBeInTheDocument()
    expect(screen.getByText('두 번째 메시지')).toBeInTheDocument()
  })

  it('같은 sender라도 5분을 넘기면 새 그룹으로 분리한다', () => {
    renderWithProviders(
      <RoomChat
        currentUserId="me"
        onSendMessage={vi.fn()}
        senderMetaById={{
          'user-2': {
            displayName: '상대',
          },
        }}
        messages={[
          {
            id: 'm1',
            sender_id: 'user-2',
            sender_nickname: '상대',
            content: '이전 메시지',
            timestamp: '2026-03-03T10:00:00.000Z',
            type: 'talk',
          },
          {
            id: 'm2',
            sender_id: 'user-2',
            sender_nickname: '상대',
            content: '새 그룹 메시지',
            timestamp: '2026-03-03T10:06:00.000Z',
            type: 'talk',
          },
        ]}
      />
    )

    expect(screen.getAllByText('상대')).toHaveLength(2)
  })
})
