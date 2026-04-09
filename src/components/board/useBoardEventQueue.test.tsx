import { renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useGameStore } from '../../stores/game.store'
import type { PlayerState, TileData } from './board.constants'
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

const tiles: TileData[] = [
  { id: 0, name: '출발', type: 'START', emoji: '🚩' },
  { id: 1, name: '수원', type: 'PROPERTY', price: 100000000, color: '#EF5350' },
]

const setupHook = ({
  enabled = true,
  paused = false,
  onEventConsumed,
}: {
  enabled?: boolean
  paused?: boolean
  onEventConsumed?: (event: { type: string }) => boolean | void
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
        tiles,
        setStatus,
        setDice1,
        setDice2,
        onEventAnimation,
        onEventConsumed,
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

const setupHookWithDynamicCallback = ({
  enabled = true,
  paused = false,
  onEventConsumed,
}: {
  enabled?: boolean
  paused?: boolean
  onEventConsumed?: (event: { type: string }) => boolean | void
}) => {
  const setStatus = vi.fn()
  const setDice1 = vi.fn()
  const setDice2 = vi.fn()
  const onEventAnimation = vi.fn()

  const { rerender } = renderHook(
    ({
      isEnabled,
      isPaused,
      callback,
    }: {
      isEnabled: boolean
      isPaused: boolean
      callback?: (event: { type: string }) => boolean | void
    }) =>
      useBoardEventQueue({
        enabled: isEnabled,
        paused: isPaused,
        playersRef,
        tiles,
        setStatus,
        setDice1,
        setDice2,
        onEventAnimation,
        onEventConsumed: callback,
      }),
    {
      initialProps: {
        isEnabled: enabled,
        isPaused: paused,
        callback: onEventConsumed,
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
      onEventConsumed: nextOnEventConsumed = onEventConsumed,
    }: {
      enabled?: boolean
      paused?: boolean
      onEventConsumed?: (event: { type: string }) => boolean | void
    } = {}) =>
      rerender({
        isEnabled: nextEnabled,
        isPaused: nextPaused,
        callback: nextOnEventConsumed,
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

  it('keeps queue head available while onEventConsumed callback runs', () => {
    useGameStore.getState().enqueueEvents([
      {
        type: 'PLAYER_MOVED',
        playerId: 1,
        tileIndex: 1,
        payload: {
          fromIndex: 0,
          toIndex: 1,
        },
      },
    ])

    const onEventConsumed = vi.fn(() => {
      expect(useGameStore.getState().eventQueue).toHaveLength(1)
      expect(useGameStore.getState().eventQueue[0]?.type).toBe('PLAYER_MOVED')
    })

    setupHook({ onEventConsumed })

    expect(onEventConsumed).toHaveBeenCalledTimes(1)
    expect(useGameStore.getState().eventQueue).toHaveLength(0)
  })

  it('does not auto-consume next event when onEventConsumed requests immediate pause', () => {
    useGameStore.getState().enqueueEvents([
      {
        type: 'DICE_ROLLED',
        playerId: 1,
        payload: { dice: [4, 4], total: 8 },
      },
      {
        type: 'PLAYER_MOVED',
        playerId: 1,
        tileIndex: 1,
      },
    ])

    const onEventConsumed = vi.fn((event: { type: string }) => {
      if (event.type === 'DICE_ROLLED') {
        return true
      }
      return undefined
    })

    const { rerender } = setupHook({ onEventConsumed })

    expect(useGameStore.getState().eventQueue).toHaveLength(1)

    vi.advanceTimersByTime(2000)
    expect(useGameStore.getState().eventQueue).toHaveLength(1)

    rerender({ paused: true })
    expect(useGameStore.getState().eventQueue).toHaveLength(1)

    rerender({ paused: false })
    expect(useGameStore.getState().eventQueue).toHaveLength(0)
    expect(onEventConsumed).toHaveBeenCalledTimes(2)
  })

  it('keeps queue paused even when new events are enqueued before paused prop updates', () => {
    useGameStore.getState().enqueueEvents([
      {
        type: 'DICE_ROLLED',
        playerId: 1,
        payload: { dice: [6, 6], total: 12 },
      },
    ])

    const onEventConsumed = vi.fn((event: { type: string }) => {
      if (event.type === 'DICE_ROLLED') {
        return true
      }
      return undefined
    })

    const { rerender } = setupHook({ onEventConsumed })

    useGameStore.getState().enqueueEvents([
      {
        type: 'PLAYER_MOVED',
        playerId: 1,
        tileIndex: 1,
      },
    ])

    vi.advanceTimersByTime(2000)
    expect(useGameStore.getState().eventQueue).toHaveLength(1)

    rerender({ paused: true })
    rerender({ paused: false })
    expect(useGameStore.getState().eventQueue).toHaveLength(0)
    expect(onEventConsumed).toHaveBeenCalledTimes(2)
  })

  it('keeps immediate pause even if onEventConsumed callback identity changes', () => {
    useGameStore.getState().enqueueEvents([
      {
        type: 'DICE_ROLLED',
        playerId: 1,
        payload: { dice: [2, 2], total: 4 },
      },
      {
        type: 'PLAYER_MOVED',
        playerId: 1,
        tileIndex: 1,
        payload: { fromIndex: 0, toIndex: 1 },
      },
    ])

    const callbackV1 = vi.fn((event: { type: string }) =>
      event.type === 'DICE_ROLLED' ? true : undefined
    )
    const callbackV2 = vi.fn((event: { type: string }) =>
      event.type === 'DICE_ROLLED' ? true : undefined
    )

    const { rerender } = setupHookWithDynamicCallback({
      onEventConsumed: callbackV1,
    })

    expect(useGameStore.getState().eventQueue).toHaveLength(1)

    rerender({ onEventConsumed: callbackV2 })
    vi.advanceTimersByTime(2000)
    expect(useGameStore.getState().eventQueue).toHaveLength(1)

    rerender({ paused: true, onEventConsumed: callbackV2 })
    rerender({ paused: false, onEventConsumed: callbackV2 })
    expect(useGameStore.getState().eventQueue).toHaveLength(0)
    expect(callbackV1).toHaveBeenCalledTimes(1)
    expect(callbackV2).toHaveBeenCalledTimes(1)
  })
})
