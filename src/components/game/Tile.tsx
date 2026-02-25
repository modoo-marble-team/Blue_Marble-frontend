import React from 'react'
import { Tile as TileType } from '../../types/domain'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

interface TileProps {
  tile: TileType
  className?: string
  position: 'top' | 'bottom' | 'left' | 'right' | 'corner'
}

const Tile: React.FC<TileProps> = ({ tile, className, position }) => {
  const isCorner = position === 'corner'

  return (
    <div
      className={cn(
        'relative flex flex-col items-center justify-between border-[1px] border-[#e5e7eb] bg-white text-center transition-all hover:bg-[#f9fafb]',
        isCorner
          ? 'h-[100px] w-[100px]'
          : position === 'top' || position === 'bottom'
            ? 'h-[100px] w-[80px]'
            : 'h-[80px] w-[100px]',
        className
      )}
    >
      {/* Top/Side Color Bar for Property */}
      {tile.type === 'property' && tile.color && (
        <div
          className={cn(
            'absolute',
            position === 'bottom' && 'top-0 h-4 w-full',
            position === 'top' && 'bottom-0 h-4 w-full',
            position === 'left' && 'right-0 h-full w-4',
            position === 'right' && 'left-0 h-full w-4'
          )}
          style={{ backgroundColor: tile.color }}
        />
      )}

      {/* Tile Content */}
      <div
        className={cn(
          'flex h-full w-full flex-col items-center justify-center p-1',
          position === 'bottom' && 'flex-col-reverse'
        )}
      >
        <span className="text-[10px] font-bold text-[#374151] sm:text-[12px]">
          {tile.name}
        </span>

        {tile.type === 'property' && (
          <div className="mt-1 text-[8px] font-medium text-[#6b7280]">
            {tile.price ? `${tile.price}M` : ''}
          </div>
        )}

        {/* Icons/Illustrations would go here */}
        {tile.type === 'start' && <div className="text-xl">🚩</div>}
        {tile.type === 'jail' && <div className="text-xl">🚓</div>}
        {tile.type === 'park' && <div className="text-xl">🌳</div>}
        {tile.type === 'chance' && (
          <div className="text-xl text-orange-500">?</div>
        )}
        {tile.type === 'card' && <div className="text-xl">🎁</div>}
      </div>

      {/* Buildings Indicator */}
      {tile.owner_id && (
        <div className="absolute inset-x-0 bottom-5 flex justify-center gap-0.5">
          {Array.from({ length: tile.building }).map((_, i) => (
            <div key={i} className="h-1.5 w-1.5 rounded-full bg-blue-500" />
          ))}
        </div>
      )}
    </div>
  )
}

export default Tile
