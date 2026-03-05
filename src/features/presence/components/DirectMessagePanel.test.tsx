import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
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
  it('메시지가 없으면 안내 문구를 표시한다', () => {
    render(
      <DirectMessagePanel
        user={createOnlineUserFixture({
          id: 'user-2',
          nickname: '상대',
        })}
        currentUserId="user-1"
        messages={[]}
        onClose={vi.fn()}
        onSendMessage={vi.fn()}
      />
    )

    expect(
      screen.getByText('메시지를 보내 대화를 시작하세요')
    ).toBeInTheDocument()
  })

  it('메시지 목록을 sentAt 오름차순으로 정렬해 렌더링한다', () => {
    const older = createDirectMessage({
      id: 'dm-older',
      content: '먼저 보낸 메시지',
      sentAt: '2026-03-05T10:00:00.000Z',
    })
    const newer = createDirectMessage({
      id: 'dm-newer',
      content: '나중에 보낸 메시지',
      sentAt: '2026-03-05T10:10:00.000Z',
    })

    const { container } = render(
      <DirectMessagePanel
        user={createOnlineUserFixture({
          id: 'user-2',
          nickname: '상대',
        })}
        currentUserId="user-1"
        messages={[newer, older]}
        onClose={vi.fn()}
        onSendMessage={vi.fn()}
      />
    )

    const panelText = container.textContent ?? ''
    expect(panelText.indexOf('먼저 보낸 메시지')).toBeLessThan(
      panelText.indexOf('나중에 보낸 메시지')
    )
  })

  it('공백 입력은 전송하지 않고 유효 입력 전송 후 input을 비운다', async () => {
    const user = userEvent.setup()
    const onSendMessage = vi.fn()

    render(
      <DirectMessagePanel
        user={createOnlineUserFixture({
          id: 'user-2',
          nickname: '상대',
        })}
        currentUserId="user-1"
        messages={[]}
        onClose={vi.fn()}
        onSendMessage={onSendMessage}
      />
    )

    const input = screen.getByPlaceholderText(
      '메시지를 입력하세요...'
    ) as HTMLInputElement
    const sendButton = screen.getByRole('button', { name: 'DM 전송' })

    await user.type(input, '   ')
    expect(sendButton).toBeDisabled()

    await user.clear(input)
    await user.type(input, ' 안녕하세요 ')
    await user.click(sendButton)

    expect(onSendMessage).toHaveBeenCalledWith('안녕하세요')
    expect(input.value).toBe('')
  })

  it('닫기 버튼 클릭 시 onClose를 호출한다', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()

    render(
      <DirectMessagePanel
        user={createOnlineUserFixture({
          id: 'user-2',
          nickname: '상대',
        })}
        currentUserId="user-1"
        messages={[]}
        onClose={onClose}
        onSendMessage={vi.fn()}
      />
    )

    await user.click(screen.getByRole('button', { name: 'DM 닫기' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
