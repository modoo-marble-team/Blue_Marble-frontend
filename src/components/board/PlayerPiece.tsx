import React from 'react'

interface PlayerPieceProps {
  color: string
  label: string
}

const PlayerPiece: React.FC<PlayerPieceProps> = ({ color, label }) => {
  return (
    <div
      className="h-4 w-4 rounded-full border-2 border-white shadow"
      style={{ backgroundColor: color }}
      aria-label={label}
    />
  )
}

export default PlayerPiece

