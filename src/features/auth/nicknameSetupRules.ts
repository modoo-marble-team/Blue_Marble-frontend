import type { NicknameValidationResult } from './types'

export const NICKNAME_CHECK_DEBOUNCE_MS = 400
export const NICKNAME_LENGTH_ERROR_MESSAGE = '닉네임은 2~10자여야 합니다.'
export const NICKNAME_PATTERN_ERROR_MESSAGE =
  '한글/영문/숫자만 입력할 수 있습니다.'
export const NICKNAME_WHITESPACE_ERROR_MESSAGE = '공백은 사용할 수 없습니다.'

export type HelperTone = 'default' | 'danger' | 'success'

export interface NicknameHelperFeedback {
  message: string
  tone: HelperTone
}

interface CreateNicknameHelperFeedbackParams {
  submitMessage: string | null
  isNicknameFocused: boolean
  nickname: string
  nicknameValidation: NicknameValidationResult
  isCheckingNickname: boolean
  isNicknameAvailable: boolean | null
}

function createLengthFeedback(): NicknameHelperFeedback {
  return {
    message: `• ${NICKNAME_LENGTH_ERROR_MESSAGE}`,
    tone: 'default',
  }
}

function createPatternFeedback(): NicknameHelperFeedback {
  return {
    message: `• ${NICKNAME_PATTERN_ERROR_MESSAGE}`,
    tone: 'danger',
  }
}

function createWhitespaceFeedback(): NicknameHelperFeedback {
  return {
    message: `• ${NICKNAME_WHITESPACE_ERROR_MESSAGE}`,
    tone: 'danger',
  }
}

function createValidationFeedback(
  nicknameValidation: NicknameValidationResult
): NicknameHelperFeedback {
  if (
    !nicknameValidation.ok &&
    nicknameValidation.message === NICKNAME_WHITESPACE_ERROR_MESSAGE
  ) {
    return createWhitespaceFeedback()
  }

  if (
    !nicknameValidation.ok &&
    nicknameValidation.message === NICKNAME_PATTERN_ERROR_MESSAGE
  ) {
    return createPatternFeedback()
  }

  return createLengthFeedback()
}

export function createNicknameHelperFeedback({
  submitMessage,
  isNicknameFocused,
  nickname,
  nicknameValidation,
  isCheckingNickname,
  isNicknameAvailable,
}: CreateNicknameHelperFeedbackParams): NicknameHelperFeedback {
  if (submitMessage) {
    return {
      message: submitMessage,
      tone: 'danger',
    }
  }

  if (isNicknameFocused) {
    return createValidationFeedback(nicknameValidation)
  }

  if (nickname.length === 0) {
    return createLengthFeedback()
  }

  if (!nicknameValidation.ok) {
    return createValidationFeedback(nicknameValidation)
  }

  if (isCheckingNickname || isNicknameAvailable === null) {
    return {
      message: '• 닉네임 중복 확인 중...',
      tone: 'default',
    }
  }

  if (!isNicknameAvailable) {
    return {
      message: '• 이미 사용 중인 닉네임입니다.',
      tone: 'danger',
    }
  }

  return {
    message: '• 사용 가능한 닉네임입니다.',
    tone: 'success',
  }
}
