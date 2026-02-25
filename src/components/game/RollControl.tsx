import React from 'react'
import { Dices } from 'lucide-react'

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
  return (
    <div className="flex items-center gap-6">
      {/* Timer Circle */}
      <div className="relative flex h-16 w-16 items-center justify-center">
        <svg className="h-full w-full rotate-[-90deg]">
          <circle
            cx="32"
            cy="32"
            r="28"
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="4"
          />
          <circle
            cx="32"
            cy="32"
            r="28"
            fill="none"
            stroke="#3b82f6"
            strokeWidth="4"
            strokeDasharray={176}
            strokeDashoffset={176 * (1 - timeLeft / 30)}
            strokeLinecap="round"
            className="transition-all duration-1000 linear"
          />
        </svg>
        <span className="absolute text-xl font-black text-[#191919]">
          {timeLeft}
        </span>
      </div>

      {/* Roll Button */}
      <button
        onClick={onRoll}
        disabled={!isMyTurn}
        className="group relative flex h-16 w-16 flex-col items-center justify-center rounded-2xl bg-gradient-to-b from-[#427cf1] to-[#2563eb] text-white shadow-[0_8px_0_#1d4ed8] transition-all hover:translate-y-[2px] hover:shadow-[0_6px_0_#1d4ed8] active:translate-y-[6px] active:shadow-none disabled:opacity-50 disabled:grayscale cursor-pointer"
      >
        <div className="absolute -top-1 left-1/2 -ml-1 h-1/2 w-[2px] bg-white/20 " />
        <Dices
          size={24}
          className="transition-transform group-hover:rotate-12"
        />
        <span className="text-[10px] font-black tracking-tighter">ROLL</span>
      </button>
    </div>
  )
}

export default RollControl
