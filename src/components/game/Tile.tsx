import React from 'react'
import { Tile as TileType } from '../../types/domain'
import { cn } from '../../lib/utils'

const CS = 86 // Corner Size
const SS = 58 // Straight Size

const TILE_ICON: Record<string, string> = {
  start: '🚩',
  jail: '🏝️',
  penalty: '👮♂️',
  airport: '✈️',
  park: '🌳',
  chance: '❓',
  card: '🎁',
}

interface TileProps {
  tile: TileType
  position: 'top' | 'bottom' | 'left' | 'right' | 'corner'
}

const Tile: React.FC<TileProps> = ({ tile, position }) => {
  const isCorner = position === 'corner'
  const isCity = tile.type === 'property'
  const icon = TILE_ICON[tile.type]

  const stripeColor = isCity
    ? tile.color
    : tile.type === 'card'
      ? '#EF5350'
      : tile.type === 'chance'
        ? '#FFD15B'
        : null

  if (isCorner) {
    return (
      <div className="relative flex h-full w-full flex-col items-center justify-center rounded-2xl border-2 border-[#2B7FFF] bg-white p-2 shadow-[0_0_0_4px_rgba(190,219,255,0.8)]">
        <span className="text-2xl drop-shadow-sm">{icon}</span>
        <span className="mt-1 text-center text-[9px] font-black uppercase tracking-tight text-[#45556C]">
          {tile.name}
        </span>
      </div>
    )
  }

  const renderInner = () => (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-xl bg-white/90">
      {(position === 'top' || position === 'left' || position === 'right') &&
        stripeColor && (
          <div
            style={{ backgroundColor: stripeColor }}
            className="h-[24%] shrink-0 rounded-t-lg"
          />
        )}

      <div className="flex flex-1 flex-col items-center justify-center p-1">
        <span className="text-center text-[9.5px] font-black uppercase leading-tight text-[#45556C] line-clamp-2">
          {tile.name}
        </span>
      </div>

      {isCity && (
        <div className="mb-1 flex justify-center px-1">
          <div className="rounded border border-[#F1F5F9] bg-[#F8FAFC] px-1.5 py-0.5 text-[8px] font-black text-[#90A1B9]">
            60M
          </div>
        </div>
      )}

      {position === 'bottom' && stripeColor && (
        <div
          style={{ backgroundColor: stripeColor }}
          className="h-[24%] shrink-0 rounded-t-lg"
        />
      )}
    </div>
  )

  const rotationClass =
    position === 'left' ? 'rotate-90' : position === 'right' ? '-rotate-90' : ''

  return (
    <div className="h-full w-full overflow-hidden rounded-[14px] bg-[#E2E8F0] p-[1.5px]">
      {position === 'left' || position === 'right' ? (
        <div className="relative h-full w-full">
          <div
            className={cn('absolute left-1/2 top-1/2', rotationClass)}
            style={{
              width: SS + 2,
              height: CS + 2,
              transform: `translate(-50%, -50%) ${position === 'left' ? 'rotate(90deg)' : 'rotate(-90deg)'}`,
            }}
          >
            {renderInner()}
          </div>
        </div>
      ) : (
        renderInner()
      )}
    </div>
  )
}

export default Tile
