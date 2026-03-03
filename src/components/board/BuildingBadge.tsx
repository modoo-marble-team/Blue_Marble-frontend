import React from 'react'

interface BuildingBadgeProps {
  level: number
  ownerColor?: string
}

const RED_THEME = { folder: 'redbuildingIcon', prefix: 'red' }
const BLUE_THEME = { folder: 'bluebuildingIcon', prefix: 'blue' }
const GREEN_THEME = { folder: 'greenbuildingIcon', prefix: 'green' }
const YELLOW_THEME = { folder: 'yellowbuildingIcon', prefix: 'yellow' }

const COLOR_TO_THEME: Record<string, { folder: string; prefix: string }> = {
  '#EF5350': RED_THEME,
  '#EF4444': RED_THEME,
  '#42A5F5': BLUE_THEME,
  '#3B82F6': BLUE_THEME,
  '#66BB6A': GREEN_THEME,
  '#22C55E': GREEN_THEME,
  '#FFD15B': YELLOW_THEME,
  '#EAB308': YELLOW_THEME,
}

const BUILDING_SUFFIX: Record<number, string> = {
  1: 'house.svg',
  2: 'second%20house%20upgrade.svg',
  3: 'third%20house%20upgrade.svg',
  4: 'hotel.svg',
  5: 'landmark.svg',
}

const BuildingBadge: React.FC<BuildingBadgeProps> = ({ level, ownerColor }) => {
  if (!level || level < 1 || level > 5) return null

  const normalizedColor = ownerColor?.trim().toUpperCase() ?? ''
  const theme = COLOR_TO_THEME[normalizedColor] ?? RED_THEME
  const suffix = BUILDING_SUFFIX[level]

  if (!suffix) return null

  const src = `/${theme.folder}/${theme.prefix}${suffix}`

  return (
    <div
      style={{
        width: 24,
        height: 24,
        borderRadius: '50%',
        backgroundColor: 'rgba(255,255,255,0.92)',
        boxShadow: '0 1px 5px rgba(0,0,0,0.25)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
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
