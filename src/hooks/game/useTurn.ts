import type { PlayerId } from '../../types/domain'

export const useTurn = (
  currentTurn: PlayerId | null,
  myId?: PlayerId | null
) => {
  if (!currentTurn || !myId) {
    return false
  }

  return String(currentTurn) === String(myId)
}
