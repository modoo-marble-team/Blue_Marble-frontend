import { socket } from '../../lib/socket'
import { useGameStore } from '../../stores/game.store'
import { Player, Tile, Card, GameResult } from '../../types/domain'

export const setupGameHandlers = () => {
  const gameStore = useGameStore.getState()

  // SOCK-028: game_start
  socket.on(
    'game_start',
    ({
      game_state,
    }: {
      game_id: string // Used in type but not in logic, usually fine in TS destruction if needed for shape
      game_state: {
        players: Player[]
        tiles: Tile[]
        current_turn: string | null
        round: number
      }
    }) => {
      gameStore.setGameState({
        players: game_state.players,
        tiles: game_state.tiles,
        current_turn: game_state.current_turn,
        round: game_state.round,
      })
    }
  )

  // SOCK-012: game_state
  socket.on(
    'game_state',
    (state: {
      players: Player[]
      tiles: Tile[]
      current_turn: string | null
      round: number
    }) => {
      gameStore.setGameState({
        players: state.players,
        tiles: state.tiles,
        current_turn: state.current_turn,
        round: state.round,
      })
    }
  )

  // SOCK-009: turn_start
  socket.on(
    'turn_start',
    ({
      player_id,
      round,
    }: {
      player_id: string
      round: number
      timeout_sec: number
    }) => {
      gameStore.setGameState({
        current_turn: player_id,
        round,
      })
    }
  )

  // SOCK-010: dice_rolled
  socket.on(
    'dice_rolled',
    ({
      player_id,
      dice,
    }: {
      player_id: string
      dice: number[]
      is_double: boolean
      double_count: number
    }) => {
      console.log(`Player ${player_id} rolled: ${dice[0]}, ${dice[1]}`)
    }
  )

  // SOCK-011: player_moved
  socket.on(
    'player_moved',
    ({
      player_id,
      to_index,
      pass_go,
      pass_go_salary,
    }: {
      player_id: string
      from_index: number
      to_index: number
      trigger: string
      pass_go: boolean
      pass_go_salary: number
    }) => {
      gameStore.updatePlayer(player_id, { position: to_index })
      if (pass_go) {
        console.log(
          `Player ${player_id} passed GO and earned ${pass_go_salary}`
        )
      }
    }
  )

  // SOCK-013: tile_purchased
  socket.on(
    'tile_purchased',
    ({
      player_id,
      tile_index,
    }: {
      player_id: string
      tile_index: number
      tile_name: string
      price: number
    }) => {
      gameStore.updateTile(tile_index, { owner_id: player_id })
      gameStore.setModal(null)
    }
  )

  // SOCK-014: toll_paid
  socket.on(
    'toll_paid',
    ({
      payer_id,
      owner_id,
      amount,
    }: {
      payer_id: string
      owner_id: string
      tile_index: number
      amount: number
    }) => {
      console.log(`Player ${payer_id} paid ${amount} to ${owner_id}`)
    }
  )

  // SOCK-015, SOCK-029: event_card_drawn, chance_card_drawn
  const handleCardDrawn = ({
    player_id,
    card,
  }: {
    player_id: string
    card: Card
  }) => {
    gameStore.setModal('card')
    console.log(`Player ${player_id} drew: ${card.title} - ${card.description}`)
  }
  socket.on('event_card_drawn', handleCardDrawn)
  socket.on('chance_card_drawn', handleCardDrawn)

  // SOCK-016: player_sent_to_jail
  socket.on(
    'player_sent_to_jail',
    ({ player_id }: { player_id: string; source: string }) => {
      gameStore.updatePlayer(player_id, { is_in_jail: true })
    }
  )

  // SOCK-017: player_bankrupt
  socket.on(
    'player_bankrupt',
    ({
      player_id,
    }: {
      player_id: string
      reason: string
      released_tiles: number[]
    }) => {
      gameStore.updatePlayer(player_id, { is_bankrupt: true })
      gameStore.setModal('bankrupt')
    }
  )

  // SOCK-018: game_over
  socket.on('game_over', (payload: GameResult) => {
    const winner = payload.rankings.find((r) => r.is_winner)
    gameStore.setGameState({
      gameResult: payload,
      isGameOver: true,
      winnerId: winner?.player_id || null,
    })
  })

  // SOCK-019: ai_penalty_loading
  socket.on('ai_penalty_loading', ({ player_id }: { player_id: string }) => {
    console.log(`AI Penalty loading for ${player_id}...`)
  })

  // SOCK-020: ai_penalty
  socket.on(
    'ai_penalty',
    ({
      player_id,
      penalty,
    }: {
      player_id: string
      penalty: number
      source: string
    }) => {
      gameStore.setModal('penalty')
      console.log(`AI Penalty for ${player_id}: ${penalty}`)
    }
  )
}
