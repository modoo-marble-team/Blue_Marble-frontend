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
  isRichest?: boolean // 보유금 1위일 때 왕관 표시
  isBankrupt?: boolean
}

const PlayerPanel: React.FC<PlayerPanelProps> = ({
  player,
  isActive,
  isRichest = false,
  isBankrupt = false,
}) => {
  const money = player.money ?? 0
  const totalAssets = player.totalAssets ?? money

  return (
    <div
      style={{
        border:
          isActive && !isBankrupt
            ? '2.5px solid #3B82F6'
            : '2.5px solid transparent',
        boxShadow:
          isActive && !isBankrupt ? '0 0 0 3px rgba(147,197,253,0.45)' : 'none',
        borderRadius: 24,
        transition: 'border 0.2s ease, box-shadow 0.2s ease',
        background: isBankrupt ? '#B0B0B0' : '#ffffff',
        overflow: 'hidden',
      }}
      className="relative flex items-center gap-4 rounded-3xl px-5 py-4 shadow-sm"
    >
      {/* ── 파산 시 빨간색 사선 ── */}
      {isBankrupt && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '-10%',
            width: '120%',
            height: '4px',
            backgroundColor: '#FF0000',
            transform: 'translateY(-50%) rotate(12deg)',
            zIndex: 20,
            pointerEvents: 'none',
            borderRadius: '2px',
          }}
        />
      )}
      {/* ── 아바타 + 왕관 ── */}
      <div className="relative shrink-0">
        {/* 왕관 — 보유금 1위 */}
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
            /* 구슬 느낌의 원형 그라데이션 */
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

      {/* ── 이름 + 보유금 ── */}
      <div className="flex flex-1 flex-col gap-0.5 overflow-hidden">
        {/* 이름 행 */}
        <div className="flex items-center justify-between gap-2">
          <span
            className="truncate text-[16px] font-black z-10"
            style={{
              color: isBankrupt ? '#EF5350' : isActive ? '#245FE5' : '#1F2A44',
            }}
          >
            {player.nickname ?? player.name ?? `Player ${player.id}`}
          </span>
          {/* TURN 뱃지 — 이름 옆에 배치해서 돈 가리지 않음 */}
          {isActive && (
            <span
              className="shrink-0 rounded-full px-3 py-0.5 text-[12px] font-black text-white"
              style={{ backgroundColor: '#3B82F6' }}
            >
              TURN
            </span>
          )}
        </div>

        {/* 보유금 행 */}
        <div className="flex items-center justify-between z-10">
          <span
            className="text-[13px] text-[#8B9AB0]"
            style={{ color: isBankrupt ? '#EF5350' : undefined }}
          >
            보유금
          </span>
          <span
            className="text-[20px] font-black text-[#1F2A44]"
            style={{ color: isBankrupt ? '#EF5350' : undefined }}
          >
            {isBankrupt ? '파산' : formatWon(money)}
          </span>
        </div>

        {/* 총자산 행 */}
        <div className="flex items-center justify-between z-10">
          <span
            className="flex items-center gap-1 text-[12px] text-[#B0BBC8]"
            style={{ color: isBankrupt ? '#EF5350' : undefined }}
          >
            <span>🏢</span>
            <span>총자산</span>
          </span>
          <span
            className="text-[13px] text-[#B0BBC8]"
            style={{ color: isBankrupt ? '#EF5350' : undefined }}
          >
            {isBankrupt ? '파산' : formatWon(totalAssets)}
          </span>
        </div>
      </div>
    </div>
  )
}

export default PlayerPanel
