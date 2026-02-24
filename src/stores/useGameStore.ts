import { create } from 'zustand'

interface GameState {
  isConnected: boolean
  setConnected: (connected: boolean) => void
}

export const useGameStore = create<GameState>((set) => ({
  isConnected: false,
  setConnected: (connected) => set({ isConnected: connected }),
}))
