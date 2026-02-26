import React from 'react'
import '../../styles/board.css'

interface BuildingBadgeProps {
  level: number
}

// level → SVG 파일 경로 매핑
// 1=집1, 2=집2, 3=집3, 4=호텔, 5=랜드마크
const BUILDING_ICON: Record<number, string> = {
  1: '/BuildingIcon/house.svg',
  2: '/BuildingIcon/Second%20house%20upgrade.svg',
  3: '/BuildingIcon/Third%20house%20upgrade.svg',
  4: '/BuildingIcon/hotel.svg',
  5: '/BuildingIcon/landmark.svg',
}

const BuildingBadge: React.FC<BuildingBadgeProps> = ({ level }) => {
  if (!level || level < 1) return null

  const src = BUILDING_ICON[level]

  return (
    <div className={`building-badge building-badge--level-${level}`}>
      {src ? (
        <img
          src={src}
          alt={`building-level-${level}`}
          className="building-badge__icon"
          onError={(e) => {
            // SVG 로드 실패 시 숫자 폴백
            e.currentTarget.style.display = 'none'
            const fallback = e.currentTarget
              .nextElementSibling as HTMLElement | null
            if (fallback) fallback.style.display = 'flex'
          }}
        />
      ) : null}
      {/* 폴백: SVG 없을 때 숫자 */}
      <span className="building-badge__fallback" style={{ display: 'none' }}>
        {level}
      </span>
    </div>
  )
}

export default BuildingBadge
