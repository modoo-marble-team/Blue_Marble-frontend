import { useEffect, useRef } from 'react'
import { IS_SOCKET_MOCK_ENABLED } from '../../config/env'
import { connectSocketWithAuthIfNeeded, socket } from '../../lib/socket'
import {
  emitGameSync,
  setupGameHandlers,
} from '../../services/socket/game.handler'
import { useGameStore } from '../../stores/game.store'

const USE_GAME_SOCKET_MOCK = IS_SOCKET_MOCK_ENABLED

export const useGameState = (roomId: string | null) => {
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

    const syncGameState = () => {
      const roomChanged = syncedRoomIdRef.current !== roomId
      const { players, revision } = useGameStore.getState()

      // 같은 방에서 이미 상태를 들고 있으면 초기 동기화를 반복하지 않는다.
      if (!roomChanged && players.length > 0) return

      emitGameSync({
        roomId,
        knownRevision: roomChanged ? 0 : revision,
      })
      syncedRoomIdRef.current = roomId
    }

    syncGameState()

    return () => {
      teardownHandlers()
    }
  }, [roomId])

  return {}
}
