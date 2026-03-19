import { fireEvent, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../test/renderWithProviders'
import { CreateRoomModal } from './CreateRoomModal'

describe('CreateRoomModal', () => {
  it('입력 제목이 비어 있으면 기본 제목을 사용해 제출한다', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

    renderWithProviders(
      <CreateRoomModal
        defaultRoomTitle="아주아주긴기본제목12345"
        isSubmitting={false}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />
    )

    await user.click(screen.getByRole('button', { name: '방 만들기 완료' }))

    expect(onSubmit).toHaveBeenCalledWith({
      title: '아주아주긴기본제목12345'.slice(0, 16),
      isPrivate: false,
      password: undefined,
    })
  })

  it('입력 제목은 16자 제한 후 제출한다', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

    renderWithProviders(
      <CreateRoomModal
        defaultRoomTitle="기본 방"
        isSubmitting={false}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />
    )

    await user.type(screen.getByLabelText('방 제목'), '커스텀방제목1234567890')
    await user.click(screen.getByRole('button', { name: '방 만들기 완료' }))

    expect(onSubmit).toHaveBeenCalledWith({
      title: '커스텀방제목1234567890'.slice(0, 16),
      isPrivate: false,
      password: undefined,
    })
  })

  it('비밀방 설정 시 4자리 비밀번호가 아니면 제출이 비활성화된다', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

    renderWithProviders(
      <CreateRoomModal
        defaultRoomTitle="기본 방"
        isSubmitting={false}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />
    )

    await user.click(screen.getByRole('switch'))
    const passwordInput = screen.getByPlaceholderText(
      '비밀번호 (4자리)'
    ) as HTMLInputElement
    expect(passwordInput).toHaveAttribute('type', 'text')
    expect(passwordInput).toHaveAttribute('autocomplete', 'off')

    await user.type(passwordInput, '12')
    expect(
      screen.getByRole('button', { name: '방 만들기 완료' })
    ).toBeDisabled()

    await user.clear(passwordInput)
    await user.type(passwordInput, '1234')
    expect(screen.getByRole('button', { name: '방 만들기 완료' })).toBeEnabled()

    await user.click(screen.getByRole('button', { name: '방 만들기 완료' }))
    expect(onSubmit).toHaveBeenCalledWith({
      title: '기본 방',
      isPrivate: true,
      password: '1234',
    })
  })

  it('비밀방 토글을 끄면 비밀번호 입력값이 초기화된다', async () => {
    const user = userEvent.setup()

    renderWithProviders(
      <CreateRoomModal
        defaultRoomTitle="기본 방"
        isSubmitting={false}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />
    )

    await user.click(screen.getByRole('switch'))
    const passwordInput = screen.getByPlaceholderText(
      '비밀번호 (4자리)'
    ) as HTMLInputElement
    await user.type(passwordInput, '1234')
    expect(passwordInput.value).toBe('1234')

    await user.click(screen.getByRole('switch'))
    await user.click(screen.getByRole('switch'))

    const reopenedInput = screen.getByPlaceholderText(
      '비밀번호 (4자리)'
    ) as HTMLInputElement
    expect(reopenedInput.value).toBe('')
  })

  it('제출 중에는 모달 닫기 동작이 차단된다', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()

    renderWithProviders(
      <CreateRoomModal
        defaultRoomTitle="기본 방"
        isSubmitting
        onClose={onClose}
        onSubmit={vi.fn()}
      />
    )

    await user.click(screen.getByLabelText('모달 닫기'))
    fireEvent.keyDown(window, { key: 'Escape' })

    expect(onClose).not.toHaveBeenCalled()
  })
})
