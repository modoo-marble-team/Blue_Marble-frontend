import React from 'react'

interface RollControlProps {
  timeLeft: number
  isMyTurn: boolean
  onRoll: () => void
}

const RollControl: React.FC<RollControlProps> = ({
  timeLeft,
  isMyTurn,
  onRoll,
}) => {
  const dashArray = 251
  const dashOffset = dashArray * (1 - timeLeft / 30)

  return (
    <div className="flex items-center gap-6">
      <div className="relative h-24 w-24">
        <div className="absolute inset-1.5 rounded-full border-2 border-[#F1F5F9] bg-white shadow-md" />

        <div className="absolute inset-0 -rotate-90">
          <svg width="96" height="96" viewBox="0 0 96 96">
            <circle
              cx="48"
              cy="48"
              r="40"
              fill="none"
              stroke="#F1F5F9"
              strokeWidth="6"
            />
            <circle
              cx="48"
              cy="48"
              r="40"
              fill="none"
              stroke="#3B82F6"
              strokeWidth="6"
              strokeDasharray={`${dashArray}`}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
              className="transition-all duration-1000 linear"
            />
          </svg>
        </div>

        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xl font-black tracking-tighter text-[#45556C]">
            {timeLeft}
          </span>
        </div>
      </div>

      <button
        onClick={onRoll}
        disabled={!isMyTurn}
        className="group relative flex h-24 w-24 flex-col items-center justify-center gap-0.5 rounded-3xl border-4 border-[#BEDBFF] bg-linear-to-br from-[#2B7FFF] to-[#4F39F6] text-white shadow-[0_0_0_4px_rgba(255,255,255,0.5),0_20px_25px_-5px_rgba(142,197,255,0.5)] transition-all hover:translate-y-[-2px] hover:shadow-2xl active:translate-y-[2px] active:scale-95 disabled:grayscale disabled:opacity-50"
      >
        <span className="text-3xl leading-none drop-shadow-md">🎲</span>
        <span className="text-[10px] font-black tracking-widest opacity-90 uppercase">
          ROLL
        </span>
      </button>
    </div>
  )
}

export default RollControl
