import { RefObject, useCallback } from 'react'
import type { BoardGameHandle } from '../../components/board/LegacyBoardGame'

export const useDiceRoll = (boardRef: RefObject<BoardGameHandle | null>) => {
  return useCallback(() => {
    boardRef.current?.rollDice()
  }, [boardRef])
}

