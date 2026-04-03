import { describe, expect, it } from 'vitest'
import { mockTiles } from '../../mocks/gameMockData'
import { TILES } from './board.constants'

type BackendBoardTileType =
  | 'START'
  | 'PROPERTY'
  | 'CHANCE'
  | 'EVENT'
  | 'ISLAND'
  | 'TRAVEL'
  | 'MOVE_TO_ISLAND'

type BackendBoardTile = {
  tileId: number
  name: string
  tileType: BackendBoardTileType
}

// Source of truth:
// https://github.com/modoo-marble-team/modoo-marble-backend/blob/develop/app/game/rulesets/default.v1.json
// Verified on 2026-04-03.
const BACKEND_DEFAULT_V1_BOARD: readonly BackendBoardTile[] = [
  { tileId: 0, name: '\uCD9C\uBC1C', tileType: 'START' },
  { tileId: 1, name: '\uC218\uC6D0', tileType: 'PROPERTY' },
  { tileId: 2, name: '\uC6A9\uC778', tileType: 'PROPERTY' },
  { tileId: 3, name: '\uCC2C\uC2A4', tileType: 'CHANCE' },
  { tileId: 4, name: '\uAD70\uC0B0', tileType: 'PROPERTY' },
  { tileId: 5, name: '\uD0DC\uBC31', tileType: 'PROPERTY' },
  { tileId: 6, name: '\uC6B8\uC0B0', tileType: 'PROPERTY' },
  { tileId: 7, name: '\uC774\uBCA4\uD2B8', tileType: 'EVENT' },
  { tileId: 8, name: '\uBB34\uC778\uB3C4', tileType: 'ISLAND' },
  { tileId: 9, name: '\uACBD\uC8FC', tileType: 'PROPERTY' },
  { tileId: 10, name: '\uCC2C\uC2A4', tileType: 'CHANCE' },
  { tileId: 11, name: '\uD3EC\uD56D', tileType: 'PROPERTY' },
  { tileId: 12, name: '\uB300\uAD6C', tileType: 'PROPERTY' },
  { tileId: 13, name: '\uCC3D\uC6D0', tileType: 'PROPERTY' },
  { tileId: 14, name: '\uC775\uC0B0', tileType: 'PROPERTY' },
  { tileId: 15, name: '\uBD80\uC0B0', tileType: 'PROPERTY' },
  { tileId: 16, name: '\uC5EC\uD589', tileType: 'TRAVEL' },
  { tileId: 17, name: '\uC81C\uC8FC', tileType: 'PROPERTY' },
  { tileId: 18, name: '\uC5EC\uC218', tileType: 'PROPERTY' },
  { tileId: 19, name: '\uAD11\uC8FC', tileType: 'PROPERTY' },
  { tileId: 20, name: '\uC774\uBCA4\uD2B8', tileType: 'EVENT' },
  { tileId: 21, name: '\uCD98\uCC9C', tileType: 'PROPERTY' },
  { tileId: 22, name: '\uAC15\uB989', tileType: 'PROPERTY' },
  { tileId: 23, name: '\uC804\uC8FC', tileType: 'PROPERTY' },
  {
    tileId: 24,
    name: '\uBB34\uC778\uB3C4\uB85C \uC774\uB3D9',
    tileType: 'MOVE_TO_ISLAND',
  },
  { tileId: 25, name: '\uCCAD\uC8FC', tileType: 'PROPERTY' },
  { tileId: 26, name: '\uCC9C\uC548', tileType: 'PROPERTY' },
  { tileId: 27, name: '\uCC2C\uC2A4', tileType: 'CHANCE' },
  { tileId: 28, name: '\uB300\uC804', tileType: 'PROPERTY' },
  { tileId: 29, name: '\uC778\uCC9C', tileType: 'PROPERTY' },
  { tileId: 30, name: '\uC774\uBCA4\uD2B8', tileType: 'EVENT' },
  { tileId: 31, name: '\uC11C\uC6B8', tileType: 'PROPERTY' },
]

const BACKEND_TO_MOCK_TILE_TYPE: Record<BackendBoardTileType, string> = {
  START: 'start',
  PROPERTY: 'property',
  CHANCE: 'chance',
  EVENT: 'event',
  ISLAND: 'island',
  TRAVEL: 'travel',
  MOVE_TO_ISLAND: 'go_to_island',
}

describe('board.constants parity guard', () => {
  it('keeps static fallback tile order/name/type aligned with backend default.v1 board', () => {
    const frontendBoard = TILES.map((tile) => ({
      tileId: tile.id,
      name: tile.name,
      tileType: tile.type,
    }))

    expect(frontendBoard).toEqual(BACKEND_DEFAULT_V1_BOARD)
  })

  it('keeps mock tile order/name/type aligned with backend default.v1 board', () => {
    const frontendMockBoard = mockTiles.map((tile) => ({
      tileId: tile.index,
      name: tile.name,
      tileType: tile.type,
    }))

    const expectedMockBoard = BACKEND_DEFAULT_V1_BOARD.map((tile) => ({
      tileId: tile.tileId,
      name: tile.name,
      tileType: BACKEND_TO_MOCK_TILE_TYPE[tile.tileType],
    }))

    expect(frontendMockBoard).toEqual(expectedMockBoard)
  })
})
