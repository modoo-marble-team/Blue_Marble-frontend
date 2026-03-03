export const useTurn = (currentTurn: string | null, myId?: string | null) => {
  if (!currentTurn || !myId) {
    return false
  }

  return currentTurn === myId
}
