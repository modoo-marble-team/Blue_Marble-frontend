import { useEffect, useState } from 'react'

interface UseGameTimerOptions {
  initialTime?: number
  resetSignal?: number
}

export const useGameTimer = ({
  initialTime = 30,
  resetSignal = 0,
}: UseGameTimerOptions = {}) => {
  const [timeLeft, setTimeLeft] = useState(initialTime)

  useEffect(() => {
    setTimeLeft(initialTime)
  }, [initialTime, resetSignal])

  useEffect(() => {
    const timer = window.setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)

    return () => window.clearInterval(timer)
  }, [])

  return [timeLeft, setTimeLeft] as const
}

