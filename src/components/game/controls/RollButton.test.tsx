import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import RollButton from './RollButton'

const rollButtonRuntime = {
  turnTimeoutSec: 30,
  turnTimerKey: 1,
  timeLeft: 30,
}

vi.mock('../../../stores/game.store', () => ({
  useGameStore: (
    selector: (state: {
      turnTimeoutSec: number
      turnTimerKey: number
    }) => unknown
  ) =>
    selector({
      turnTimeoutSec: rollButtonRuntime.turnTimeoutSec,
      turnTimerKey: rollButtonRuntime.turnTimerKey,
    }),
}))

vi.mock('../../../hooks/game/useGameTimer', () => ({
  useGameTimer: () => [rollButtonRuntime.timeLeft],
}))

describe('RollButton', () => {
  it('0초가 되면 roll 모드에서 onRoll을 자동으로 1회 호출한다', () => {
    rollButtonRuntime.timeLeft = 0
    rollButtonRuntime.turnTimerKey = 1
    const onRoll = vi.fn()

    const { rerender } = render(<RollButton isMyTurn={true} onRoll={onRoll} />)

    expect(onRoll).toHaveBeenCalledTimes(1)

    rerender(<RollButton isMyTurn={true} onRoll={onRoll} />)
    expect(onRoll).toHaveBeenCalledTimes(1)
  })

  it('0초 자동 호출은 turnTimerKey가 바뀌면 같은 모드에서 다시 1회 호출된다', () => {
    rollButtonRuntime.timeLeft = 0
    rollButtonRuntime.turnTimerKey = 3
    const onRoll = vi.fn()

    const { rerender } = render(<RollButton isMyTurn={true} onRoll={onRoll} />)
    expect(onRoll).toHaveBeenCalledTimes(1)

    rollButtonRuntime.turnTimerKey = 4
    rerender(<RollButton isMyTurn={true} onRoll={onRoll} />)

    expect(onRoll).toHaveBeenCalledTimes(2)
  })

  it('0초가 되면 end_turn 모드에서 onEndTurn을 자동으로 1회 호출한다', () => {
    rollButtonRuntime.timeLeft = 0
    rollButtonRuntime.turnTimerKey = 5
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

    expect(onEndTurn).toHaveBeenCalledTimes(1)
    expect(onRoll).not.toHaveBeenCalled()
  })

  it('0초여도 조작 권한이 없으면 자동 호출하지 않는다', () => {
    rollButtonRuntime.timeLeft = 0
    rollButtonRuntime.turnTimerKey = 6
    const onRoll = vi.fn()

    render(<RollButton isMyTurn={false} onRoll={onRoll} />)

    expect(onRoll).not.toHaveBeenCalled()
  })

  it('기본 모드에서 ROLL 버튼은 onRoll을 호출한다', () => {
    rollButtonRuntime.timeLeft = 30
    rollButtonRuntime.turnTimerKey = 7
    const onRoll = vi.fn()

    render(<RollButton isMyTurn={true} onRoll={onRoll} />)

    fireEvent.click(screen.getByRole('button'))
    expect(onRoll).toHaveBeenCalledTimes(1)
    expect(screen.getByText('ROLL')).toBeInTheDocument()
  })

  it('end_turn 모드에서 END 버튼은 onEndTurn을 호출한다', () => {
    rollButtonRuntime.timeLeft = 30
    rollButtonRuntime.turnTimerKey = 8
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

  it('end_turn 모드에서 onEndTurn이 없으면 버튼은 비활성화된다', () => {
    rollButtonRuntime.timeLeft = 30
    rollButtonRuntime.turnTimerKey = 9
    const onRoll = vi.fn()

    render(<RollButton isMyTurn={true} mode="end_turn" onRoll={onRoll} />)

    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
  })
})
