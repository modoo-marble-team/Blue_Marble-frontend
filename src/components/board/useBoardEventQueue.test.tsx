import { renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useGameStore } from '../../stores/game.store'
import type { PlayerState } from './board.constants'
import { useBoardEventQueue } from './useBoardEventQueue'

const playersRef: { current: PlayerState[] } = {
  current: [
    {
      id: 1,
      name: '플레이어1',
      color: '#f00',
      pos: 0,
      money: 1000,
      skipTurns: 0,
    },
    {
      id: 2,
      name: '플레이어2',
      color: '#0f0',
      pos: 0,
      money: 1000,
      skipTurns: 0,
    },
  ],
}

const setupHook = ({
  enabled = true,
  paused = false,
}: {
  enabled?: boolean
  paused?: boolean
} = {}) => {
  const setStatus = vi.fn()
  const setDice1 = vi.fn()
  const setDice2 = vi.fn()
  const onEventAnimation = vi.fn()

  const { rerender } = renderHook(
    ({ isEnabled, isPaused }) =>
      useBoardEventQueue({
        enabled: isEnabled,
        paused: isPaused,
        playersRef,
        setStatus,
        setDice1,
        setDice2,
        onEventAnimation,
      }),
    {
      initialProps: {
        isEnabled: enabled,
        isPaused: paused,
      },
    }
  )

  return {
    setStatus,
    setDice1,
    setDice2,
    onEventAnimation,
    rerender: ({
      enabled: nextEnabled = enabled,
      paused: nextPaused = paused,
    }: {
      enabled?: boolean
      paused?: boolean
    } = {}) =>
      rerender({
        isEnabled: nextEnabled,
        isPaused: nextPaused,
      }),
  }
}

describe('useBoardEventQueue', () => {
  beforeEach(() => {
    useGameStore.getState().resetGame()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
    useGameStore.getState().resetGame()
  })

  it('consumes queued events in order and applies dice/status/animation updates', () => {
    useGameStore.getState().enqueueEvents([
      {
        type: 'DICE_ROLLED',
        playerId: 1,
        payload: { dice: [2, 5], total: 7 },
      },
      {
        type: 'TURN_ENDED',
        playerId: 1,
      },
    ])

    const { setStatus, setDice1, setDice2, onEventAnimation } = setupHook()

    expect(setDice1).toHaveBeenCalledWith(2)
    expect(setDice2).toHaveBeenCalledWith(5)
    expect(setStatus).toHaveBeenCalledWith(
      expect.stringContaining('플레이어1님이 주사위를 굴렸습니다')
    )
    expect(onEventAnimation).toHaveBeenCalledWith('dice')
    expect(useGameStore.getState().eventQueue).toHaveLength(1)

    vi.advanceTimersByTime(420)

    expect(setStatus).toHaveBeenCalledWith('플레이어1님 턴이 종료되었습니다.')
    expect(onEventAnimation).toHaveBeenLastCalledWith('turn_end')
    expect(useGameStore.getState().eventQueue).toHaveLength(0)
  })

  it('drains newly enqueued events after current consume delay finishes', () => {
    useGameStore.getState().enqueueEvents([
      {
        type: 'PLAYER_MOVED',
        playerId: 1,
        tileIndex: 1,
      },
    ])

    const { setStatus, onEventAnimation } = setupHook()
    expect(setStatus).toHaveBeenCalledTimes(1)
    expect(onEventAnimation).toHaveBeenCalledWith('move')

    useGameStore.getState().enqueueEvents([
      {
        type: 'LANDED',
        playerId: 1,
        tileIndex: 1,
      },
    ])
    expect(useGameStore.getState().eventQueue).toHaveLength(1)

    vi.advanceTimersByTime(520)

    expect(setStatus).toHaveBeenCalledTimes(2)
    expect(setStatus).toHaveBeenLastCalledWith(
      expect.stringContaining('플레이어1님이')
    )
    expect(setStatus).toHaveBeenLastCalledWith(
      expect.stringContaining('칸에 도착했습니다.')
    )
    expect(onEventAnimation).toHaveBeenLastCalledWith('land')
    expect(useGameStore.getState().eventQueue).toHaveLength(0)
  })

  it('does not consume events when disabled', () => {
    useGameStore.getState().enqueueEvents([
      {
        type: 'DICE_ROLLED',
        playerId: 1,
        payload: { dice: [1, 1], total: 2 },
      },
    ])

    const { setStatus, setDice1, setDice2, onEventAnimation } = setupHook({
      enabled: false,
    })

    expect(setStatus).not.toHaveBeenCalled()
    expect(setDice1).not.toHaveBeenCalled()
    expect(setDice2).not.toHaveBeenCalled()
    expect(onEventAnimation).not.toHaveBeenCalled()
    expect(useGameStore.getState().eventQueue).toHaveLength(1)
  })

  it('pauses consumption until paused flag is lifted', () => {
    useGameStore.getState().enqueueEvents([
      {
        type: 'PLAYER_MOVED',
        playerId: 1,
        tileIndex: 1,
      },
    ])

    const { setStatus, onEventAnimation, rerender } = setupHook({
      paused: true,
    })

    expect(setStatus).not.toHaveBeenCalled()
    expect(onEventAnimation).not.toHaveBeenCalled()
    expect(useGameStore.getState().eventQueue).toHaveLength(1)

    rerender({ paused: false })

    expect(setStatus).toHaveBeenCalledTimes(1)
    expect(onEventAnimation).toHaveBeenCalledWith('move')
    expect(useGameStore.getState().eventQueue).toHaveLength(0)
  })
})
