import { useEffect } from 'react'
import { socket } from '../../lib/socket'
import { gameApi } from '../../services/game/game.api'
import { setupGameHandlers } from '../../services/socket/game.handler'
import { useGameStore } from '../../stores/game.store'

export const useGameState = (roomId: string | null) => {
  const { setGameState, players } = useGameStore()

  useEffect(() => {
    if (!roomId) {
      return
    }

    const teardownHandlers = setupGameHandlers()

    if (!socket.connected) {
      socket.connect()
    }

    const fetchGameState = async () => {
      if (players.length > 0) return

      const result = await gameApi.getState(roomId)
      if (!result.ok) return

      const payload = result.data as {
        players?: unknown[]
        tiles?: unknown[]
        messages?: unknown[]
        current_turn?: string | null
        currentTurn?: string | null
        round?: number
        timeout_sec?: number
        timeoutSec?: number
      }

      setGameState({
        players: (payload.players as never[]) ?? [],
        tiles: (payload.tiles as never[]) ?? [],
        messages: (payload.messages as never[]) ?? [],
        currentTurn: payload.current_turn ?? payload.currentTurn ?? null,
        round: payload.round ?? 1,
        turnTimeoutSec: payload.timeout_sec ?? payload.timeoutSec ?? 30,
      })
    }

    void fetchGameState()

    return () => {
      teardownHandlers()
    }
  }, [roomId, setGameState, players.length])

  return {}
}
