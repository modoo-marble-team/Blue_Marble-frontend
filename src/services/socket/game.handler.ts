import { socket } from '../../lib/socket'
import { useGameStore } from '../../stores/game.store'
import type { Card, GameResult, Player, Tile } from '../../types/domain'

type Teardown = () => void

type GameStatePayload = {
  players: Player[]
  tiles: Tile[]
  current_turn: string | null
  round: number
  timeout_sec?: number
}

type TurnStartPayload = {
  player_id: string
  round: number
  timeout_sec: number
}

type DiceRolledPayload = {
  player_id: string
  dice: number[]
  is_double: boolean
  double_count: number
}

type PlayerMovedPayload = {
  player_id: string
  from_index: number
  to_index: number
  trigger: string
  pass_go: boolean
  pass_go_salary: number
}

type TilePurchasedPayload = {
  player_id: string
  tile_index: number
  tile_name: string
  price: number
}

type TollPaidPayload = {
  payer_id: string
  owner_id: string
  tile_index: number
  amount: number
}

type CardDrawnPayload = {
  player_id: string
  card: Card
}

type PlayerSentToJailPayload = {
  player_id: string
}

type PlayerBankruptPayload = {
  player_id: string
}

let teardownGameHandlersRef: Teardown | null = null

const applyGameState = (payload: GameStatePayload) => {
  const gameStore = useGameStore.getState()
  gameStore.setGameState({
    players: payload.players,
    tiles: payload.tiles,
    currentTurn: payload.current_turn,
    round: payload.round,
    turnTimeoutSec: payload.timeout_sec ?? gameStore.turnTimeoutSec,
  })
}

const appendOwnedTile = (player: Player, tileIndex: number) => {
  if (player.owned_tiles.includes(tileIndex)) {
    return player.owned_tiles
  }

  return [...player.owned_tiles, tileIndex]
}

export const setupGameHandlers = (): Teardown => {
  teardownGameHandlersRef?.()

  const gameStore = useGameStore.getState()

  const handleGameStart = ({
    game_state,
  }: {
    game_state: GameStatePayload
  }) => {
    applyGameState(game_state)
  }

  const handleGameState = (state: GameStatePayload) => {
    applyGameState(state)
  }

  const handleTurnStart = ({
    player_id,
    round,
    timeout_sec,
  }: TurnStartPayload) => {
    gameStore.setGameState({
      currentTurn: player_id,
      round,
      turnTimeoutSec: timeout_sec,
      turnTimerKey: Date.now(),
    })
  }

  const handleDiceRolled = ({ player_id, dice }: DiceRolledPayload) => {
    // 보드 애니메이션과 연결되기 전까지는 수신 여부만 보장한다.
    void player_id
    void dice
  }

  const handlePlayerMoved = ({
    player_id,
    to_index,
    pass_go,
    pass_go_salary,
  }: PlayerMovedPayload) => {
    const state = useGameStore.getState()
    const player = state.players.find((candidate) => candidate.id === player_id)

    state.updatePlayer(player_id, {
      position: to_index,
      balance:
        player && pass_go ? player.balance + pass_go_salary : player?.balance,
    })
  }

  const handleTilePurchased = ({
    player_id,
    tile_index,
    price,
  }: TilePurchasedPayload) => {
    const state = useGameStore.getState()
    const player = state.players.find((candidate) => candidate.id === player_id)

    state.updateTile(tile_index, { owner_id: player_id })

    if (player) {
      state.updatePlayer(player_id, {
        balance: Math.max(0, player.balance - price),
        owned_tiles: appendOwnedTile(player, tile_index),
      })
    }

    state.setModal(null)
  }

  const handleTollPaid = ({ payer_id, owner_id, amount }: TollPaidPayload) => {
    const state = useGameStore.getState()
    const payer = state.players.find((player) => player.id === payer_id)
    const owner = state.players.find((player) => player.id === owner_id)

    if (payer) {
      state.updatePlayer(payer_id, {
        balance: Math.max(0, payer.balance - amount),
      })
    }

    if (owner) {
      state.updatePlayer(owner_id, {
        balance: owner.balance + amount,
      })
    }
  }

  const handleCardDrawn = ({ card }: CardDrawnPayload) => {
    void card
    gameStore.setModal('card')
  }

  const handlePlayerSentToJail = ({ player_id }: PlayerSentToJailPayload) => {
    gameStore.updatePlayer(player_id, { is_in_jail: true })
  }

  const handlePlayerBankrupt = ({ player_id }: PlayerBankruptPayload) => {
    gameStore.updatePlayer(player_id, { is_bankrupt: true })
    gameStore.setModal('bankrupt')
  }

  const handleGameOver = (payload: GameResult) => {
    const winner = payload.rankings.find((ranking) => ranking.is_winner)
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

export const emitRollDice = (payload: { room_id: string }) => {
  socket.emit('roll_dice', payload)
}

export const emitConfirmPenalty = (payload: {
  room_id: string
  player_id: string
}) => {
  socket.emit('confirm_penalty', payload)
}
