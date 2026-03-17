import { useCallback } from 'react'
import { IS_SOCKET_MOCK_ENABLED } from '../../config/env'
import { socket } from '../../lib/socket'
import { emitGameAction } from '../../services/socket/game.handler'
import { useGameStore } from '../../stores/game.store'

const USE_GAME_SOCKET_MOCK = IS_SOCKET_MOCK_ENABLED

export const useDiceRoll = () => {
  const currentTurn = useGameStore((state) => state.currentTurn)

  return useCallback(
    (gameId: string | null) => {
      if (!gameId) {
        return
      }

      if (!USE_GAME_SOCKET_MOCK) {
        // Real server mode must stay authoritative; never fallback to local roll.
        if (!socket.connected || currentTurn === null) {
          return
        }

        emitGameAction({
          type: 'ROLL_DICE',
          gameId,
        })
        return
      }

      // Mock mode also goes through game:action to keep one contract path.
      emitGameAction({
        type: 'ROLL_DICE',
        gameId,
      })
    },
    [currentTurn]
  )
}
