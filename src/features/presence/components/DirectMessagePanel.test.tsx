import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { CHAT_MESSAGE_MAX_LENGTH } from '../../../constants/chat'
import { createOnlineUserFixture } from '../../../test/fixtures'
import { DirectMessagePanel } from './DirectMessagePanel'
import type { DirectMessage } from '../types'

function createDirectMessage(
  overrides: Partial<DirectMessage> = {}
): DirectMessage {
  return {
    id: 'dm-1',
    senderId: 'user-2',
    senderNickname: '상대',
    content: '기본 메시지',
    sentAt: '2026-03-05T10:00:00.000Z',
    ...overrides,
  }
}

describe('DirectMessagePanel', () => {
  it('sorts messages by sentAt ascending before render', () => {
    const older = createDirectMessage({
      id: 'dm-older',
      content: 'older message',
      sentAt: '2026-03-05T10:00:00.000Z',
    })
    const newer = createDirectMessage({
      id: 'dm-newer',
      content: 'newer message',
      sentAt: '2026-03-05T10:10:00.000Z',
    })

    const { container } = render(
      <DirectMessagePanel
        user={createOnlineUserFixture({ id: 'user-2', nickname: '상대' })}
        currentUserId="user-1"
        messages={[newer, older]}
        onClose={vi.fn()}
        onSendMessage={vi.fn()}
      />
    )

    const panelText = container.textContent ?? ''
    expect(panelText.indexOf('older message')).toBeLessThan(
      panelText.indexOf('newer message')
    )
  })

  it('does not send empty input and sends trimmed message', async () => {
    const user = userEvent.setup()
    const onSendMessage = vi.fn()

    render(
      <DirectMessagePanel
        user={createOnlineUserFixture({ id: 'user-2', nickname: '상대' })}
        currentUserId="user-1"
        messages={[]}
        onClose={vi.fn()}
        onSendMessage={onSendMessage}
      />
    )

    const input = screen.getByRole('textbox') as HTMLInputElement
    const buttons = screen.getAllByRole('button')
    const sendButton = buttons[1]

    await user.type(input, '   ')
    expect(sendButton).toBeDisabled()

    await user.clear(input)
    await user.type(input, ' 안녕하세요 ')
    await user.click(sendButton)

    expect(onSendMessage).toHaveBeenCalledWith('안녕하세요')
    expect(input.value).toBe('')
  })

  it('keeps max length at 300 and sends capped value', async () => {
    const user = userEvent.setup()
    const onSendMessage = vi.fn()
    const overlongMessage = 'a'.repeat(CHAT_MESSAGE_MAX_LENGTH + 20)
    const expectedMessage = overlongMessage.slice(0, CHAT_MESSAGE_MAX_LENGTH)

    render(
      <DirectMessagePanel
        user={createOnlineUserFixture({ id: 'user-2', nickname: '상대' })}
        currentUserId="user-1"
        messages={[]}
        onClose={vi.fn()}
        onSendMessage={onSendMessage}
      />
    )

    const input = screen.getByRole('textbox') as HTMLInputElement
    const buttons = screen.getAllByRole('button')
    const sendButton = buttons[1]

    await user.type(input, overlongMessage)

    expect(input).toHaveAttribute('maxLength', String(CHAT_MESSAGE_MAX_LENGTH))
    expect(input.value).toHaveLength(CHAT_MESSAGE_MAX_LENGTH)

    await user.click(sendButton)
    expect(onSendMessage).toHaveBeenCalledWith(expectedMessage)
  }, 15000)

  it('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()

    render(
      <DirectMessagePanel
        user={createOnlineUserFixture({ id: 'user-2', nickname: '상대' })}
        currentUserId="user-1"
        messages={[]}
        onClose={onClose}
        onSendMessage={vi.fn()}
      />
    )

    const buttons = screen.getAllByRole('button')
    const closeButton = buttons[0]

    await user.click(closeButton)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('renders long words with wrap-safe classes', () => {
    const longMessage =
      'https://example.com/' + 'superlongdmsegment'.repeat(14) + '/message'

    render(
      <DirectMessagePanel
        user={createOnlineUserFixture({ id: 'user-2', nickname: '상대' })}
        currentUserId="user-1"
        messages={[
          createDirectMessage({
            id: 'dm-long',
            content: longMessage,
          }),
        ]}
        onClose={vi.fn()}
        onSendMessage={vi.fn()}
      />
    )

    const messageBubble = screen.getByText(longMessage)
    expect(messageBubble.className).toContain('whitespace-pre-wrap')
    expect(messageBubble.className).toContain('break-words')
    expect(messageBubble.className).toContain('[overflow-wrap:anywhere]')
  })
})
