import React from 'react'
import { Player } from '../../types/domain'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

interface PlayerCardProps {
  player: Player
  isActive: boolean
}

const PlayerCard: React.FC<PlayerCardProps> = ({ player, isActive }) => {
  return (
    <div
      className={cn(
        'relative flex items-center gap-4 rounded-2xl border-2 bg-white p-4 transition-all duration-300',
        isActive
          ? 'border-blue-400 shadow-lg'
          : 'border-transparent shadow-sm hover:border-gray-200'
      )}
    >
      {/* Avatar */}
      <div
        className="flex h-12 w-12 items-center justify-center rounded-full text-2xl shadow-inner"
        style={{ backgroundColor: player.color }}
      >
        {player.avatar || '👤'}
      </div>

      {/* Info */}
      <div className="flex-1 overflow-hidden">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate font-bold text-[#191919]">
            {player.nickname}
          </span>
          {isActive && (
            <span className="flex items-center justify-center rounded-full bg-[#191919] px-2 py-0.5 text-[8px] font-bold text-white tracking-widest">
              TURN
            </span>
          )}
        </div>

        <div className="mt-1 flex flex-col">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium text-gray-500">
              보유금
            </span>
            <span className="text-[12px] font-bold text-[#191919]">
              {player.balance.toLocaleString()}M
            </span>
          </div>
          <div className="flex items-center justify-between text-gray-400">
            <div className="flex items-center gap-1">
              <span className="text-[8px]">🏢</span>
              <span className="text-[9px]">총자산</span>
            </div>
            <span className="text-[10px]">
              {player.balance.toLocaleString()}M
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PlayerCard
