import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type {
  Player,
  Tile,
  ActiveModal,
  GameResult,
  GameState,
} from '../types/domain'

interface GameActions {
  setGameState: (state: Partial<GameState>) => void
  updatePlayer: (playerId: string, updates: Partial<Player>) => void
  updateTile: (tileIndex: number, updates: Partial<Tile>) => void
  setCurrentTurn: (playerId: string) => void
  setModal: (modal: ActiveModal) => void
  setGameResult: (result: GameResult) => void
  resetGame: () => void
}

const INITIAL_STATE: GameState = {
  players: [],
  tiles: [],
  currentTurnId: null,
  round: 1,
  activeModal: null,
  gameResult: null,
  isGameOver: false,
  winnerId: null,
}

export const useGameStore = create<GameState & GameActions>()(
  immer((set) => ({
    ...INITIAL_STATE,

    setGameState: (state) =>
      set((draft) => {
        Object.assign(draft, state)
      }),

    updatePlayer: (playerId, updates) =>
      set((draft) => {
        const player = draft.players.find((p) => p.id === playerId)
        if (player) {
          Object.assign(player, updates)
        }
      }),

    updateTile: (tileIndex, updates) =>
      set((draft) => {
        const tile = draft.tiles.find((t) => t.index === tileIndex)
        if (tile) {
          Object.assign(tile, updates)
        }
      }),

    setCurrentTurn: (playerId) =>
      set((draft) => {
        draft.currentTurnId = playerId
      }),

    setModal: (modal) =>
      set((draft) => {
        draft.activeModal = modal
      }),

    setGameResult: (result) =>
      set((draft) => {
        draft.gameResult = result
      }),

    resetGame: () =>
      set((draft) => {
        Object.assign(draft, INITIAL_STATE)
      }),
  }))
)
