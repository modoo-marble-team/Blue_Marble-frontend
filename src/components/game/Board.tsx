import React from 'react'
import Tile from './Tile'
import { Tile as TileType } from '../../types/domain'

interface BoardProps {
  tiles: TileType[]
}

const Board: React.FC<BoardProps> = ({ tiles }) => {
  // 32 tiles total: 9 bottom, 7 left, 9 top, 7 right
  // Order: 0-8 (Bottom R to L), 9-15 (Left B to T), 16-24 (Top L to R), 25-31 (Right T to B)
  // Matching the image layout roughly

  const bottomTiles = tiles.slice(0, 9).reverse()
  const leftTiles = tiles.slice(9, 16).reverse()
  const topTiles = tiles.slice(16, 25)
  const rightTiles = tiles.slice(25, 32)

  return (
    <div className="relative inline-block rounded-3xl bg-[#dbeafe] p-4 shadow-2xl">
      <div className="grid grid-cols-9 grid-rows-9 gap-0.5 overflow-hidden rounded-xl bg-white">
        {/* Top Row: 16 to 24 */}
        {topTiles.map((tile, i) => (
          <div key={tile.index} style={{ gridRow: 1, gridColumn: i + 1 }}>
            <Tile
              tile={tile}
              position={i === 0 || i === 8 ? 'corner' : 'top'}
            />
          </div>
        ))}

        {/* Left Column: 9 to 15 (between corners) */}
        {leftTiles.map((tile, i) => (
          <div key={tile.index} style={{ gridRow: i + 2, gridColumn: 1 }}>
            <Tile tile={tile} position="left" />
          </div>
        ))}

        {/* Bottom Row: 0 to 8 (R to L in index, L to R in grid) */}
        {bottomTiles.map((tile, i) => (
          <div key={tile.index} style={{ gridRow: 9, gridColumn: i + 1 }}>
            <Tile
              tile={tile}
              position={i === 0 || i === 8 ? 'corner' : 'bottom'}
            />
          </div>
        ))}

        {/* Right Column: 25 to 31 (between corners) */}
        {rightTiles.map((tile, i) => (
          <div key={tile.index} style={{ gridRow: i + 2, gridColumn: 9 }}>
            <Tile tile={tile} position="right" />
          </div>
        ))}

        {/* Center Area */}
        <div
          className="relative flex items-center justify-center bg-[#f8fafc]"
          style={{ gridRow: '2 / 9', gridColumn: '2 / 9' }}
        >
          {/* Crown Watermark */}
          <div className="opacity-10">
            <svg viewBox="0 0 24 24" className="h-64 w-64 fill-blue-500">
              <path d="M5 16L3 5L8.5 10L12 4L15.5 10L21 5L19 16H5zM19 19C19 19.5523 18.5523 20 18 20H6C5.44772 20 5 19.5523 5 19V18H19V19z" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Board
