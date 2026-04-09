import { afterEach, describe, expect, it } from 'vitest'
import {
  clearMockGameResumeContext,
  readMockGameResumeContext,
  writeMockGameResumeContext,
} from './mockGameResumeStorage'

describe('mockGameResumeStorage', () => {
  afterEach(() => {
    window.localStorage.clear()
  })

  it('writes and reads a valid resume context', () => {
    writeMockGameResumeContext({
      gameId: 'game-1',
      roomId: 'room-1',
      updatedAt: 1_775_200_000_000,
    })

    expect(readMockGameResumeContext()).toEqual({
      gameId: 'game-1',
      roomId: 'room-1',
      updatedAt: 1_775_200_000_000,
    })
  })

  it('returns null when stored value is invalid', () => {
    window.localStorage.setItem('mock-game-resume-context-v1', '{"foo":1}')

    expect(readMockGameResumeContext()).toBeNull()
  })

  it('clears stored context', () => {
    writeMockGameResumeContext({
      gameId: 'game-2',
      roomId: 'room-2',
      updatedAt: 1_775_200_000_001,
    })

    clearMockGameResumeContext()

    expect(readMockGameResumeContext()).toBeNull()
  })
})
