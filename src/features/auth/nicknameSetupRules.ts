import type { NicknameValidationResult } from './types'

export const NICKNAME_CHECK_DEBOUNCE_MS = 0
export const VALIDATION_MESSAGE_DEBOUNCE_MS = 500
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
  isAvailabilityCheckSupported: boolean
  showValidationMessage: boolean
}

// 길이 규칙 안내 메시지를 기본 톤으로 생성
function createLengthFeedback(): NicknameHelperFeedback {
  return {
    message: `• ${NICKNAME_LENGTH_ERROR_MESSAGE}`,
    tone: 'default',
  }
}

// 문자셋 규칙 안내 메시지를 경고 톤으로 생성
function createPatternFeedback(): NicknameHelperFeedback {
  return {
    message: `• ${NICKNAME_PATTERN_ERROR_MESSAGE}`,
    tone: 'danger',
  }
}

// 공백 금지 안내 메시지를 경고 톤으로 생성
function createWhitespaceFeedback(): NicknameHelperFeedback {
  return {
    message: `• ${NICKNAME_WHITESPACE_ERROR_MESSAGE}`,
    tone: 'danger',
  }
}

// 검증 결과 메시지 키를 비교해 피드백 종류를 분기
function createValidationFeedback(
  nicknameValidation: NicknameValidationResult
): NicknameHelperFeedback {
  // 공백 오류는 전용 메시지로 우선 처리
  if (
    !nicknameValidation.ok &&
    nicknameValidation.message === NICKNAME_WHITESPACE_ERROR_MESSAGE
  ) {
    return createWhitespaceFeedback()
  }

  // 문자셋 오류는 패턴 메시지로 처리
  if (
    !nicknameValidation.ok &&
    nicknameValidation.message === NICKNAME_PATTERN_ERROR_MESSAGE
  ) {
    return createPatternFeedback()
  }

  // 나머지 케이스는 길이 메시지로 수렴
  return createLengthFeedback()
}

// 제출 오류/포커스/검증 상태를 우선순위로 평가해 최종 피드백 반환
export function createNicknameHelperFeedback({
  submitMessage,
  isNicknameFocused,
  nickname,
  nicknameValidation,
  isCheckingNickname,
  isNicknameAvailable,
  isAvailabilityCheckSupported,
  showValidationMessage,
}: CreateNicknameHelperFeedbackParams): NicknameHelperFeedback {
  // 제출 단계 에러가 있으면 최우선 노출
  if (submitMessage) {
    return {
      message: submitMessage,
      tone: 'danger',
    }
  }

  // 형식 검증 통과 후에는 중복 검사 상태/결과를 노출
  if (nicknameValidation.ok) {
    if (!isAvailabilityCheckSupported) {
      return {
        message:
          '• 형식이 올바른 닉네임입니다. 중복 여부는 제출 시 확인됩니다.',
        tone: 'default',
      }
    }

    // 중복 확인 중이면 로딩 메시지 표시
    if (isCheckingNickname || isNicknameAvailable === null) {
      return {
        message: '• 닉네임 중복 확인 중...',
        tone: 'default',
      }
    }

    // 중복이면 사용 불가 메시지 표시
    if (!isNicknameAvailable) {
      return {
        message: '• 이미 사용 중인 닉네임입니다.',
        tone: 'danger',
      }
    }

    // 형식/중복 모두 통과하면 성공 메시지 표시
    return {
      message: '• 사용 가능한 닉네임입니다.',
      tone: 'success',
    }
  }

  // 형식 오류 안내만 디바운스로 지연해 깜빡임을 줄임
  if (!showValidationMessage) {
    return createLengthFeedback()
  }

  // 입력 중에는 현재 검증 오류를 즉시 노출
  if (isNicknameFocused) {
    return createValidationFeedback(nicknameValidation)
  }

  // 블러 상태에서 값이 비어 있으면 길이 안내로 복귀
  if (nickname.length === 0) {
    return createLengthFeedback()
  }

  // 블러 상태에서 값이 남아 있으면 마지막 검증 오류 유지
  return createValidationFeedback(nicknameValidation)
}
