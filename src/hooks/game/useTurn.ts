export const useTurn = (currentTurn: string | null, myId = 'me') => {
  return currentTurn === myId
}

