export type AuthProvider = 'kakao' | 'guest'

export interface AuthSession {
  accessToken: string
  userId: string
  nickname: string
  isGuest: boolean
  needsNicknameSetup: boolean
  provider: AuthProvider
}

export type NicknameValidationResult =
  | {
      ok: true
      normalizedNickname: string
    }
  | {
      ok: false
      normalizedNickname: string
      message: string
    }

export type NicknameSetResult =
  | {
      ok: true
      nickname: string
    }
  | {
      ok: false
      code: 'INVALID_FORMAT' | 'DUPLICATE' | 'FORBIDDEN'
      message: string
    }

export type NicknameAvailabilityResult =
  | {
      ok: true
      normalizedNickname: string
      isAvailable: boolean
    }
  | {
      ok: false
      normalizedNickname: string
      message: string
    }
