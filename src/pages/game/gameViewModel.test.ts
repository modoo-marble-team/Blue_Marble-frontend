import { describe, expect, it } from 'vitest'
import {
  findBoardCurrentPlayerIndex,
  mapStorePlayersToBoardPlayers,
  mapStoreTilesToBoardTiles,
} from './gameViewModel'

describe('game view model mapper', () => {
  it('maps store players to board players using store state as the source', () => {
    const boardPlayers = mapStorePlayersToBoardPlayers([
      {
        id: 'player-1',
        nickname: 'Player 1',
        position: 4,
        balance: 900,
        owned_tiles: [],
        is_in_jail: false,
        jail_turn_count: 0,
        is_bankrupt: false,
        color: '#111111',
      },
    ])

    expect(boardPlayers[0]).toMatchObject({
      id: 0,
      name: 'Player 1',
      pos: 4,
      money: 900,
      color: '#111111',
    })
    expect(boardPlayers[1]?.name).toBe('MarbleKing')
  })

  it('finds the current board player index by mixed player id values', () => {
    const players = [
      {
        id: 'player-1',
        nickname: 'Player 1',
        position: 0,
        balance: 1000,
        owned_tiles: [],
        is_in_jail: false,
        jail_turn_count: 0,
        is_bankrupt: false,
        color: '#111111',
      },
      {
        id: 2,
        nickname: 'Player 2',
        position: 1,
        balance: 1200,
        owned_tiles: [],
        is_in_jail: false,
        jail_turn_count: 0,
        is_bankrupt: false,
        color: '#222222',
      },
    ]

    expect(findBoardCurrentPlayerIndex(players, '2')).toBe(1)
    expect(findBoardCurrentPlayerIndex(players, null)).toBe(0)
  })

  it('maps tile owner ids to board player ids for board rendering', () => {
    const storePlayers = [
      {
        id: 'player-1',
        nickname: 'Player 1',
        position: 0,
        balance: 1000,
        owned_tiles: [],
        is_in_jail: false,
        jail_turn_count: 0,
        is_bankrupt: false,
        color: '#111111',
      },
    ]
    const boardPlayers = mapStorePlayersToBoardPlayers(storePlayers)
    const boardTiles = mapStoreTilesToBoardTiles(
      [
        {
          index: 1,
          name: 'Seoul',
          type: 'city',
          owner_id: 'player-1',
          building: 1,
        },
      ],
      storePlayers,
      boardPlayers
    )

    expect(boardTiles[0]?.owner_id).toBe(boardPlayers[0]?.id)
  })
})
