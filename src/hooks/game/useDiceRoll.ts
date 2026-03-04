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
    (roomId: string | null) => {
      if (!roomId) {
        return
      }

      // Prefer server-authoritative roll via socket.
      if (!USE_GAME_SOCKET_MOCK && socket.connected && currentTurn) {
        emitGameAction({
          type: 'ROLL_DICE',
          roomId,
        })
        return
      }

      // Fallback for local/mock flow.
      boardRef.current?.rollDice()
    },
    [boardRef, currentTurn]
  )
}
