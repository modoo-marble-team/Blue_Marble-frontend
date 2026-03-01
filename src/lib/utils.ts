import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

// 조건부 className을 합치고 Tailwind 충돌 클래스를 정리
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
