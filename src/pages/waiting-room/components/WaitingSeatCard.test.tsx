import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { WaitingSeatCard } from './WaitingSeatCard'

describe('WaitingSeatCard', () => {
  it('긴 닉네임은 ellipsis 가능한 구조로 렌더링하고 전체 이름은 title로 유지한다', () => {
    const longNickname = '아주아주아주긴닉네임테스트플레이어'

    render(
      <WaitingSeatCard
        seat={{
          id: 'user-1',
          nickname: longNickname,
          isReady: false,
          isHost: false,
          isMe: true,
          avatarColor: '#ef4444',
        }}
      />
    )

    const nicknameLabel = screen.getByText(longNickname)

    expect(nicknameLabel).toHaveAttribute('title', longNickname)
    expect(nicknameLabel).toHaveClass('truncate')
    expect(nicknameLabel).toHaveClass('min-w-0')
    expect(screen.getByText('나')).toHaveClass('shrink-0')
  })
})
