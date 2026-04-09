import React, { useEffect, useRef, useState } from 'react'
import { useGameStore } from '../../../stores/game.store'
import { useGameTimer } from '../../../hooks/game/useGameTimer'

interface RollControlProps {
  isMyTurn: boolean
  onRoll: () => void
  mode?: 'roll' | 'end_turn'
  onEndTurn?: () => void
}

const RollControl: React.FC<RollControlProps> = ({
  isMyTurn,
  onRoll,
  mode = 'roll',
  onEndTurn,
}) => {
  const turnTimeoutSec = useGameStore((s) => s.turnTimeoutSec)
  const turnTimerKey = useGameStore((s) => s.turnTimerKey)
  const [timeLeft] = useGameTimer({
    initialTime: turnTimeoutSec,
    resetSignal: turnTimerKey,
  })
  const isEndTurnMode = mode === 'end_turn'
  const canClick =
    isMyTurn && (!isEndTurnMode || typeof onEndTurn === 'function')
  const handleClick = isEndTurnMode ? (onEndTurn ?? onRoll) : onRoll

  const dashArray = 251 // Approx circumference for r=40
  const dashOffset = dashArray * (1 - timeLeft / (turnTimeoutSec || 30))
  const previousTimeLeftRef = useRef<number | null>(null)
  const lastAutoActionKeyRef = useRef<string | null>(null)
  const [shouldAnimate, setShouldAnimate] = useState(false)

  useEffect(() => {
    const previous = previousTimeLeftRef.current
    if (previous === null) {
      setShouldAnimate(false)
    } else {
      setShouldAnimate(timeLeft < previous)
    }

    previousTimeLeftRef.current = timeLeft
  }, [timeLeft])

  useEffect(() => {
    if (timeLeft !== 0 || !canClick) {
      return
    }

    const autoActionKey = `${turnTimerKey}:${mode}`
    if (lastAutoActionKeyRef.current === autoActionKey) {
      return
    }

    lastAutoActionKeyRef.current = autoActionKey

    if (isEndTurnMode) {
      onEndTurn?.()
      return
    }

    onRoll()
  }, [canClick, isEndTurnMode, mode, onEndTurn, onRoll, timeLeft, turnTimerKey])

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
              className={
                shouldAnimate ? 'transition-all duration-1000 linear' : ''
              }
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
        onClick={handleClick}
        disabled={!canClick}
        className={`group relative flex h-24 w-24 flex-col items-center justify-center gap-0.5 rounded-3xl border-4 text-white shadow-[0_0_0_4px_rgba(255,255,255,0.5),0_20px_25px_-5px_rgba(142,197,255,0.5)] transition-all hover:-translate-y-0.5 hover:shadow-2xl active:translate-y-0.5 active:scale-95 disabled:grayscale disabled:opacity-50 ${
          isEndTurnMode
            ? 'border-[#FCD34D] bg-linear-to-br from-[#F59E0B] to-[#F97316]'
            : 'border-[#BEDBFF] bg-linear-to-br from-[#2B7FFF] to-[#4F39F6]'
        }`}
      >
        <span className="text-3xl leading-none drop-shadow-md">
          {isEndTurnMode ? '⏭' : '🎲'}
        </span>
        <span className="text-[10px] font-black tracking-widest opacity-90 uppercase">
          {isEndTurnMode ? 'END' : 'ROLL'}
        </span>
      </button>
    </div>
  )
}

export default RollControl
