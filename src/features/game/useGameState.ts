import { useEffect } from 'react'
import { useGameStore } from '../../stores/game.store'

export const useGameState = () => {
  const { setGameState, players } = useGameStore()

  useEffect(() => {
    const fetchGameState = async () => {
      // Only mock if storage is empty
      if (players.length > 0) return

      try {
        const response = await fetch('/api/game/state')
        const data = await response.json()
        setGameState(data)
      } catch (error) {
        console.error('Failed to fetch game state:', error)
      }
    }

    fetchGameState()
  }, [setGameState, players.length])

  return {}
}
