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

  const eok = Math.floor(value / 100000000)
  const man = Math.floor((value % 100000000) / 10000)

  let result = ''
  if (eok > 0) result += `${eok}\uC5B5`

  if (man > 0) {
    if (result.length > 0) result += ' '
    result += `${man}\uB9CC`
  }

  return result || '0'
}
