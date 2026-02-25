import React from 'react'
import { Player } from '../../../types/domain'
import { cn } from '../../../lib/utils'

interface PlayerCardProps {
  player: Player
  isActive: boolean
}

const PlayerCard: React.FC<PlayerCardProps> = ({ player, isActive }) => {
  return (
    <div
      className={cn(
        'relative flex items-center gap-3 rounded-2xl bg-white/90 p-4 transition-all duration-300',
        isActive
          ? 'border-2 border-[#3B82F6] shadow-[0_8px_16px_-4px_rgba(59,130,246,0.2)]'
          : 'border-transparent shadow-sm'
      )}
    >
      {/* Turn Badge */}
      {isActive && (
        <div className="absolute right-4 top-4 flex items-center justify-center rounded-full bg-[#2B7FFF] px-2 py-0.5 shadow-sm">
          <span className="text-[10px] font-black tracking-wider text-white">
            TURN
          </span>
        </div>
      )}

      {/* Avatar Section */}
      <div className="relative shrink-0">
        {isActive && (
          <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-2xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.15)] z-10">
            👑
          </span>
        )}

        <div className="absolute left-0.5 top-1 h-10 w-10 rounded-full bg-black/10 blur-[2px]" />

        <div
          className="flex h-10 w-10 items-center justify-center rounded-full border-b-[3px] shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)] text-xl"
          style={{
            background: isActive
              ? 'linear-gradient(135deg, #FF6467 0%, #E7000B 100%)'
              : 'linear-gradient(135deg, #FFDF20 0%, #F0B100 100%)',
            borderBottomColor: isActive ? '#C10007' : '#D08700',
          }}
        >
          <span className="mb-0.5">{player.avatar || '👤'}</span>
          <div className="absolute left-[18%] top-[15%] h-[18%] w-[30%] -rotate-[20deg] rounded-full bg-white/30" />
        </div>
      </div>

      {/* Info Section */}
      <div className="flex-1 min-w-0">
        <div className="mb-0.5">
          <span
            className={cn(
              'text-sm font-black leading-none',
              isActive ? 'text-[#155DFC]' : 'text-[#314158]'
            )}
          >
            {player.nickname}
          </span>
        </div>

        <div className="space-y-0.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#45556C]">보유금</span>
            <span className="text-[12px] font-black text-[#45556C]">
              {player.balance.toLocaleString()}M
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium text-[#90A1B9]">
              🏦 총자산
            </span>
            <span className="text-[10px] font-bold text-[#90A1B9]">
              {player.balance.toLocaleString()}M
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PlayerCard
