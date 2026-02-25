import type { Tile } from '../../types/domain'

export const BOARD_TILE_COUNT = 32

export const createBoardTilesByIndex = (tiles: Tile[]) => {
  return [...tiles].sort((a, b) => a.index - b.index)
}

