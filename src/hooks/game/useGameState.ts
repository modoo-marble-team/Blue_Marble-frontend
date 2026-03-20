import { useEffect, useRef } from 'react'
import { IS_SOCKET_MOCK_ENABLED } from '../../config/env'
import { useAuthStore } from '../../features/auth/session/store'
import { connectSocketWithAuthIfNeeded, socket } from '../../lib/socket'
import {
  emitGameSync,
  emitGameSyncTimer,
  setupGameHandlers,
} from '../../services/socket/game.handler'
import { useGameStore } from '../../stores/game.store'

const USE_GAME_SOCKET_MOCK = IS_SOCKET_MOCK_ENABLED

export const useGameState = (gameId: string | null) => {
  const syncedGameIdRef = useRef<string | null>(null)
  const accessToken = useAuthStore(
    (state) => state.session?.accessToken?.trim() ?? null
  )
  const currentTurn = useGameStore((state) => {
    return state.currentPlayerId ?? state.currentTurn
  })

  useEffect(() => {
    if (!gameId) {
      return
    }
    if (!USE_GAME_SOCKET_MOCK && !accessToken) {
      return
    }

    const teardownHandlers = setupGameHandlers({ gameId })

    // mock 환경에서는 공유 소켓이 불필요하게 재연결되지 않도록 차단한다.
    if (USE_GAME_SOCKET_MOCK) {
      socket.disconnect()
    } else if (!socket.connected) {
      connectSocketWithAuthIfNeeded()
    }

    const syncGameState = ({ force = false }: { force?: boolean } = {}) => {
      const gameChanged = syncedGameIdRef.current !== gameId
      const { players, revision } = useGameStore.getState()

      // 초기 진입에서는 같은 게임 상태를 이미 들고 있으면 중복 sync를 생략한다.
      if (!force && !gameChanged && players.length > 0) return

      emitGameSync({
        gameId,
        knownRevision: gameChanged ? 0 : revision,
      })
      syncedGameIdRef.current = gameId
    }

    const syncGameTimer = () => {
      emitGameSyncTimer({ gameId })
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        syncGameTimer()
      }
    }

    const handleWindowFocus = () => {
      syncGameTimer()
    }

    const handleSocketConnect = () => {
      // reconnect에서는 local state 유무와 관계없이 누락 patch 복구를 다시 요청한다.
      syncGameState({ force: true })
      syncGameTimer()
    }

    syncGameState()
    syncGameTimer()
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleWindowFocus)
    socket.on('connect', handleSocketConnect)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleWindowFocus)
      socket.off('connect', handleSocketConnect)
      teardownHandlers()
    }
  }, [accessToken, gameId])

  useEffect(() => {
    if (!gameId || currentTurn == null) {
      return
    }

    // 턴 변경 시 서버 기준 남은 시간을 다시 받아서 0초 고정 상태를 방지한다.
    emitGameSyncTimer({ gameId })
  }, [gameId, currentTurn])

  return {}
}
