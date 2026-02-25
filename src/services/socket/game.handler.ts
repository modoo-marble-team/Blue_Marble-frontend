import { socket } from '../../lib/socket'
import { useGameStore } from '../../stores/game.store'
import { Player, Tile, BuildingLevel } from '../../types/domain'

export const setupGameHandlers = () => {
  const gameStore = useGameStore.getState()

  socket.on(
    'game_state',
    (state: {
      players: Player[]
      tiles: Tile[]
      currentTurnId: string
      round: number
    }) => {
      gameStore.setGameState({
        players: state.players,
        tiles: state.tiles,
        currentTurnId: state.currentTurnId,
        round: state.round,
      })
    }
  )

  socket.on(
    'turn_start',
    ({ playerId, round }: { playerId: string; round: number }) => {
      gameStore.setGameState({
        currentTurnId: playerId,
        round,
      })
    }
  )

  socket.on(
    'dice_rolled',
    ({ playerId, dice }: { playerId: string; dice: number[] }) => {
      console.log(`Player ${playerId} rolled: ${dice[0]}, ${dice[1]}`)
    }
  )

  socket.on(
    'player_moved',
    ({ playerId, position }: { playerId: string; position: number }) => {
      gameStore.updatePlayer(playerId, { position })
    }
  )

  socket.on(
    'tile_purchased',
    ({
      playerId,
      tileId,
      buildingLevel,
      money,
    }: {
      playerId: string
      tileId: number
      buildingLevel: BuildingLevel
      money: number
    }) => {
      // Assuming tileId refers to tile index for now, or we should find by id
      gameStore.updateTile(tileId, { ownerId: playerId, buildingLevel })
      gameStore.updatePlayer(playerId, { money })
      gameStore.setModal(null)
    }
  )

  socket.on(
    'toll_paid',
    ({
      payerId,
      receiverId,
      amount,
      payerMoney,
      receiverMoney,
    }: {
      payerId: string
      receiverId: string
      amount: number
      payerMoney: number
      receiverMoney: number
    }) => {
      gameStore.updatePlayer(payerId, { money: payerMoney })
      if (receiverId) {
        gameStore.updatePlayer(receiverId, { money: receiverMoney })
      }
      console.log(`Toll paid: ${amount}`)
    }
  )

  socket.on(
    'card_drawn',
    ({ playerId, cardType }: { playerId: string; cardType: string }) => {
      gameStore.setModal('card')
      console.log(`Player ${playerId} drew card: ${cardType}`)
    }
  )

  socket.on(
    'player_sent_to_jail',
    ({ playerId, position }: { playerId: string; position: number }) => {
      gameStore.updatePlayer(playerId, { position, isJailed: true })
    }
  )

  socket.on('player_bankrupt', ({ playerId }: { playerId: string }) => {
    gameStore.updatePlayer(playerId, { isBankrupt: true })
    gameStore.setModal('bankrupt')
  })

  socket.on('game_over', ({ winnerId }: { winnerId: string }) => {
    gameStore.setGameState({ isGameOver: true, winnerId })
  })

  socket.on('ai_penalty_loading', () => {
    console.log('AI Penalty loading...')
  })

  socket.on(
    'ai_penalty',
    ({ playerId, amount }: { playerId: string; amount: number }) => {
      gameStore.setModal('penalty')
      console.log(`AI Penalty for ${playerId}: ${amount}`)
    }
  )
}
