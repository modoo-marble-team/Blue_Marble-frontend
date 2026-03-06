import type { AuthSession } from '../types'
import { MOCK_AUTH_DELAY_MS } from './constants'
import { createMockUuid, delay } from './helpers'
import {
  addTakenNickname,
  ensureTakenNicknamesSeeded,
  getOrCreateMockKakaoUser,
} from './storage'

// UUID 앞 4자리를 붙여 Guest_XXXX 닉네임 생성
function createGuestNickname() {
  const uuid = createMockUuid().replace(/-/g, '')
  return `Guest_${uuid.slice(0, 4)}`
}

// 카카오 mock 사용자 상태를 기준으로 세션 발급
export async function mockKakaoLogin() {
  await delay(MOCK_AUTH_DELAY_MS)
  ensureTakenNicknamesSeeded()

  const kakaoUser = getOrCreateMockKakaoUser()
  const existingNickname =
    typeof kakaoUser.nickname === 'string' ? kakaoUser.nickname : ''
  const hasNickname = existingNickname.length > 0

  if (hasNickname) {
    addTakenNickname(existingNickname)
  }

  const session: AuthSession = {
    accessToken: `mock-kakao-token-${kakaoUser.id}`,
    userId: kakaoUser.id,
    nickname: existingNickname,
    profileImage: kakaoUser.profileImage,
    isGuest: false,
    needsNicknameSetup: !hasNickname,
    provider: 'kakao',
  }

  return session
}

// 게스트 닉네임 생성 후 세션 발급
export async function mockGuestLogin() {
  await delay(MOCK_AUTH_DELAY_MS)
  ensureTakenNicknamesSeeded()

  const userId = createMockUuid()
  const nickname = createGuestNickname()
  addTakenNickname(nickname)

  const session: AuthSession = {
    accessToken: `mock-guest-token-${userId}`,
    userId,
    nickname,
    profileImage: null,
    isGuest: true,
    needsNicknameSetup: false,
    provider: 'guest',
  }

  return session
}
