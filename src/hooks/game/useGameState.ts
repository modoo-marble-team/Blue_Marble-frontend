import { useEffect } from 'react'
import { connectSocketWithAuthIfNeeded, socket } from '../../lib/socket'
import { gameApi } from '../../services/game/game.api'
import { setupGameHandlers } from '../../services/socket/game.handler'
import { useGameStore } from '../../stores/game.store'

const USE_GAME_SOCKET_MOCK =
  import.meta.env.DEV && import.meta.env.VITE_USE_SOCKET_MOCK !== 'false'

export const useGameState = () => {
  const { setGameState, players } = useGameStore()

  useEffect(() => {
    const teardownHandlers = setupGameHandlers()

    if (!USE_GAME_SOCKET_MOCK && !socket.connected) {
      connectSocketWithAuthIfNeeded()
    }

    const fetchGameState = async () => {
      // 스토어가 비어 있을 때만 초기 상태를 1회 동기화
      if (players.length > 0) return

      const result = await gameApi.getState({ reset: USE_GAME_SOCKET_MOCK })
      if (result.ok) {
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
    }

    fetchGameState()

    return () => {
      teardownHandlers()
    }
  }, [setGameState, players.length])

  return {}
}
