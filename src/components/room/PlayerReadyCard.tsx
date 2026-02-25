import React from 'react'

interface PlayerReadyCardProps {
  nickname: string
  ready: boolean
}

const PlayerReadyCard: React.FC<PlayerReadyCardProps> = ({ nickname, ready }) => {
  return (
    <article className="flex items-center justify-between rounded-xl border border-[#E2E8F0] bg-white px-3 py-2">
      <span className="text-sm font-semibold text-[#314158]">{nickname}</span>
      <span className="text-xs font-bold text-[#2B7FFF]">{ready ? 'READY' : 'WAIT'}</span>
    </article>
  )
}

export default PlayerReadyCard

