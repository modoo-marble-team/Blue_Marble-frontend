import type {
  AuthSession,
  NicknameAvailabilityResult,
  NicknameSetResult,
} from '../session/types'
import { MOCK_AUTH_DELAY_MS, MOCK_NICKNAME_CHECK_DELAY_MS } from './constants'
import { delay } from './helpers'
import {
  addTakenNickname,
  ensureTakenNicknamesSeeded,
  isTakenNickname,
  persistMockKakaoNickname,
} from './storage'
import { validateNickname } from '../nickname/validation'

interface MockSetNicknameParams {
  session: AuthSession
  nickname: string
}

// 형식 검증 통과 시 중복 검사까지 수행
export async function mockCheckNicknameAvailability(
  nickname: string
): Promise<NicknameAvailabilityResult> {
  if (MOCK_NICKNAME_CHECK_DELAY_MS > 0) {
    await delay(MOCK_NICKNAME_CHECK_DELAY_MS)
  }

  ensureTakenNicknamesSeeded()

  const validationResult = validateNickname(nickname)
  if (!validationResult.ok) {
    return validationResult
  }

  return {
    ok: true,
    normalizedNickname: validationResult.normalizedNickname,
    isAvailable: !isTakenNickname(validationResult.normalizedNickname),
  }
}

// 게스트 차단 + 형식/중복 검증 후 닉네임 저장
export async function mockSetNickname({
  session,
  nickname,
}: MockSetNicknameParams): Promise<NicknameSetResult> {
  await delay(MOCK_AUTH_DELAY_MS)
  ensureTakenNicknamesSeeded()

  if (session.isGuest) {
    return {
      ok: false,
      code: 'FORBIDDEN',
      message: '게스트는 닉네임 설정을 사용할 수 없습니다.',
    }
  }

  const validationResult = validateNickname(nickname)
  if (!validationResult.ok) {
    return {
      ok: false,
      code: 'INVALID_FORMAT',
      message: validationResult.message,
    }
  }

  if (isTakenNickname(validationResult.normalizedNickname)) {
    return {
      ok: false,
      code: 'DUPLICATE',
      message: '이미 사용 중인 닉네임입니다.',
    }
  }

  addTakenNickname(validationResult.normalizedNickname)

  if (session.provider === 'kakao') {
    persistMockKakaoNickname(validationResult.normalizedNickname)
  }

  return {
    ok: true,
    nickname: validationResult.normalizedNickname,
  }
}
