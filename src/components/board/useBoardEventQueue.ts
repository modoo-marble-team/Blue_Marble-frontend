import { useEffect, useRef } from 'react'
import type { Dispatch, MutableRefObject, SetStateAction } from 'react'
import { useGameStore } from '../../stores/game.store'
import type { PlayerState } from './board.constants'
import { TILES } from './board.constants'
import {
  createBoardStatusFromEvent,
  extractEventDice,
} from './gameBoardEventQueueUtils'

const EVENT_QUEUE_CONSUME_DELAY_MS = 120

interface UseBoardEventQueueParams {
  enabled: boolean
  playersRef: MutableRefObject<PlayerState[]>
  setStatus: Dispatch<SetStateAction<string>>
  setDice1: Dispatch<SetStateAction<number>>
  setDice2: Dispatch<SetStateAction<number>>
}

export function useBoardEventQueue({
  enabled,
  playersRef,
  setStatus,
  setDice1,
  setDice2,
}: UseBoardEventQueueParams) {
  const eventQueueLength = useGameStore((state) => state.eventQueue.length)
  const consumeNextEvent = useGameStore((state) => state.consumeNextEvent)
  const consumingRef = useRef(false)

  useEffect(() => {
    if (!enabled || eventQueueLength <= 0 || consumingRef.current) {
      return
    }

    consumingRef.current = true

    const timer = window.setTimeout(() => {
      const nextEvent = consumeNextEvent()
      if (nextEvent) {
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
      }

      consumingRef.current = false
    }, EVENT_QUEUE_CONSUME_DELAY_MS)

    return () => {
      window.clearTimeout(timer)
      consumingRef.current = false
    }
  }, [
    enabled,
    eventQueueLength,
    consumeNextEvent,
    playersRef,
    setStatus,
    setDice1,
    setDice2,
  ])
}
