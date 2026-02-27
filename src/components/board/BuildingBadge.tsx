import React from 'react'

interface BuildingBadgeProps {
  level: number
  ownerColor?: string
}

// 플레이어 색상 → 폴더명 + 파일 prefix 매핑
const COLOR_TO_THEME: Record<string, { folder: string; prefix: string }> = {
  '#EF5350': { folder: 'redbuildingIcon', prefix: 'red' },
  '#42A5F5': { folder: 'bluebuildingIcon', prefix: 'blue' },
  '#66BB6A': { folder: 'greenbuildingIcon', prefix: 'green' },
  '#FFD15B': { folder: 'yellowbuildingIcon', prefix: 'yellow' },
}

const BUILDING_SUFFIX: Record<number, string> = {
  1: 'house.svg',
  2: 'second house upgrade.svg',
  3: 'third house upgrade.svg',
  4: 'hotel.svg',
  5: 'landmark.svg',
}

const BuildingBadge: React.FC<BuildingBadgeProps> = ({ level, ownerColor }) => {
  if (!level || level < 1) return null

  const theme = COLOR_TO_THEME[ownerColor ?? ''] ?? {
    folder: 'redbuildingIcon',
    prefix: 'red',
  }
  const src = `/${theme.folder}/${theme.prefix}${BUILDING_SUFFIX[level]}`

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
          color: '#2b7fff',
        }}
      >
        {level}
      </span>
    </div>
  )
}

export default BuildingBadge
