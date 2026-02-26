import React from 'react'
import '../../styles/board.css'

interface BuildingBadgeProps {
  level: number
}

const BuildingBadge: React.FC<BuildingBadgeProps> = ({ level }) => {
  return <span className="building-badge">{level}</span>
}

export default BuildingBadge
