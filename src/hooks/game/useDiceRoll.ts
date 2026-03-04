import { RefObject, useCallback } from 'react'
import type { BoardGameHandle } from '../../components/board/GameBoard'
import { socket } from '../../lib/socket'
import { emitRollDice } from '../../services/socket/game.handler'
import { useGameStore } from '../../stores/game.store'

const USE_GAME_SOCKET_MOCK =
  import.meta.env.DEV && import.meta.env.VITE_USE_SOCKET_MOCK !== 'false'

export const useDiceRoll = (boardRef: RefObject<BoardGameHandle | null>) => {
  const currentTurn = useGameStore((state) => state.currentTurn)

  return useCallback(
    (roomId: string | null) => {
      if (!roomId) {
        return
      }

      // Prefer server-authoritative roll via socket.
      if (!USE_GAME_SOCKET_MOCK && socket.connected && currentTurn) {
        emitRollDice({ room_id: roomId })
        return
      }

      // Fallback for local/mock flow.
      boardRef.current?.rollDice()
    },
    [boardRef, currentTurn]
  )
}
