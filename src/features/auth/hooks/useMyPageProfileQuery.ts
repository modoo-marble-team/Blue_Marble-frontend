import { useQuery } from '@tanstack/react-query'
import { mockGetMyPageProfile } from '../mockApi'
import type { AuthSession } from '../types'

const MY_PAGE_PROFILE_STALE_TIME_MS = 30_000

// 로그인 사용자의 마이페이지 프로필을 React Query로 조회
export function useMyPageProfileQuery(session: AuthSession | null) {
  return useQuery({
    queryKey: ['my-page', session?.userId],
    // 게스트/닉네임 미설정 상태에서는 조회를 비활성화
    enabled: Boolean(
      session && !session.isGuest && !session.needsNicknameSetup
    ),
    staleTime: MY_PAGE_PROFILE_STALE_TIME_MS,
    queryFn: async () => {
      // 세션이 없으면 조회를 실패로 처리
      if (!session) {
        throw new Error('로그인 세션이 없습니다.')
      }

      const result = await mockGetMyPageProfile(session)
      // API 실패 응답은 에러로 전환해 상위에서 처리
      if (!result.ok) {
        throw new Error(result.message)
      }

      return result.profile
    },
  })
}
