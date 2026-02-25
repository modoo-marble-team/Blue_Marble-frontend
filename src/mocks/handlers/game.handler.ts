import { http, HttpResponse } from 'msw'
import { socket } from '../../lib/socket'

export const gameHandlers = [
  /**
   * Mocking dice roll
   * Since this is MSW (HTTP), we simulate the server receiving a roll-dice request
   * and subsequently emitting socket events to all players.
   */
  http.post('/api/game/roll-dice', async ({ request }) => {
    const { playerId } = (await request.json()) as { playerId: string }

    const dice1 = Math.floor(Math.random() * 6) + 1
    const dice2 = Math.floor(Math.random() * 6) + 1
    const total = dice1 + dice2

    // Simulate server emitting events
    setTimeout(() => {
      // Use a type-safe way to access listeners if possible, otherwise use a more specific cast
      // @ts-expect-error - socket.listeners is not in the type definition but exists in socket.io-client
      const listeners = (
        socket as unknown as {
          listeners: (e: string) => Array<(d: unknown) => void>
        }
      ).listeners('dice_rolled')
      listeners.forEach((cb) => cb({ playerId, dice: [dice1, dice2] }))

      setTimeout(() => {
        // @ts-expect-error - socket.listeners is not in the type definition
        const moveListeners = (
          socket as unknown as {
            listeners: (e: string) => Array<(d: unknown) => void>
          }
        ).listeners('player_moved')
        moveListeners.forEach((cb) => cb({ playerId, position: total }))
      }, 500)
    }, 100)

    return HttpResponse.json({
      success: true,
      dice: [dice1, dice2],
    })
  }),
]
