// PlayerPanel.tsx — isActive 일 때 파란 테두리 강조
// 이미 구현되어 있다면 이 파일은 무시하세요.
import React from 'react'

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
}

const PlayerPanel: React.FC<PlayerPanelProps> = ({ player, isActive }) => {
  return (
    <div
      style={{
        border: isActive ? '2.5px solid #3B82F6' : '2.5px solid transparent',
        boxShadow: isActive ? '0 0 0 3px rgba(147,197,253,0.5)' : 'none',
        borderRadius: 20,
        transition: 'border 0.2s ease, box-shadow 0.2s ease',
      }}
      className="relative rounded-[20px] bg-white px-5 py-4 shadow-sm"
    >
      {/* TURN 뱃지 */}
      {isActive && (
        <span className="absolute right-4 top-4 rounded-full bg-[#3B82F6] px-2 py-0.5 text-[11px] font-black text-white">
          TURN
        </span>
      )}

      <div className="flex items-center gap-3">
        {/* 아바타 */}
        <div
          className="flex h-12 w-12 items-center justify-center rounded-full text-2xl"
          style={{ backgroundColor: player.color ?? '#E2E8F0' }}
        >
          {player.avatarUrl ? (
            <img
              src={player.avatarUrl}
              alt={player.name}
              className="h-full w-full rounded-full object-cover"
            />
          ) : (
            '😊'
          )}
        </div>

        {/* 이름 + 보유금 */}
        <div className="flex flex-1 flex-col">
          <span className="text-[15px] font-black text-[#1F2A44]">
            {player.nickname ?? player.name ?? `Player ${player.id}`}
          </span>
          <span className="text-[12px] text-[#8B9AB0]">보유금</span>
        </div>

        <div className="flex flex-col items-end">
          <span className="text-[17px] font-black text-[#1F2A44]">
            {(player.money ?? 0).toLocaleString()}M
          </span>
          <span className="text-[11px] text-[#8B9AB0]">
            🏠 총자산{' '}
            {(player.totalAssets ?? player.money ?? 0).toLocaleString()}M
          </span>
        </div>
      </div>
    </div>
  )
}

export default PlayerPanel
