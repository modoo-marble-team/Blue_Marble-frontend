import { useEffect, useRef } from 'react'
import { IS_SOCKET_MOCK_ENABLED } from '../../config/env'
import { connectSocketWithAuthIfNeeded, socket } from '../../lib/socket'
import { gameApi } from '../../services/game/game.api'
import {
  emitGameSync,
  setupGameHandlers,
} from '../../services/socket/game.handler'
import { useGameStore } from '../../stores/game.store'

const USE_GAME_SOCKET_MOCK = IS_SOCKET_MOCK_ENABLED

export const useGameState = (roomId: string | null) => {
  const { setGameState, players } = useGameStore()
  const syncedRoomIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (!roomId) {
      return
    }

    const teardownHandlers = setupGameHandlers({ roomId })

    // mock 환경에서는 공유 소켓이 불필요하게 재연결되지 않도록 차단한다.
    if (USE_GAME_SOCKET_MOCK) {
      socket.disconnect()
    } else if (!socket.connected) {
      connectSocketWithAuthIfNeeded()
    }

    const syncGameState = async () => {
      const roomChanged = syncedRoomIdRef.current !== roomId

      // 같은 방에서 이미 상태를 들고 있으면 초기 동기화를 반복하지 않는다.
      if (!roomChanged && players.length > 0) return

      emitGameSync({
        roomId,
        reset: USE_GAME_SOCKET_MOCK && roomChanged,
      })

      // mock/socket rollout 전까지는 REST snapshot을 bootstrap fallback으로 유지한다.
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

    void syncGameState()

    return () => {
      teardownHandlers()
    }
  }, [roomId, setGameState, players.length])

  return {}
}
