import { useState } from 'react'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../test/renderWithProviders'
import { PrivateRoomJoinModal } from './PrivateRoomJoinModal'

describe('PrivateRoomJoinModal', () => {
  it('비밀번호 입력은 브라우저 비밀번호 필드가 아닌 숫자 코드 입력으로 렌더링한다', async () => {
    const user = userEvent.setup()

    function TestHarness() {
      const [password, setPassword] = useState('')

      return (
        <PrivateRoomJoinModal
          roomTitle="비밀방"
          password={password}
          isSubmitting={false}
          isPasswordInvalid={false}
          onPasswordChange={setPassword}
          onClose={vi.fn()}
          onSubmit={vi.fn()}
        />
      )
    }

    renderWithProviders(<TestHarness />)

    const passwordInput = screen.getByPlaceholderText(
      '비밀번호 입력'
    ) as HTMLInputElement

    expect(passwordInput).toHaveAttribute('type', 'text')
    expect(passwordInput).toHaveAttribute('autocomplete', 'off')

    await user.type(passwordInput, '12ab34')

    expect(passwordInput.value).toBe('1234')
  })
})
