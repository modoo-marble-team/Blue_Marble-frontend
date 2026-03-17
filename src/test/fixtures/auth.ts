import type { AuthSession } from '../../features/auth/session/types'

// 인증 세션 fixture 생성
export function createAuthSessionFixture(
  overrides: Partial<AuthSession> = {}
): AuthSession {
  return {
    accessToken: 'test-access-token',
    userId: 'user-1',
    nickname: '테스터',
    profileImage: null,
    isGuest: false,
    needsNicknameSetup: false,
    provider: 'kakao',
    ...overrides,
  }
}
