import { useEffect, useRef } from 'react'
import { connectSocketWithAuthIfNeeded, socket } from '../../lib/socket'
import { gameApi } from '../../services/game/game.api'
import { setupGameHandlers } from '../../services/socket/game.handler'
import { useGameStore } from '../../stores/game.store'

const USE_GAME_SOCKET_MOCK =
  import.meta.env.DEV && import.meta.env.VITE_USE_SOCKET_MOCK !== 'false'

export const useGameState = (roomId: string | null) => {
  const { setGameState, players } = useGameStore()
  const syncedRoomIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (!roomId) {
      return
    }

    const teardownHandlers = setupGameHandlers()

    // Mock 환경에서는 공유 소켓이 없어 불필요한 재연결 루프를 막는다.
    if (USE_GAME_SOCKET_MOCK) {
      socket.disconnect()
    } else if (!socket.connected) {
      connectSocketWithAuthIfNeeded()
    }

    const fetchGameState = async () => {
      const roomChanged = syncedRoomIdRef.current !== roomId

      // 같은 방에서 이미 상태가 있으면 초기 조회를 다시 하지 않는다.
      if (!roomChanged && players.length > 0) return

      const result = await gameApi.getState(roomId, {
        reset: USE_GAME_SOCKET_MOCK && roomChanged,
      })
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
      syncedRoomIdRef.current = roomId
    }

    void fetchGameState()

    return () => {
      teardownHandlers()
    }
  }, [roomId, setGameState, players.length])

  return {}
}
