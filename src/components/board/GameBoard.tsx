import React from 'react'
import BoardTile from './BoardTile'
import { Tile as TileType } from '../../types/domain'

interface BoardProps {
  tiles: TileType[]
}

const CS = 86 // Corner Size
const SS = 58 // Straight Size

const Board: React.FC<BoardProps> = ({ tiles }) => {
  if (!tiles || tiles.length < 32) {
    return (
      <div className="flex aspect-square w-[600px] items-center justify-center rounded-3xl bg-gray-100 text-gray-400">
        Loading Board Data...
      </div>
    )
  }

  const topRow = tiles.slice(16, 25)
  const bottomRow = tiles.slice(0, 9).reverse()
  const leftCol = tiles.slice(9, 16).reverse()
  const rightCol = tiles.slice(25, 32)

  return (
    <div className="relative rounded-[48px] border-[8px] border-white bg-[#DBEAFE] p-7 shadow-[0_50px_100px_-20px_rgba(30,58,138,0.3)]">
      <div
        className="relative grid gap-[2px] rounded-[40px] border-[4px] border-[#EFF6FF]/50 bg-[#F0F9FF] p-5 shadow-[inset_0_10px_20px_rgba(0,0,0,0.05)]"
        style={{
          gridTemplateColumns: `${CS}px repeat(7, ${SS}px) ${CS}px`,
          gridTemplateRows: `${CS}px repeat(7, ${SS}px) ${CS}px`,
        }}
      >
        {/* Center Area */}
        <div
          className="pointer-events-none flex items-center justify-center rounded-lg"
          style={{ gridColumn: '2 / 9', gridRow: '2 / 9' }}
        >
          <div className="scale-[2.5] opacity-10">
            <svg viewBox="0 0 24 24" className="h-64 w-64 fill-[#2B7FFF]">
              <path d="M5 16L3 5L8.5 10L12 4L15.5 10L21 5L19 16H5zM19 19C19 19.5523 18.5523 20 18 20H6C5.44772 20 5 19.5523 5 19V18H19V19z" />
            </svg>
          </div>
        </div>

        {/* Tiles */}
        {topRow.map((tile, i) => (
          <div key={tile.index} style={{ gridRow: 1, gridColumn: i + 1 }}>
            <BoardTile
              tile={tile}
              position={i === 0 || i === 8 ? 'corner' : 'top'}
            />
          </div>
        ))}

        {bottomRow.map((tile, i) => (
          <div key={tile.index} style={{ gridRow: 9, gridColumn: i + 1 }}>
            <BoardTile
              tile={tile}
              position={i === 0 || i === 8 ? 'corner' : 'bottom'}
            />
          </div>
        ))}

        {leftCol.map((tile, i) => (
          <div key={tile.index} style={{ gridRow: i + 2, gridColumn: 1 }}>
            <BoardTile tile={tile} position="left" />
          </div>
        ))}

        {rightCol.map((tile, i) => (
          <div key={tile.index} style={{ gridRow: i + 2, gridColumn: 9 }}>
            <BoardTile tile={tile} position="right" />
          </div>
        ))}
      </div>
    </div>
  )
}

export default Board
