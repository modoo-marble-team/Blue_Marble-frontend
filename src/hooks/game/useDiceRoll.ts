import { RefObject, useCallback } from 'react'
import type { BoardGameHandle } from '../../components/board/GameBoard'
import { IS_SOCKET_MOCK_ENABLED } from '../../config/env'
import { socket } from '../../lib/socket'
import { emitGameAction } from '../../services/socket/game.handler'
import { useGameStore } from '../../stores/game.store'

const USE_GAME_SOCKET_MOCK = IS_SOCKET_MOCK_ENABLED

export const useDiceRoll = (boardRef: RefObject<BoardGameHandle | null>) => {
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

      // Local roll is allowed only in socket-mock mode.
      boardRef.current?.rollDice()
    },
    [boardRef, currentTurn]
  )
}
