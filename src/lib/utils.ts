import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

// Merge conditional class names and resolve Tailwind conflicts.
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Format a number using Korean won-style large units.
// Example: 100000000 -> "1억", 150000000 -> "1억 5000만"
export function formatWon(value: number): string {
  if (!value) return '0'

  const eokValue = value / 100000000
  const eok = Math.floor(eokValue)
  const manValue = (value % 100000000) / 10000
  const man = Math.floor(manValue)

  let result = ''
  if (eok > 0) {
    const decimal = Math.floor((eokValue - eok) * 10 + 1e-6)
    result += decimal > 0 ? `${eok}.${decimal}\uC5B5` : `${eok}\uC5B5`
  }

  if (man > 0 && eok === 0) {
    if (result.length > 0) result += ' '
    result += `${man}\uB9CC`
  }

  return result || '0'
}
