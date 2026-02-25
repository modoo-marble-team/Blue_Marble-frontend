import React from 'react'

interface BuildingBadgeProps {
  level: number
}

const BuildingBadge: React.FC<BuildingBadgeProps> = ({ level }) => {
  return (
    <span className="inline-flex min-w-5 items-center justify-center rounded bg-[#2B7FFF] px-1 text-[10px] font-bold text-white">
      {level}
    </span>
  )
}

export default BuildingBadge

