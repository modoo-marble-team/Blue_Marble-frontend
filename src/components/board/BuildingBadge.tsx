import React from 'react'

interface BuildingBadgeProps {
  level: number
}

const BUILDING_ICON: Record<number, string> = {
  1: '/BuildingIcon/house.svg',
  2: '/BuildingIcon/Second house upgrade.svg',
  3: '/BuildingIcon/Third house upgrade.svg',
  4: '/BuildingIcon/hotel.svg',
  5: '/BuildingIcon/landmark.svg',
}

const BuildingBadge: React.FC<BuildingBadgeProps> = ({ level }) => {
  if (!level || level < 1) return null

  const src = BUILDING_ICON[level]

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
