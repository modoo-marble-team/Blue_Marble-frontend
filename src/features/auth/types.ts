export type AuthProvider = 'kakao' | 'guest'

export interface AuthSession {
  accessToken: string
  userId: string
  nickname: string
  profileImage: string | null
  isGuest: boolean
  needsNicknameSetup: boolean
  provider: AuthProvider
}

export interface MyPageStats {
  total: number
  wins: number
  losses: number
}

export interface MyPageProfile {
  id: string
  nickname: string
  profileImage: string | null
  stats: MyPageStats
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

export type MyPageProfileResult =
  | {
      ok: true
      profile: MyPageProfile
    }
  | {
      ok: false
      code: 'FORBIDDEN'
      message: string
    }
