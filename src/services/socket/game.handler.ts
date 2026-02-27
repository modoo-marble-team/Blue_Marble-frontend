import { socket } from '../../lib/socket'
import { useGameStore } from '../../stores/game.store'
import type { Card, GameResult, Player, Tile } from '../../types/domain'

type Teardown = () => void

type GameStatePayload = {
  players: Player[]
  tiles: Tile[]
  current_turn: string | null
  round: number
}

let teardownGameHandlersRef: Teardown | null = null

const applyGameState = (payload: GameStatePayload) => {
  const gameStore = useGameStore.getState()
  gameStore.setGameState({
    players: payload.players,
    tiles: payload.tiles,
    currentTurn: payload.current_turn,
    round: payload.round,
  })
}

export const setupGameHandlers = (): Teardown => {
  // Prevent duplicated listeners on remount.
  teardownGameHandlersRef?.()

  const gameStore = useGameStore.getState()

  const handleGameStart = ({ game_state }: { game_state: GameStatePayload }) => {
    applyGameState(game_state)
  }

  const handleGameState = (state: GameStatePayload) => {
    applyGameState(state)
  }

  const handleTurnStart = ({
    player_id,
    round,
  }: {
    player_id: string
    round: number
    timeout_sec: number
  }) => {
    gameStore.setGameState({
      currentTurn: player_id,
      round,
    })
  }

  const handleDiceRolled = ({
    player_id,
    dice,
  }: {
    player_id: string
    dice: number[]
    is_double: boolean
    double_count: number
  }) => {
    // UI animation sync hook point. Keeping no-op to avoid console noise.
    void player_id
    void dice
  }

  const handlePlayerMoved = ({
    player_id,
    to_index,
  }: {
    player_id: string
    from_index: number
    to_index: number
    trigger: string
    pass_go: boolean
    pass_go_salary: number
  }) => {
    gameStore.updatePlayer(player_id, { position: to_index })
  }

  const handleTilePurchased = ({
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

  const handleTollPaid = ({
    payer_id,
    amount,
  }: {
    payer_id: string
    owner_id: string
    tile_index: number
    amount: number
  }) => {
    // If this player exists in store, pessimistically reflect balance.
    const state = useGameStore.getState()
    const payer = state.players.find((p) => p.id === payer_id)
    if (!payer) return
    state.updatePlayer(payer_id, { balance: Math.max(0, payer.balance - amount) })
  }

  const handleCardDrawn = ({ card }: { player_id: string; card: Card }) => {
    void card
    gameStore.setModal('card')
  }

  const handlePlayerSentToJail = ({ player_id }: { player_id: string }) => {
    gameStore.updatePlayer(player_id, { is_in_jail: true })
  }

  const handlePlayerBankrupt = ({ player_id }: { player_id: string }) => {
    gameStore.updatePlayer(player_id, { is_bankrupt: true })
    gameStore.setModal('bankrupt')
  }

  const handleGameOver = (payload: GameResult) => {
    const winner = payload.rankings.find((r) => r.is_winner)
    gameStore.setGameState({
      gameResult: payload,
      isGameOver: true,
      winnerId: winner?.player_id ?? null,
    })
  }

  const handleAIPenaltyLoading = () => {
    gameStore.setModal('penalty')
  }

  const handleAIPenalty = () => {
    gameStore.setModal('penalty')
  }

  socket.on('game_start', handleGameStart)
  socket.on('game_state', handleGameState)
  socket.on('turn_start', handleTurnStart)
  socket.on('dice_rolled', handleDiceRolled)
  socket.on('player_moved', handlePlayerMoved)
  socket.on('tile_purchased', handleTilePurchased)
  socket.on('toll_paid', handleTollPaid)
  socket.on('event_card_drawn', handleCardDrawn)
  socket.on('chance_card_drawn', handleCardDrawn)
  socket.on('player_sent_to_jail', handlePlayerSentToJail)
  socket.on('player_bankrupt', handlePlayerBankrupt)
  socket.on('game_over', handleGameOver)
  socket.on('ai_penalty_loading', handleAIPenaltyLoading)
  socket.on('ai_penalty', handleAIPenalty)

  const teardown = () => {
    socket.off('game_start', handleGameStart)
    socket.off('game_state', handleGameState)
    socket.off('turn_start', handleTurnStart)
    socket.off('dice_rolled', handleDiceRolled)
    socket.off('player_moved', handlePlayerMoved)
    socket.off('tile_purchased', handleTilePurchased)
    socket.off('toll_paid', handleTollPaid)
    socket.off('event_card_drawn', handleCardDrawn)
    socket.off('chance_card_drawn', handleCardDrawn)
    socket.off('player_sent_to_jail', handlePlayerSentToJail)
    socket.off('player_bankrupt', handlePlayerBankrupt)
    socket.off('game_over', handleGameOver)
    socket.off('ai_penalty_loading', handleAIPenaltyLoading)
    socket.off('ai_penalty', handleAIPenalty)
  }

  teardownGameHandlersRef = teardown
  return teardown
}

export const emitRollDice = (payload: { player_id: string }) => {
  socket.emit('roll_dice', payload)
}

export const emitConfirmPenalty = (payload: { player_id: string }) => {
  socket.emit('confirm_penalty', payload)
}
