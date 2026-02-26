import { useQuery } from '@tanstack/react-query'
import { mockGetMyPageProfile } from '../mockApi'
import type { AuthSession } from '../types'

const MY_PAGE_PROFILE_STALE_TIME_MS = 30_000

export function useMyPageProfileQuery(session: AuthSession | null) {
  return useQuery({
    queryKey: ['my-page', session?.userId],
    enabled: Boolean(
      session && !session.isGuest && !session.needsNicknameSetup
    ),
    staleTime: MY_PAGE_PROFILE_STALE_TIME_MS,
    queryFn: async () => {
      if (!session) {
        throw new Error('로그인 세션이 없습니다.')
      }

      const result = await mockGetMyPageProfile(session)
      if (!result.ok) {
        throw new Error(result.message)
      }

      return result.profile
    },
  })
}
