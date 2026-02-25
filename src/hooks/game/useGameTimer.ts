import { useEffect, useState } from 'react'

interface UseGameTimerOptions {
  initialTime?: number
  resetTime?: number
}

export const useGameTimer = ({
  initialTime = 30,
  resetTime = 30,
}: UseGameTimerOptions = {}) => {
  const [timeLeft, setTimeLeft] = useState(initialTime)

  useEffect(() => {
    const timer = window.setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : resetTime))
    }, 1000)

    return () => window.clearInterval(timer)
  }, [resetTime])

  return [timeLeft, setTimeLeft] as const
}

