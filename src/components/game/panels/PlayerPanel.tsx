import React from 'react'
import { formatWon } from '../../../lib/utils'

interface Player {
  id: string
  name?: string
  nickname?: string
  color?: string
  money?: number
  totalAssets?: number
  avatarUrl?: string
}

interface PlayerPanelProps {
  player: Player
  isActive: boolean
  isRichest?: boolean
}

const PlayerPanel: React.FC<PlayerPanelProps> = ({
  player,
  isActive,
  isRichest = false,
}) => {
  const money = player.money ?? 0
  const totalAssets = player.totalAssets ?? money

  return (
    <div
      style={{
        border: isActive ? '2.5px solid #3B82F6' : '2.5px solid transparent',
        boxShadow: isActive ? '0 0 0 3px rgba(147,197,253,0.45)' : 'none',
        borderRadius: 24,
        transition: 'border 0.2s ease, box-shadow 0.2s ease',
        background: '#ffffff',
      }}
      className="relative flex items-center gap-4 rounded-3xl px-5 py-4 shadow-sm"
    >
      <div className="relative shrink-0">
        {isRichest && (
          <span
            style={{
              position: 'absolute',
              top: -14,
              left: '50%',
              transform: 'translateX(-50%)',
              fontSize: 20,
              lineHeight: 1,
              zIndex: 10,
            }}
          >
            👑
          </span>
        )}
        <div
          className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full"
          style={{ backgroundColor: player.color ?? '#E2E8F0' }}
        >
          {player.avatarUrl ? (
            <img
              src={player.avatarUrl}
              alt={player.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div
              style={{
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                background: `radial-gradient(circle at 35% 35%, rgba(255,255,255,0.55) 0%, transparent 60%), ${player.color ?? '#E2E8F0'}`,
              }}
            />
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-0.5 overflow-hidden">
        <div className="flex items-center justify-between gap-2">
          <span
            className="truncate text-[16px] font-black"
            style={{ color: isActive ? '#245FE5' : '#1F2A44' }}
          >
            {player.nickname ?? player.name ?? `Player ${player.id}`}
          </span>
          {isActive && (
            <span
              className="shrink-0 rounded-full px-3 py-0.5 text-[12px] font-black text-white"
              style={{ backgroundColor: '#3B82F6' }}
            >
              TURN
            </span>
          )}
        </div>

        <div className="flex items-center justify-between">
          <span className="text-[13px] text-[#8B9AB0]">보유금</span>
          <span className="text-[20px] font-black text-[#1F2A44]">
            {formatWon(money)}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1 text-[12px] text-[#B0BBC8]">
            <span>🏦</span>
            <span>총자산</span>
          </span>
          <span className="text-[13px] text-[#B0BBC8]">
            {formatWon(totalAssets)}
          </span>
        </div>
      </div>
    </div>
  )
}

export default PlayerPanel
