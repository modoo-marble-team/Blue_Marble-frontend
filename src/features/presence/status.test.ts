import { describe, expect, it } from 'vitest'
import { isDirectMessageAllowed } from './status'

describe('isDirectMessageAllowed', () => {
  it('로비 상태는 DM 허용', () => {
    expect(isDirectMessageAllowed('lobby')).toBe(true)
  })

  it('대기방 상태는 DM 허용', () => {
    expect(isDirectMessageAllowed('in_room')).toBe(true)
  })

  it('게임중 상태는 DM 차단', () => {
    expect(isDirectMessageAllowed('playing')).toBe(false)
  })
})
