import type { NicknameValidationResult } from './types'

export const NICKNAME_PATTERN = /^[A-Za-z0-9가-힣]{2,10}$/
export const NICKNAME_WHITESPACE_ERROR_MESSAGE = '공백은 사용할 수 없습니다.'
export const NICKNAME_LENGTH_ERROR_MESSAGE = '닉네임은 2~10자여야 합니다.'
export const NICKNAME_PATTERN_ERROR_MESSAGE =
  '한글/영문/숫자만 입력할 수 있습니다.'

// trim/공백/길이/문자셋 순서로 닉네임 형식을 검증
export function validateNickname(nickname: string): NicknameValidationResult {
  const normalizedNickname = nickname.trim()

  if (nickname !== normalizedNickname || /\s/.test(nickname)) {
    return {
      ok: false,
      normalizedNickname,
      message: NICKNAME_WHITESPACE_ERROR_MESSAGE,
    }
  }

  if (normalizedNickname.length < 2 || normalizedNickname.length > 10) {
    return {
      ok: false,
      normalizedNickname,
      message: NICKNAME_LENGTH_ERROR_MESSAGE,
    }
  }

  if (!NICKNAME_PATTERN.test(normalizedNickname)) {
    return {
      ok: false,
      normalizedNickname,
      message: NICKNAME_PATTERN_ERROR_MESSAGE,
    }
  }

  return {
    ok: true,
    normalizedNickname,
  }
}
