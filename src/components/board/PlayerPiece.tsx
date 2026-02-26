import React from 'react'
import '../../styles/board.css'

interface PlayerPieceProps {
  color: string
  label: string
}

const PlayerPiece: React.FC<PlayerPieceProps> = ({ color, label }) => {
  return (
    <div
      className="player-token"
      style={{ backgroundColor: color }}
      aria-label={label}
    />
  )
}

export default PlayerPiece
