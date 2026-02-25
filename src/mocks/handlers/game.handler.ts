import { http, HttpResponse } from 'msw'
import { socket } from '../../lib/socket'

export const gameHandlers = [
  /**
   * Mocking dice roll
   * Emits SOCK-010 (dice_rolled) and SOCK-011 (player_moved) payloads according to spec.
   */
  http.post('/api/game/roll-dice', async ({ request }) => {
    const { playerId } = (await request.json()) as { playerId: string }

    const dice1 = Math.floor(Math.random() * 6) + 1
    const dice2 = Math.floor(Math.random() * 6) + 1
    const isDouble = dice1 === dice2
    const total = dice1 + dice2

    // Simulate server emitting events
    setTimeout(() => {
      // @ts-expect-error - socket.listeners is not in the type definition but exists in socket.io-client
      const diceListeners = (
        socket as unknown as {
          listeners: (e: string) => Array<(d: unknown) => void>
        }
      ).listeners('dice_rolled')
      diceListeners.forEach((cb) =>
        cb({
          player_id: playerId,
          dice: [dice1, dice2],
          is_double: isDouble,
          double_count: isDouble ? 1 : 0,
        })
      )

      setTimeout(() => {
        // @ts-expect-error - socket.listeners is not in the type definition
        const moveListeners = (
          socket as unknown as {
            listeners: (e: string) => Array<(d: unknown) => void>
          }
        ).listeners('player_moved')
        moveListeners.forEach((cb) =>
          cb({
            player_id: playerId,
            from_index: 0,
            to_index: total,
            trigger: 'dice',
            pass_go: false,
            pass_go_salary: 200000,
          })
        )
      }, 800)
    }, 100)

    return HttpResponse.json({
      success: true,
      dice: [dice1, dice2],
    })
  }),
]
