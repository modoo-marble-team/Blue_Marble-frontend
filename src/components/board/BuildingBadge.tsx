import React from 'react'
import { PLAYER_COLORS } from './board.constants'

interface BuildingBadgeProps {
  level: number
  ownerColor?: string
  isUrgent?: boolean
}

const RED_THEME = { folder: 'red-building-Icon', prefix: 'red' }
const BLUE_THEME = { folder: 'blue-building-Icon', prefix: 'blue' }
const GREEN_THEME = { folder: 'green-building-Icon', prefix: 'green' }
const YELLOW_THEME = { folder: 'yellow-building-Icon', prefix: 'yellow' }
const LAND_ICON_SRC = '/BuyModal-land.svg'

const COLOR_TO_THEME: Record<string, { folder: string; prefix: string }> = {
  '#EF5350': RED_THEME,
  '#EF4444': RED_THEME,
  '#FF0000': RED_THEME,
  RED: RED_THEME,
  '#42A5F5': BLUE_THEME,
  '#3B82F6': BLUE_THEME,
  '#0000FF': BLUE_THEME,
  BLUE: BLUE_THEME,
  '#66BB6A': GREEN_THEME,
  '#22C55E': GREEN_THEME,
  '#00FF00': GREEN_THEME,
  GREEN: GREEN_THEME,
  '#FFD15B': YELLOW_THEME,
  '#EAB308': YELLOW_THEME,
  '#FFFF00': YELLOW_THEME,
  YELLOW: YELLOW_THEME,
}

const BUILDING_SUFFIX: Partial<Record<number, string>> = {
  1: '-house.svg',
  2: '-second-house-upgrade.svg',
  3: '-third-house-upgrade.svg',
  4: '-hotel.svg',
  5: '-second-hotel-upgrade.svg',
  6: '-third-hotel-upgrade.svg',
  7: '-landmark.svg',
}

const BuildingBadge: React.FC<BuildingBadgeProps> = ({
  level,
  ownerColor,
  isUrgent = false,
}) => {
  if (level < 0 || level > 7) return null

  const rawPathColor = ownerColor || PLAYER_COLORS[0]
  const normalizedColor = rawPathColor.trim().toUpperCase()
  const theme = COLOR_TO_THEME[normalizedColor] ?? RED_THEME
  const suffix = BUILDING_SUFFIX[level]
  const src =
    level === 0
      ? LAND_ICON_SRC
      : suffix
        ? `/${theme.folder}/${theme.prefix}${suffix}`
        : null

  if (!src) return null

  return (
    <div
      style={{
        width: 24,
        height: 24,
        borderRadius: '50%',
        backgroundColor: 'rgba(255,255,255,0.92)',
        boxShadow: isUrgent
          ? '0 0 10px #EF5350, 0 1px 5px rgba(0,0,0,0.25)'
          : '0 1px 5px rgba(0,0,0,0.25)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        animation: isUrgent ? 'pulse-urgent 1s infinite' : 'none',
      }}
    >
      <style>
        {`
          @keyframes pulse-urgent {
            0% { transform: scale(1); }
            50% { transform: scale(1.1); }
            100% { transform: scale(1); }
          }
        `}
      </style>

      <img
        src={src}
        alt={`building-level-${level}`}
        style={{
          width: 16,
          height: 16,
          objectFit: 'contain',
          display: 'block',
        }}
        onError={(e) => {
          console.error('Failed to load building icon:', src)
          e.currentTarget.style.display = 'none'
          const fallback = e.currentTarget
            .nextElementSibling as HTMLElement | null
          if (fallback) fallback.style.display = 'flex'
        }}
      />
      <span
        style={{
          display: 'none',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 10,
          fontWeight: 700,
          color: ownerColor ?? '#2b7fff',
        }}
      >
        {level}
      </span>
    </div>
  )
}

export default BuildingBadge
