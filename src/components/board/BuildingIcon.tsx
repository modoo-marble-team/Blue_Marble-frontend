import React from 'react'
import { BuildingLevel } from './board.constants'

// SVG 파일은 public 폴더에 위치
interface BuildingIconProps {
  level: BuildingLevel
  ownerColor: string
}

const BUILDING_SVG: Record<number, string> = {
  1: '/BuildingIcon/house.svg',
  2: '/BuildingIcon/Second%20house%20upgrade.svg',
  3: '/BuildingIcon/Third%20house%20upgrade.svg',
  4: '/BuildingIcon/hotel.svg',
  5: '/BuildingIcon/landmark.svg',
}

const BuildingIcon: React.FC<BuildingIconProps> = ({ level, ownerColor }) => {
  if (level === 0) return null

  const src = BUILDING_SVG[level]

  return (
    <div
      style={{
        width: 28,
        height: 28,
        borderRadius: '50%',
        backgroundColor: '#E0E9F6',
        border: `2px solid ${ownerColor}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        overflow: 'hidden',
      }}
    >
      <img
        src={src}
        alt={`building-level-${level}`}
        style={{ width: 18, height: 18, objectFit: 'contain' }}
      />
    </div>
  )
}

export default BuildingIcon
