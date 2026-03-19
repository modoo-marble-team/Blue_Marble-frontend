import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import RollButton from './RollButton'

vi.mock('../../../stores/game.store', () => ({
  useGameStore: (
    selector: (state: {
      turnTimeoutSec: number
      turnTimerKey: number
    }) => unknown
  ) => selector({ turnTimeoutSec: 30, turnTimerKey: 1 }),
}))

vi.mock('../../../hooks/game/useGameTimer', () => ({
  useGameTimer: () => [30],
}))

describe('RollButton', () => {
  it('기본 모드에서 ROLL 버튼이 onRoll을 호출한다', () => {
    const onRoll = vi.fn()

    render(<RollButton isMyTurn={true} onRoll={onRoll} />)

    fireEvent.click(screen.getByRole('button'))
    expect(onRoll).toHaveBeenCalledTimes(1)
    expect(screen.getByText('ROLL')).toBeInTheDocument()
  })

  it('end_turn 모드에서 END 버튼이 onEndTurn을 호출한다', () => {
    const onRoll = vi.fn()
    const onEndTurn = vi.fn()

    render(
      <RollButton
        isMyTurn={true}
        mode="end_turn"
        onRoll={onRoll}
        onEndTurn={onEndTurn}
      />
    )

    fireEvent.click(screen.getByRole('button'))
    expect(onEndTurn).toHaveBeenCalledTimes(1)
    expect(onRoll).not.toHaveBeenCalled()
    expect(screen.getByText('END')).toBeInTheDocument()
  })

  it('end_turn 모드에서 onEndTurn이 없으면 버튼이 비활성화된다', () => {
    const onRoll = vi.fn()

    render(<RollButton isMyTurn={true} mode="end_turn" onRoll={onRoll} />)

    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
  })
})
