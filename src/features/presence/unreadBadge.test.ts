import { describe, expect, it } from 'vitest'
import { formatUnreadBadgeCount } from './unreadBadge'

describe('formatUnreadBadgeCount', () => {
  it('0 이하는 0으로 반환한다', () => {
    expect(formatUnreadBadgeCount(0)).toBe('0')
    expect(formatUnreadBadgeCount(-3)).toBe('0')
  })

  it('1~99 범위는 숫자 문자열 그대로 반환한다', () => {
    expect(formatUnreadBadgeCount(1)).toBe('1')
    expect(formatUnreadBadgeCount(57)).toBe('57')
    expect(formatUnreadBadgeCount(99)).toBe('99')
  })

  it('100 이상은 99+로 압축 표기한다', () => {
    expect(formatUnreadBadgeCount(100)).toBe('99+')
    expect(formatUnreadBadgeCount(999)).toBe('99+')
  })
})
