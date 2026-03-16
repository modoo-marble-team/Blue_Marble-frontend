import { describe, expect, it } from 'vitest'
import { createNicknameHelperFeedback } from './nicknameSetupRules'

describe('createNicknameHelperFeedback', () => {
  it('형식 검증을 통과하면 디바운스 구간에도 즉시 중복 확인 상태를 보여준다', () => {
    const helperFeedback = createNicknameHelperFeedback({
      submitMessage: null,
      isNicknameFocused: true,
      nickname: '마블왕자',
      nicknameValidation: {
        ok: true,
        normalizedNickname: '마블왕자',
      },
      isCheckingNickname: false,
      isNicknameAvailable: null,
      isAvailabilityCheckSupported: true,
      showValidationMessage: false,
    })

    expect(helperFeedback).toEqual({
      message: '• 닉네임 중복 확인 중...',
      tone: 'default',
    })
  })

  it('형식 오류 상태에서는 디바운스 동안 기본 길이 안내를 유지한다', () => {
    const helperFeedback = createNicknameHelperFeedback({
      submitMessage: null,
      isNicknameFocused: true,
      nickname: 'a',
      nicknameValidation: {
        ok: false,
        normalizedNickname: 'a',
        message: '닉네임은 2~10자여야 합니다.',
      },
      isCheckingNickname: false,
      isNicknameAvailable: null,
      isAvailabilityCheckSupported: true,
      showValidationMessage: false,
    })

    expect(helperFeedback).toEqual({
      message: '• 닉네임은 2~10자여야 합니다.',
      tone: 'default',
    })
  })
})
