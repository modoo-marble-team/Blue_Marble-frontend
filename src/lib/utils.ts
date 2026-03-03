import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

// 조건부 className을 합치고 Tailwind 충돌 클래스를 정리
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// 숫자를 한국 원화 표기법으로 변환합니다.
// 예: 100000000 -> "1억", 150000000 -> "1억5000만", 105000000 -> "1억500만"
export function formatWon(value: number): string {
  if (!value) return '0'
  const eok = Math.floor(value / 100000000)
  const man = Math.floor((value % 100000000) / 10000)

  let result = ''
  if (eok > 0) result += `${eok}억`

  if (man > 0) {
    if (result.length > 0) result += ' '

    let manStr = ''
    const cheon = Math.floor(man / 1000)
    const baek = Math.floor((man % 1000) / 100)
    const sip = Math.floor((man % 100) / 10)
    const il = man % 10

    if (cheon > 0) manStr += `${cheon}천`
    if (baek > 0) manStr += `${baek}백`
    if (sip > 0) manStr += `${sip}십`
    if (il > 0) manStr += `${il}`

    if (eok > 0 && il === 0) {
      result += `${manStr}`
    } else {
      result += `${manStr}만`
    }
  }

  return result || '0'
}
