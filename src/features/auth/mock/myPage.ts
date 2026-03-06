import type { AuthSession, MyPageProfileResult, MyPageStats } from '../types'
import { MOCK_AUTH_DELAY_MS } from './constants'
import { delay } from './helpers'
import { getOrCreateMockKakaoUser } from './storage'

// userId 해시 기반으로 전적을 안정적으로 생성
function createMockMyPageStats(userId: string): MyPageStats {
  let hash = 0
  for (let index = 0; index < userId.length; index += 1) {
    hash = (hash * 31 + userId.charCodeAt(index)) | 0
  }

  const normalizedHash = Math.abs(hash)
  const wins = 100 + (normalizedHash % 700)
  const losses = 100 + ((normalizedHash >> 4) % 700)

  return {
    total: wins + losses,
    wins,
    losses,
  }
}

// 카카오 사용자 기준 마이페이지 프로필을 생성
export async function mockGetMyPageProfile(
  session: AuthSession
): Promise<MyPageProfileResult> {
  await delay(MOCK_AUTH_DELAY_MS)

  if (session.isGuest) {
    return {
      ok: false,
      code: 'FORBIDDEN',
      message: '게스트는 마이페이지를 이용할 수 없습니다.',
    }
  }

  const kakaoUser = getOrCreateMockKakaoUser()
  const profileNickname =
    session.nickname.trim().length > 0
      ? session.nickname
      : (kakaoUser.nickname ?? '플레이어')

  return {
    ok: true,
    profile: {
      id: session.userId,
      nickname: profileNickname,
      profileImage: session.profileImage ?? kakaoUser.profileImage,
      stats: createMockMyPageStats(session.userId),
    },
  }
}
