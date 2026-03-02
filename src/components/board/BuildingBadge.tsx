import React from 'react'

interface BuildingBadgeProps {
  level: number
  ownerColor?: string
}

const COLOR_TO_THEME: Record<string, { folder: string; prefix: string }> = {
  '#EF5350': { folder: 'redbuildingIcon', prefix: 'red' },
  '#42A5F5': { folder: 'bluebuildingIcon', prefix: 'blue' },
  '#66BB6A': { folder: 'greenbuildingIcon', prefix: 'green' },
  '#FFD15B': { folder: 'yellowbuildingIcon', prefix: 'yellow' },
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
  const theme = COLOR_TO_THEME[normalizedColor] ?? {
    folder: 'redbuildingIcon',
    prefix: 'red',
  }
  const suffix = BUILDING_SUFFIX[level]
  if (!suffix) return null

  const src = `/${theme.folder}/${theme.prefix}${suffix}`

  console.log('ownerColor:', ownerColor, '→ theme:', theme.prefix)

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
          console.error('❌ 이미지 로드 실패:', src)
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
