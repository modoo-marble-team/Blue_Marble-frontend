import { useEffect, useRef } from 'react'
import type { Dispatch, MutableRefObject, SetStateAction } from 'react'
import type { ServerEvent } from '../../types/domain'
import { useGameStore } from '../../stores/game.store'
import type { PlayerState } from './board.constants'
import { TILES } from './board.constants'
import {
  createBoardStatusFromEvent,
  extractEventDice,
  getBoardEventConsumeDelayMs,
  resolveBoardEventAnimationKind,
  type BoardEventAnimationKind,
} from './gameBoardEventQueueUtils'

interface UseBoardEventQueueParams {
  enabled: boolean
  paused?: boolean
  playersRef: MutableRefObject<PlayerState[]>
  setStatus: Dispatch<SetStateAction<string>>
  setDice1: Dispatch<SetStateAction<number>>
  setDice2: Dispatch<SetStateAction<number>>
  onEventAnimation?: (kind: BoardEventAnimationKind) => void
  onEventConsumed?: (event: ServerEvent) => void
}

export function useBoardEventQueue({
  enabled,
  paused = false,
  playersRef,
  setStatus,
  setDice1,
  setDice2,
  onEventAnimation,
  onEventConsumed,
}: UseBoardEventQueueParams) {
  const consumingRef = useRef(false)
  const consumeTimerRef = useRef<number | null>(null)

  useEffect(() => {
    if (!enabled) {
      return
    }

    let disposed = false
    const clearConsumeTimer = () => {
      if (consumeTimerRef.current !== null) {
        window.clearTimeout(consumeTimerRef.current)
        consumeTimerRef.current = null
      }
    }
    const releaseLock = () => {
      clearConsumeTimer()
      consumingRef.current = false
    }

    const consumeIfPossible = () => {
      if (disposed || consumingRef.current || paused) {
        return
      }

      const storeState = useGameStore.getState()
      if (storeState.eventQueue.length <= 0) {
        return
      }

      consumingRef.current = true
      const nextEvent = storeState.consumeNextEvent()

      if (!nextEvent) {
        releaseLock()
        return
      }

      onEventConsumed?.(nextEvent)

      if (import.meta.env.DEV) {
        console.debug('[eventQueue] consumed', nextEvent.type, nextEvent)
      }

      const dice = extractEventDice(nextEvent)
      if (dice) {
        setDice1(dice[0])
        setDice2(dice[1])
      }

      const statusText = createBoardStatusFromEvent(
        nextEvent,
        playersRef.current,
        TILES
      )
      if (statusText) {
        setStatus(statusText)
      }

      onEventAnimation?.(resolveBoardEventAnimationKind(nextEvent))

      const delayMs = getBoardEventConsumeDelayMs(nextEvent)
      consumeTimerRef.current = window.setTimeout(() => {
        consumeTimerRef.current = null
        consumingRef.current = false
        consumeIfPossible()
      }, delayMs)
    }

    const unsubscribe = useGameStore.subscribe((state, prevState) => {
      const hasQueueItems = state.eventQueue.length > 0
      if (!hasQueueItems) {
        return
      }

      const queueLengthChanged =
        state.eventQueue.length !== prevState.eventQueue.length
      const queueHeadChanged = state.eventQueue[0] !== prevState.eventQueue[0]
      const queueReferenceChanged = state.eventQueue !== prevState.eventQueue

      if (!queueLengthChanged && !queueHeadChanged && !queueReferenceChanged) {
        return
      }

      consumeIfPossible()
    })

    consumeIfPossible()

    return () => {
      disposed = true
      releaseLock()
      unsubscribe()
    }
  }, [
    enabled,
    paused,
    playersRef,
    setStatus,
    setDice1,
    setDice2,
    onEventAnimation,
    onEventConsumed,
  ])
}
