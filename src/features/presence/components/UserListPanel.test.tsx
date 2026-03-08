import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { createOnlineUserFixture } from '../../../test/fixtures'
import { UserListPanel } from './UserListPanel'

describe('UserListPanel', () => {
  it('접속자 목록은 나 우선 -> 상태 우선 -> 같은 상태 닉네임순으로 정렬된다', () => {
    render(
      <UserListPanel
        users={[
          createOnlineUserFixture({
            id: 'u-playing',
            nickname: '마블러',
            status: 'playing',
          }),
          createOnlineUserFixture({
            id: 'u-in-room-b',
            nickname: '도라',
            status: 'in_room',
          }),
          createOnlineUserFixture({
            id: 'u-lobby-b',
            nickname: '나래',
            status: 'lobby',
          }),
          createOnlineUserFixture({
            id: 'u-lobby-a',
            nickname: '가람',
            status: 'lobby',
          }),
          createOnlineUserFixture({
            id: 'u-me',
            nickname: '내닉네임',
            status: 'playing',
          }),
          createOnlineUserFixture({
            id: 'u-in-room-a',
            nickname: '다온',
            status: 'in_room',
          }),
        ]}
        isLoading={false}
        isError={false}
        isOpen
        currentUserId="u-me"
        onToggle={vi.fn()}
        onOpenDirectMessage={vi.fn()}
      />
    )

    const chatButtons = screen.getAllByRole('button', { name: / 채팅$/ })
    const sortedButtonNames = chatButtons.map((button) => {
      return button.getAttribute('aria-label')
    })

    expect(sortedButtonNames).toEqual([
      '내닉네임 채팅',
      '가람 채팅',
      '나래 채팅',
      '다온 채팅',
      '도라 채팅',
      '마블러 채팅',
    ])
  })
})
