// 로그인 공급자 종류 정의
export type AuthProvider = 'kakao' | 'guest'
export type AuthContextRoomStatus = 'waiting' | 'playing'
export type AuthPresenceStatus = 'lobby' | 'in_room' | 'playing'
export type AuthResumeTarget = 'lobby' | 'room' | 'game'

// 클라이언트에서 유지하는 인증 세션 형태
export interface AuthSession {
  accessToken: string
  userId: string
  nickname: string
  profileImage: string | null
  isGuest: boolean
  needsNicknameSetup: boolean
  provider: AuthProvider
}

// 세션 복구 뒤 앱 재진입 분기에 사용하는 사용자 참가 컨텍스트
export interface AuthResumeContext {
  roomId: string | null
  roomTitle: string | null
  roomStatus: AuthContextRoomStatus | null
  gameId: string | null
  presenceStatus: AuthPresenceStatus
  resumeTarget: AuthResumeTarget
}

// 마이페이지 전적 집계 타입
export interface MyPageStats {
  total: number
  wins: number
  losses: number
}

// 마이페이지 프로필 응답 타입
export interface MyPageProfile {
  id: string
  nickname: string
  profileImage: string | null
  stats: MyPageStats
}

// 닉네임 형식 검증 결과 유니온
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

// 닉네임 설정 API 결과 유니온
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

// 닉네임 중복 확인 API 결과 유니온
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

// 마이페이지 프로필 조회 API 결과 유니온
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
