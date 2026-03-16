import { describe, expect, it } from 'vitest'
import { createNicknameHelperFeedback } from './nicknameSetupRules'

describe('createNicknameHelperFeedback', () => {
  it('제출 에러가 있으면 다른 상태보다 우선 노출한다', () => {
    const helperFeedback = createNicknameHelperFeedback({
      submitMessage: '• 서버 오류',
      isNicknameFocused: true,
      nickname: '마블러',
      nicknameValidation: {
        ok: true,
        normalizedNickname: '마블러',
      },
      isCheckingNickname: false,
      isNicknameAvailable: true,
      isAvailabilityCheckSupported: true,
      showValidationMessage: true,
    })

    expect(helperFeedback).toEqual({
      message: '• 서버 오류',
      tone: 'danger',
    })
  })

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

  it('실서버 모드에서는 제출 시 중복 확인 안내를 노출한다', () => {
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
      isAvailabilityCheckSupported: false,
      showValidationMessage: true,
    })

    expect(helperFeedback).toEqual({
      message: '• 형식이 올바른 닉네임입니다. 중복 여부는 제출 시 확인됩니다.',
      tone: 'default',
    })
  })

  it('중복 닉네임은 danger 톤으로 안내한다', () => {
    const helperFeedback = createNicknameHelperFeedback({
      submitMessage: null,
      isNicknameFocused: true,
      nickname: '중복닉네임',
      nicknameValidation: {
        ok: true,
        normalizedNickname: '중복닉네임',
      },
      isCheckingNickname: false,
      isNicknameAvailable: false,
      isAvailabilityCheckSupported: true,
      showValidationMessage: true,
    })

    expect(helperFeedback).toEqual({
      message: '• 이미 사용 중인 닉네임입니다.',
      tone: 'danger',
    })
  })

  it('사용 가능한 닉네임은 success 톤으로 안내한다', () => {
    const helperFeedback = createNicknameHelperFeedback({
      submitMessage: null,
      isNicknameFocused: true,
      nickname: '가능닉네임',
      nicknameValidation: {
        ok: true,
        normalizedNickname: '가능닉네임',
      },
      isCheckingNickname: false,
      isNicknameAvailable: true,
      isAvailabilityCheckSupported: true,
      showValidationMessage: true,
    })

    expect(helperFeedback).toEqual({
      message: '• 사용 가능한 닉네임입니다.',
      tone: 'success',
    })
  })

  it('공백 오류는 전용 메시지를 유지한다', () => {
    const helperFeedback = createNicknameHelperFeedback({
      submitMessage: null,
      isNicknameFocused: true,
      nickname: '마블 왕자',
      nicknameValidation: {
        ok: false,
        normalizedNickname: '마블 왕자',
        message: '공백은 사용할 수 없습니다.',
      },
      isCheckingNickname: false,
      isNicknameAvailable: null,
      isAvailabilityCheckSupported: true,
      showValidationMessage: true,
    })

    expect(helperFeedback).toEqual({
      message: '• 공백은 사용할 수 없습니다.',
      tone: 'danger',
    })
  })

  it('특수문자 오류는 패턴 메시지로 변환한다', () => {
    const helperFeedback = createNicknameHelperFeedback({
      submitMessage: null,
      isNicknameFocused: true,
      nickname: '마블!',
      nicknameValidation: {
        ok: false,
        normalizedNickname: '마블!',
        message: '한글/영문/숫자만 입력할 수 있습니다.',
      },
      isCheckingNickname: false,
      isNicknameAvailable: null,
      isAvailabilityCheckSupported: true,
      showValidationMessage: true,
    })

    expect(helperFeedback).toEqual({
      message: '• 한글/영문/숫자만 입력할 수 있습니다.',
      tone: 'danger',
    })
  })

  it('blur 상태에서 값이 비어 있으면 기본 길이 안내로 돌아간다', () => {
    const helperFeedback = createNicknameHelperFeedback({
      submitMessage: null,
      isNicknameFocused: false,
      nickname: '',
      nicknameValidation: {
        ok: false,
        normalizedNickname: '',
        message: '닉네임은 2~10자여야 합니다.',
      },
      isCheckingNickname: false,
      isNicknameAvailable: null,
      isAvailabilityCheckSupported: true,
      showValidationMessage: true,
    })

    expect(helperFeedback).toEqual({
      message: '• 닉네임은 2~10자여야 합니다.',
      tone: 'default',
    })
  })
})
